import type {
  CartLineItem,
  CheckoutInput,
  CouponInput,
  CustomerNotification,
  CustomerPreferences,
  DineFlowStore,
  LoyaltyRewardInput,
  LoyaltySettings,
  MenuReviewInput,
  SavedAddress,
} from "@/lib/types";
import type { ActionResult } from "./actions";
import { createOrder, updateOrderStatus } from "./actions";
import { roundMoney } from "./calculations";
import {
  averageRating,
  calcCartTotals,
  cartSubtotal,
  defaultEngagement,
  defaultLoyaltySettings,
  deriveLoyaltyTier,
  emptyCart,
  lifetimeEarnedPoints,
  pointsForOrder,
  validateCoupon,
} from "./engagement";
import { createId, nowIso } from "./ids";

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function err<T = void>(errors: string[]): ActionResult<T> {
  return { ok: false, errors };
}

function ensureEngagement(store: DineFlowStore): DineFlowStore {
  if (store.engagement && store.cart) return store;
  return {
    ...store,
    engagement: store.engagement ?? defaultEngagement(),
    cart: store.cart ?? emptyCart(),
  };
}

export function setCartItems(
  store: DineFlowStore,
  items: CartLineItem[],
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  return ok({
    ...next,
    cart: { items, updatedAt: nowIso() },
  });
}

export function addToCart(
  store: DineFlowStore,
  menuItemId: string,
  quantity = 1,
  notes?: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  const menuItem = next.menuItems.find((item) => item.id === menuItemId);
  if (!menuItem) return err(["Menu item not found."]);
  if (!menuItem.available) {
    return err(["This item is currently unavailable."]);
  }
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const existing = next.cart.items.find(
    (item) =>
      item.menuItemId === menuItemId &&
      (item.notes ?? "") === (notes?.trim() ?? ""),
  );
  const items = existing
    ? next.cart.items.map((item) =>
        item === existing
          ? { ...item, quantity: item.quantity + qty }
          : item,
      )
    : [
        ...next.cart.items,
        {
          menuItemId: menuItem.id,
          name: menuItem.name,
          unitPrice: menuItem.price,
          quantity: qty,
          notes: notes?.trim() || undefined,
          image: menuItem.image,
        },
      ];
  return ok({ ...next, cart: { items, updatedAt: nowIso() } });
}

export function updateCartQuantity(
  store: DineFlowStore,
  menuItemId: string,
  quantity: number,
  notes?: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  const qty = Math.floor(Number(quantity) || 0);
  const items =
    qty <= 0
      ? next.cart.items.filter(
          (item) =>
            !(
              item.menuItemId === menuItemId &&
              (item.notes ?? "") === (notes ?? "")
            ),
        )
      : next.cart.items.map((item) =>
          item.menuItemId === menuItemId &&
          (item.notes ?? "") === (notes ?? "")
            ? { ...item, quantity: qty }
            : item,
        );
  return ok({ ...next, cart: { items, updatedAt: nowIso() } });
}

export function removeFromCart(
  store: DineFlowStore,
  menuItemId: string,
  notes?: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  return ok({
    ...next,
    cart: {
      items: next.cart.items.filter(
        (item) =>
          !(
            item.menuItemId === menuItemId &&
            (item.notes ?? "") === (notes ?? "")
          ),
      ),
      couponCode: next.cart.couponCode,
      updatedAt: nowIso(),
    },
  });
}

export function clearCart(store: DineFlowStore): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  return ok({ ...next, cart: emptyCart() });
}

export function applyCartCoupon(
  store: DineFlowStore,
  code: string,
  customerId?: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  const subtotal = cartSubtotal(next.cart.items);
  const lineItems = next.cart.items.map((item) => {
    const menu = next.menuItems.find((entry) => entry.id === item.menuItemId);
    return {
      menuItemId: item.menuItemId,
      lineTotal: roundMoney(item.unitPrice * item.quantity),
      categoryId: menu?.categoryId,
    };
  });
  const coupon = next.engagement.coupons.find(
    (entry) => entry.code.toUpperCase() === code.trim().toUpperCase(),
  );
  const result = validateCoupon({
    coupon,
    code,
    subtotal,
    today: "2026-11-22",
    customerId,
    usages: next.engagement.couponUsages,
    lineItems,
  });
  if (!result.ok) return err(result.errors);
  return ok({
    ...next,
    cart: {
      ...next.cart,
      couponCode: result.coupon.code,
      updatedAt: nowIso(),
    },
  });
}

export function removeCartCoupon(
  store: DineFlowStore,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  return ok({
    ...next,
    cart: { ...next.cart, couponCode: undefined, updatedAt: nowIso() },
  });
}

export function checkoutCart(
  store: DineFlowStore,
  input: CheckoutInput,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  if (!next.cart.items.length) return err(["Your cart is empty."]);
  if (input.submissionToken) {
    const duplicate = next.orders.some(
      (order) => order.submissionToken === input.submissionToken,
    );
    if (duplicate) {
      return err(["This order was already submitted. Check My Orders."]);
    }
  }
  if (!input.customerName?.trim()) return err(["Name is required."]);
  if (!input.customerPhone?.trim()) return err(["Phone is required."]);
  if (!input.customerEmail?.trim()) return err(["Email is required."]);
  if (input.type === "dine-in" && !input.tableId) {
    return err(["Select a table for dine-in orders."]);
  }
  if (input.type === "delivery" && !input.deliveryAddress?.trim()) {
    return err(["Delivery address is required."]);
  }

  for (const line of next.cart.items) {
    const menu = next.menuItems.find((item) => item.id === line.menuItemId);
    if (!menu?.available) {
      return err([`${line.name} is no longer available.`]);
    }
  }

  const subtotal = cartSubtotal(next.cart.items);
  const lineItems = next.cart.items.map((item) => {
    const menu = next.menuItems.find((entry) => entry.id === item.menuItemId);
    return {
      menuItemId: item.menuItemId,
      lineTotal: roundMoney(item.unitPrice * item.quantity),
      categoryId: menu?.categoryId,
    };
  });

  let discount = 0;
  let couponId: string | undefined;
  let couponCode: string | undefined;
  if (input.couponCode || next.cart.couponCode) {
    const code = (input.couponCode || next.cart.couponCode || "").trim();
    const coupon = next.engagement.coupons.find(
      (entry) => entry.code.toUpperCase() === code.toUpperCase(),
    );
    const validated = validateCoupon({
      coupon,
      code,
      subtotal,
      today: "2026-11-22",
      customerId: input.customerId ?? next.engagement.demoCustomerId,
      usages: next.engagement.couponUsages,
      lineItems,
    });
    if (!validated.ok) return err(validated.errors);
    discount = validated.discount;
    couponId = validated.coupon.id;
    couponCode = validated.coupon.code;
  }

  const taxRate = next.billingSettings?.taxRate ?? 0.08;
  const created = createOrder(next, {
    customerId: input.customerId ?? next.engagement.demoCustomerId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    tableId: input.tableId,
    type: input.type,
    items: next.cart.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      price: item.unitPrice,
      notes: item.notes,
    })),
    discount,
    taxRate,
    status: "pending",
    paymentStatus: "unpaid",
    deliveryAddress: input.deliveryAddress,
    orderNotes: input.orderNotes,
    couponCode,
    checkoutPaymentMethod: input.checkoutPaymentMethod,
    submissionToken: input.submissionToken,
  });
  if (!created.ok) return created;

  let working = created.data;
  const order = working.orders[0];
  if (!order) return err(["Failed to create order."]);

  // Enrich order with engagement fields createOrder may not set fully
  working = {
    ...working,
    orders: working.orders.map((entry) =>
      entry.id === order.id
        ? {
            ...entry,
            deliveryAddress: input.deliveryAddress?.trim(),
            orderNotes: input.orderNotes?.trim(),
            couponCode,
            couponId,
            checkoutPaymentMethod: input.checkoutPaymentMethod,
            submissionToken: input.submissionToken,
            statusHistory: [{ status: entry.status, at: entry.createdAt }],
          }
        : entry,
    ),
  };

  if (couponId && couponCode) {
    const usage = {
      id: createId("cpu"),
      couponId,
      couponCode,
      customerId: order.customerId,
      orderId: order.id,
      discountAmount: discount,
      createdAt: nowIso(),
    };
    working = {
      ...working,
      engagement: {
        ...working.engagement,
        coupons: working.engagement.coupons.map((coupon) =>
          coupon.id === couponId
            ? { ...coupon, usageCount: coupon.usageCount + 1 }
            : coupon,
        ),
        couponUsages: [usage, ...working.engagement.couponUsages],
        customerNotifications: [
          {
            id: createId("cn"),
            customerId: order.customerId,
            title: "Order placed",
            message: `Order ${order.orderNumber} was placed successfully.`,
            type: "order" as const,
            read: false,
            createdAt: nowIso(),
            href: `/customer/orders/${order.id}`,
          },
          ...working.engagement.customerNotifications,
        ],
      },
      cart: emptyCart(),
    };
  } else {
    working = {
      ...working,
      engagement: {
        ...working.engagement,
        customerNotifications: [
          {
            id: createId("cn"),
            customerId: order.customerId,
            title: "Order placed",
            message: `Order ${order.orderNumber} was placed successfully.`,
            type: "order" as const,
            read: false,
            createdAt: nowIso(),
            href: `/customer/orders/${order.id}`,
          },
          ...working.engagement.customerNotifications,
        ],
      },
      cart: emptyCart(),
    };
  }

  return ok(working);
}

export function toggleFavorite(
  store: DineFlowStore,
  customerId: string,
  menuItemId: string,
): ActionResult<DineFlowStore> {
  if (!store.customers.some((customer) => customer.id === customerId)) {
    return err(["Customer not found."]);
  }
  if (!store.menuItems.some((item) => item.id === menuItemId)) {
    return err(["Menu item not found."]);
  }
  return ok({
    ...store,
    customers: store.customers.map((customer) => {
      if (customer.id !== customerId) return customer;
      const has = customer.favoriteDishIds.includes(menuItemId);
      return {
        ...customer,
        favoriteDishIds: has
          ? customer.favoriteDishIds.filter((id) => id !== menuItemId)
          : [...customer.favoriteDishIds, menuItemId],
      };
    }),
  });
}

export function trackMenuView(
  store: DineFlowStore,
  menuItemId: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  if (!next.menuItems.some((item) => item.id === menuItemId)) {
    return err(["Menu item not found."]);
  }
  const recent = [
    menuItemId,
    ...next.engagement.recentlyViewedIds.filter((id) => id !== menuItemId),
  ].slice(0, 12);
  return ok({
    ...next,
    engagement: { ...next.engagement, recentlyViewedIds: recent },
  });
}

export function updateLoyaltySettings(
  store: DineFlowStore,
  settings: LoyaltySettings,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  if (settings.pointsPerCurrency < 0) {
    return err(["Points per currency cannot be negative."]);
  }
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      loyaltySettings: { ...defaultLoyaltySettings(), ...settings },
    },
  });
}

export function saveLoyaltyReward(
  store: DineFlowStore,
  input: LoyaltyRewardInput,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  if (!input.title?.trim()) return err(["Reward title is required."]);
  if (input.pointsCost <= 0) return err(["Points cost must be positive."]);
  const reward = {
    id: input.id ?? createId("rwd"),
    title: input.title.trim(),
    description: input.description?.trim() || "",
    pointsCost: Math.floor(input.pointsCost),
    active: input.active !== false,
    validUntil: input.validUntil,
  };
  const exists = next.engagement.loyaltyRewards.some(
    (entry) => entry.id === reward.id,
  );
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      loyaltyRewards: exists
        ? next.engagement.loyaltyRewards.map((entry) =>
            entry.id === reward.id ? reward : entry,
          )
        : [reward, ...next.engagement.loyaltyRewards],
    },
  });
}

export function deleteLoyaltyReward(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      loyaltyRewards: next.engagement.loyaltyRewards.filter(
        (reward) => reward.id !== id,
      ),
    },
  });
}

export function awardLoyaltyForCompletedOrder(
  store: DineFlowStore,
  orderId: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  const order = next.orders.find((entry) => entry.id === orderId);
  if (!order) return err(["Order not found."]);
  if (order.status !== "completed") {
    return err(["Points are only awarded for completed orders."]);
  }
  if (order.paymentStatus === "refunded") {
    return err(["Refunded orders do not earn points."]);
  }
  if (order.loyaltyPointsAwarded) {
    return err(["Points already awarded for this order."]);
  }
  const already = next.engagement.loyaltyTransactions.some(
    (txn) => txn.orderId === orderId && txn.type === "earn",
  );
  if (already) return err(["Points already awarded for this order."]);

  const points = pointsForOrder(order.total, next.engagement.loyaltySettings);
  if (points <= 0) {
    return ok({
      ...next,
      orders: next.orders.map((entry) =>
        entry.id === orderId
          ? { ...entry, loyaltyPointsAwarded: true }
          : entry,
      ),
    });
  }

  const customer = next.customers.find((entry) => entry.id === order.customerId);
  const balance = (customer?.loyaltyPoints ?? 0) + points;
  const lifetime = lifetimeEarnedPoints(
    next.engagement.loyaltyTransactions,
    order.customerId,
  ) + points;
  const tier = deriveLoyaltyTier(lifetime, next.engagement.loyaltySettings);
  const txn = {
    id: createId("lyt"),
    customerId: order.customerId,
    type: "earn" as const,
    points,
    balanceAfter: balance,
    orderId: order.id,
    note: `Earned from ${order.orderNumber}`,
    createdAt: nowIso(),
  };

  return ok({
    ...next,
    orders: next.orders.map((entry) =>
      entry.id === orderId ? { ...entry, loyaltyPointsAwarded: true } : entry,
    ),
    customers: next.customers.map((entry) =>
      entry.id === order.customerId
        ? { ...entry, loyaltyPoints: balance, loyaltyTier: tier }
        : entry,
    ),
    engagement: {
      ...next.engagement,
      loyaltyTransactions: [txn, ...next.engagement.loyaltyTransactions],
      customerNotifications: [
        {
          id: createId("cn"),
          customerId: order.customerId,
          title: "Loyalty points earned",
          message: `You earned ${points} points from order ${order.orderNumber}.`,
          type: "loyalty",
          read: false,
          createdAt: nowIso(),
          href: "/customer/loyalty",
        },
        ...next.engagement.customerNotifications,
      ],
    },
  });
}

export function reverseLoyaltyForOrder(
  store: DineFlowStore,
  orderId: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  const earn = next.engagement.loyaltyTransactions.find(
    (txn) => txn.orderId === orderId && txn.type === "earn",
  );
  if (!earn) return ok(next);
  const alreadyReversed = next.engagement.loyaltyTransactions.some(
    (txn) => txn.orderId === orderId && txn.type === "reverse",
  );
  if (alreadyReversed) return ok(next);

  const customer = next.customers.find(
    (entry) => entry.id === earn.customerId,
  );
  const balance = Math.max(0, (customer?.loyaltyPoints ?? 0) - earn.points);
  const txn = {
    id: createId("lyt"),
    customerId: earn.customerId,
    type: "reverse" as const,
    points: -earn.points,
    balanceAfter: balance,
    orderId,
    note: "Points reversed after cancel/refund",
    createdAt: nowIso(),
  };
  const lifetime = lifetimeEarnedPoints(
    [...next.engagement.loyaltyTransactions, txn],
    earn.customerId,
  );
  const tier = deriveLoyaltyTier(lifetime, next.engagement.loyaltySettings);

  return ok({
    ...next,
    customers: next.customers.map((entry) =>
      entry.id === earn.customerId
        ? { ...entry, loyaltyPoints: balance, loyaltyTier: tier }
        : entry,
    ),
    engagement: {
      ...next.engagement,
      loyaltyTransactions: [txn, ...next.engagement.loyaltyTransactions],
    },
  });
}

export function redeemLoyaltyReward(
  store: DineFlowStore,
  customerId: string,
  rewardId: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  const customer = next.customers.find((entry) => entry.id === customerId);
  if (!customer) return err(["Customer not found."]);
  const reward = next.engagement.loyaltyRewards.find(
    (entry) => entry.id === rewardId,
  );
  if (!reward || !reward.active) return err(["Reward not available."]);
  if (reward.validUntil && reward.validUntil < "2026-11-22") {
    return err(["This reward has expired."]);
  }
  const balance = customer.loyaltyPoints ?? 0;
  if (balance < next.engagement.loyaltySettings.minRedemptionPoints) {
    return err([
      `Minimum ${next.engagement.loyaltySettings.minRedemptionPoints} points required to redeem.`,
    ]);
  }
  if (balance < reward.pointsCost) {
    return err(["Not enough loyalty points."]);
  }
  const nextBalance = balance - reward.pointsCost;
  const txn = {
    id: createId("lyt"),
    customerId,
    type: "redeem" as const,
    points: -reward.pointsCost,
    balanceAfter: nextBalance,
    rewardId: reward.id,
    note: `Redeemed: ${reward.title}`,
    createdAt: nowIso(),
  };
  return ok({
    ...next,
    customers: next.customers.map((entry) =>
      entry.id === customerId
        ? { ...entry, loyaltyPoints: nextBalance }
        : entry,
    ),
    engagement: {
      ...next.engagement,
      loyaltyTransactions: [txn, ...next.engagement.loyaltyTransactions],
      customerNotifications: [
        {
          id: createId("cn"),
          customerId,
          title: "Reward redeemed",
          message: `You redeemed “${reward.title}” for ${reward.pointsCost} points.`,
          type: "loyalty",
          read: false,
          createdAt: nowIso(),
          href: "/customer/loyalty",
        },
        ...next.engagement.customerNotifications,
      ],
    },
  });
}

export function saveCoupon(
  store: DineFlowStore,
  input: CouponInput,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  if (!input.code?.trim()) return err(["Coupon code is required."]);
  const code = input.code.trim().toUpperCase();
  const duplicate = next.engagement.coupons.some(
    (coupon) =>
      coupon.code.toUpperCase() === code && coupon.id !== input.id,
  );
  if (duplicate) return err(["A coupon with this code already exists."]);
  if (input.discountValue < 0) return err(["Discount cannot be negative."]);
  if (input.minOrderAmount < 0) {
    return err(["Minimum order amount cannot be negative."]);
  }
  const coupon = {
    id: input.id ?? createId("cpn"),
    code,
    description: input.description?.trim() || "",
    discountType: input.discountType,
    discountValue: Number(input.discountValue) || 0,
    minOrderAmount: Number(input.minOrderAmount) || 0,
    maxDiscount: input.maxDiscount,
    startDate: input.startDate,
    expiryDate: input.expiryDate,
    usageLimit: input.usageLimit,
    perCustomerLimit: input.perCustomerLimit,
    usageCount: input.usageCount ?? 0,
    applicableCategoryIds: input.applicableCategoryIds ?? [],
    applicableMenuItemIds: input.applicableMenuItemIds ?? [],
    active: input.active !== false,
    createdAt: input.createdAt ?? nowIso(),
  };
  const exists = next.engagement.coupons.some((entry) => entry.id === coupon.id);
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      coupons: exists
        ? next.engagement.coupons.map((entry) =>
            entry.id === coupon.id ? { ...coupon, usageCount: entry.usageCount } : entry,
          )
        : [coupon, ...next.engagement.coupons],
    },
  });
}

export function deleteCoupon(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      coupons: next.engagement.coupons.filter((coupon) => coupon.id !== id),
    },
  });
}

export function setCouponActive(
  store: DineFlowStore,
  id: string,
  active: boolean,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      coupons: next.engagement.coupons.map((coupon) =>
        coupon.id === id ? { ...coupon, active } : coupon,
      ),
    },
  });
}

export function submitReview(
  store: DineFlowStore,
  input: MenuReviewInput,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  const order = next.orders.find((entry) => entry.id === input.orderId);
  if (!order) return err(["Order not found."]);
  if (order.customerId !== input.customerId) {
    return err(["You can only review your own orders."]);
  }
  if (order.status !== "completed") {
    return err(["Reviews are only allowed for completed orders."]);
  }
  if (!order.items.some((item) => item.menuItemId === input.menuItemId)) {
    return err(["This dish was not on the selected order."]);
  }
  if (input.rating < 1 || input.rating > 5) {
    return err(["Rating must be between 1 and 5."]);
  }
  const duplicate = next.engagement.reviews.some(
    (review) =>
      review.customerId === input.customerId &&
      review.menuItemId === input.menuItemId &&
      review.orderId === input.orderId,
  );
  if (duplicate) {
    return err(["You already reviewed this dish for this order."]);
  }
  const customer = next.customers.find((entry) => entry.id === input.customerId);
  const review = {
    id: createId("rev"),
    customerId: input.customerId,
    customerName: customer?.name ?? order.customerName,
    menuItemId: input.menuItemId,
    orderId: input.orderId,
    rating: Math.round(input.rating),
    comment: input.comment.trim(),
    status: "visible" as const,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      reviews: [review, ...next.engagement.reviews],
    },
  });
}

export function updateReview(
  store: DineFlowStore,
  id: string,
  input: { rating: number; comment: string; customerId: string },
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  const existing = next.engagement.reviews.find((review) => review.id === id);
  if (!existing) return err(["Review not found."]);
  if (existing.customerId !== input.customerId) {
    return err(["You can only edit your own reviews."]);
  }
  if (input.rating < 1 || input.rating > 5) {
    return err(["Rating must be between 1 and 5."]);
  }
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      reviews: next.engagement.reviews.map((review) =>
        review.id === id
          ? {
              ...review,
              rating: Math.round(input.rating),
              comment: input.comment.trim(),
              updatedAt: nowIso(),
            }
          : review,
      ),
    },
  });
}

export function deleteReview(
  store: DineFlowStore,
  id: string,
  customerId?: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  const existing = next.engagement.reviews.find((review) => review.id === id);
  if (!existing) return err(["Review not found."]);
  if (customerId && existing.customerId !== customerId) {
    return err(["You can only delete your own reviews."]);
  }
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      reviews: next.engagement.reviews.filter((review) => review.id !== id),
    },
  });
}

export function setReviewVisibility(
  store: DineFlowStore,
  id: string,
  status: "visible" | "hidden",
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      reviews: next.engagement.reviews.map((review) =>
        review.id === id ? { ...review, status, updatedAt: nowIso() } : review,
      ),
    },
  });
}

export function markNotificationRead(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      customerNotifications: next.engagement.customerNotifications.map(
        (notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification,
      ),
    },
  });
}

export function markAllNotificationsRead(
  store: DineFlowStore,
  customerId: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      customerNotifications: next.engagement.customerNotifications.map(
        (notification) =>
          notification.customerId === customerId
            ? { ...notification, read: true }
            : notification,
      ),
    },
  });
}

export function deleteNotification(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  const next = ensureEngagement(store);
  return ok({
    ...next,
    engagement: {
      ...next.engagement,
      customerNotifications: next.engagement.customerNotifications.filter(
        (notification) => notification.id !== id,
      ),
    },
  });
}

export function updateCustomerPreferences(
  store: DineFlowStore,
  customerId: string,
  preferences: CustomerPreferences,
): ActionResult<DineFlowStore> {
  if (!store.customers.some((customer) => customer.id === customerId)) {
    return err(["Customer not found."]);
  }
  return ok({
    ...store,
    customers: store.customers.map((customer) =>
      customer.id === customerId ? { ...customer, preferences } : customer,
    ),
  });
}

export function saveCustomerAddress(
  store: DineFlowStore,
  customerId: string,
  address: Omit<SavedAddress, "id"> & { id?: string },
): ActionResult<DineFlowStore> {
  if (!store.customers.some((customer) => customer.id === customerId)) {
    return err(["Customer not found."]);
  }
  if (!address.line1?.trim()) return err(["Address line is required."]);
  const saved: SavedAddress = {
    id: address.id ?? createId("adr"),
    label: address.label?.trim() || "Home",
    line1: address.line1.trim(),
    city: address.city?.trim() || "",
    notes: address.notes?.trim(),
    isDefault: Boolean(address.isDefault),
  };
  return ok({
    ...store,
    customers: store.customers.map((customer) => {
      if (customer.id !== customerId) return customer;
      const list = customer.savedAddresses ?? [];
      const exists = list.some((entry) => entry.id === saved.id);
      let nextList = exists
        ? list.map((entry) => (entry.id === saved.id ? saved : entry))
        : [saved, ...list];
      if (saved.isDefault) {
        nextList = nextList.map((entry) => ({
          ...entry,
          isDefault: entry.id === saved.id,
        }));
      }
      return { ...customer, savedAddresses: nextList };
    }),
  });
}

export function deleteCustomerAddress(
  store: DineFlowStore,
  customerId: string,
  addressId: string,
): ActionResult<DineFlowStore> {
  return ok({
    ...store,
    customers: store.customers.map((customer) =>
      customer.id === customerId
        ? {
            ...customer,
            savedAddresses: (customer.savedAddresses ?? []).filter(
              (address) => address.id !== addressId,
            ),
          }
        : customer,
    ),
  });
}

/** Wraps status updates with loyalty + notifications. */
export function updateOrderStatusWithEngagement(
  store: DineFlowStore,
  id: string,
  status: Parameters<typeof updateOrderStatus>[2],
): ActionResult<DineFlowStore> {
  const base = updateOrderStatus(store, id, status);
  if (!base.ok) return base;
  let next = ensureEngagement(base.data);
  const order = next.orders.find((entry) => entry.id === id);
  if (!order) return ok(next);

  next = {
    ...next,
    orders: next.orders.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            statusHistory: [
              ...(entry.statusHistory ?? []),
              { status, at: nowIso() },
            ],
          }
        : entry,
    ),
  };

  const titles: Partial<Record<typeof status, string>> = {
    confirmed: "Order confirmed",
    preparing: "Order preparing",
    ready: "Order ready",
    served: "Out for delivery",
    completed: "Order completed",
    cancelled: "Order cancelled",
  };
  const title = titles[status];
  if (title) {
    const notification: CustomerNotification = {
      id: createId("cn"),
      customerId: order.customerId,
      title,
      message: `${order.orderNumber} is now ${status}.`,
      type: "order",
      read: false,
      createdAt: nowIso(),
      href: `/customer/orders/${order.id}`,
    };
    next = {
      ...next,
      engagement: {
        ...next.engagement,
        customerNotifications: [
          notification,
          ...next.engagement.customerNotifications,
        ],
      },
    };
  }

  if (status === "completed") {
    const awarded = awardLoyaltyForCompletedOrder(next, id);
    if (awarded.ok) next = awarded.data;
  }
  if (status === "cancelled") {
    const reversed = reverseLoyaltyForOrder(next, id);
    if (reversed.ok) next = reversed.data;
  }

  return ok(next);
}

export { averageRating, calcCartTotals, cartSubtotal };
