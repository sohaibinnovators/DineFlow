import type {
  CartLineItem,
  CartState,
  Coupon,
  CouponUsage,
  DiscountType,
  EngagementState,
  LoyaltySettings,
  LoyaltyTier,
  LoyaltyTransaction,
  MenuItem,
  MenuReview,
  Order,
  OrderItem,
} from "@/lib/types";
import { calcOrderTotals, roundMoney } from "./calculations";

export const DEMO_CUSTOMER_ID = "cus-1";

export function defaultLoyaltySettings(): LoyaltySettings {
  return {
    pointsPerCurrency: 1,
    minRedemptionPoints: 100,
    bronzeThreshold: 0,
    silverThreshold: 500,
    goldThreshold: 1500,
    platinumThreshold: 4000,
  };
}

export function emptyCart(): CartState {
  return { items: [], updatedAt: "2026-11-22T00:00:00.000Z" };
}

export function defaultEngagement(): EngagementState {
  return {
    demoCustomerId: DEMO_CUSTOMER_ID,
    recentlyViewedIds: [],
    loyaltySettings: defaultLoyaltySettings(),
    loyaltyRewards: [
      {
        id: "rwd-1",
        title: "Free appetizer",
        description: "Redeem for a complimentary starter on your next visit.",
        pointsCost: 200,
        active: true,
      },
      {
        id: "rwd-2",
        title: "10% off next order",
        description: "Demo reward — apply with staff at checkout.",
        pointsCost: 350,
        active: true,
      },
      {
        id: "rwd-3",
        title: "Dessert on the house",
        description: "Choose any dessert under PKR 800.",
        pointsCost: 500,
        active: true,
        validUntil: "2027-06-30",
      },
    ],
    loyaltyTransactions: [],
    coupons: [
      {
        id: "cpn-1",
        code: "WELCOME10",
        description: "10% off orders over PKR 1500",
        discountType: "percentage",
        discountValue: 10,
        minOrderAmount: 1500,
        maxDiscount: 500,
        startDate: "2026-01-01",
        expiryDate: "2027-12-31",
        usageLimit: 500,
        perCustomerLimit: 3,
        usageCount: 0,
        applicableCategoryIds: [],
        applicableMenuItemIds: [],
        active: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "cpn-2",
        code: "FLAT300",
        description: "PKR 300 off orders over PKR 2500",
        discountType: "fixed",
        discountValue: 300,
        minOrderAmount: 2500,
        startDate: "2026-01-01",
        expiryDate: "2027-12-31",
        usageLimit: 200,
        perCustomerLimit: 2,
        usageCount: 0,
        applicableCategoryIds: [],
        applicableMenuItemIds: [],
        active: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    couponUsages: [],
    reviews: [],
    customerNotifications: [
      {
        id: "cn-seed-1",
        customerId: DEMO_CUSTOMER_ID,
        title: "Welcome to DineFlow",
        message:
          "This is a demo customer session (cus-1). Explore orders, loyalty, and coupons.",
        type: "system",
        read: false,
        createdAt: "2026-11-20T10:00:00.000Z",
        href: "/customer",
      },
    ],
  };
}

export function deriveLoyaltyTier(
  lifetimePoints: number,
  settings: LoyaltySettings,
): LoyaltyTier {
  if (lifetimePoints >= settings.platinumThreshold) return "platinum";
  if (lifetimePoints >= settings.goldThreshold) return "gold";
  if (lifetimePoints >= settings.silverThreshold) return "silver";
  return "bronze";
}

export function cartSubtotal(items: CartLineItem[]) {
  return roundMoney(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );
}

export function calcCouponDiscount(
  coupon: Coupon,
  subtotal: number,
  lineItems: Array<{ menuItemId: string; lineTotal: number; categoryId?: string }>,
) {
  let eligible = subtotal;
  if (
    coupon.applicableMenuItemIds.length > 0 ||
    coupon.applicableCategoryIds.length > 0
  ) {
    eligible = roundMoney(
      lineItems
        .filter((line) => {
          const itemOk =
            coupon.applicableMenuItemIds.length === 0 ||
            coupon.applicableMenuItemIds.includes(line.menuItemId);
          const catOk =
            coupon.applicableCategoryIds.length === 0 ||
            (line.categoryId
              ? coupon.applicableCategoryIds.includes(line.categoryId)
              : false);
          if (
            coupon.applicableMenuItemIds.length > 0 &&
            coupon.applicableCategoryIds.length > 0
          ) {
            return itemOk || catOk;
          }
          if (coupon.applicableMenuItemIds.length > 0) return itemOk;
          return catOk;
        })
        .reduce((sum, line) => sum + line.lineTotal, 0),
    );
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = roundMoney((eligible * coupon.discountValue) / 100);
  } else {
    discount = roundMoney(Math.min(coupon.discountValue, eligible));
  }
  if (coupon.maxDiscount != null) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  return roundMoney(Math.min(discount, subtotal));
}

export function validateCoupon(input: {
  coupon: Coupon | undefined;
  code: string;
  subtotal: number;
  today: string;
  customerId?: string;
  usages: CouponUsage[];
  lineItems: Array<{ menuItemId: string; lineTotal: number; categoryId?: string }>;
}): { ok: true; coupon: Coupon; discount: number } | { ok: false; errors: string[] } {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, errors: ["Enter a coupon code."] };
  const coupon = input.coupon;
  if (!coupon || coupon.code.toUpperCase() !== code) {
    return { ok: false, errors: ["Coupon code not found."] };
  }
  if (!coupon.active) return { ok: false, errors: ["This coupon is inactive."] };
  if (coupon.startDate > input.today) {
    return { ok: false, errors: ["This coupon is not active yet."] };
  }
  if (coupon.expiryDate < input.today) {
    return { ok: false, errors: ["This coupon has expired."] };
  }
  if (input.subtotal < coupon.minOrderAmount) {
    return {
      ok: false,
      errors: [
        `Minimum order amount is ${coupon.minOrderAmount.toFixed(2)} for this coupon.`,
      ],
    };
  }
  if (
    coupon.usageLimit != null &&
    coupon.usageCount >= coupon.usageLimit
  ) {
    return { ok: false, errors: ["This coupon has reached its usage limit."] };
  }
  if (input.customerId && coupon.perCustomerLimit != null) {
    const used = input.usages.filter(
      (usage) =>
        usage.couponId === coupon.id && usage.customerId === input.customerId,
    ).length;
    if (used >= coupon.perCustomerLimit) {
      return {
        ok: false,
        errors: ["You have already used this coupon the maximum times."],
      };
    }
  }
  if (
    coupon.applicableMenuItemIds.length > 0 ||
    coupon.applicableCategoryIds.length > 0
  ) {
    const eligible = input.lineItems.some((line) => {
      const itemOk =
        coupon.applicableMenuItemIds.length === 0 ||
        coupon.applicableMenuItemIds.includes(line.menuItemId);
      const catOk =
        coupon.applicableCategoryIds.length === 0 ||
        (line.categoryId
          ? coupon.applicableCategoryIds.includes(line.categoryId)
          : false);
      if (
        coupon.applicableMenuItemIds.length > 0 &&
        coupon.applicableCategoryIds.length > 0
      ) {
        return itemOk || catOk;
      }
      if (coupon.applicableMenuItemIds.length > 0) return itemOk;
      return catOk;
    });
    if (!eligible) {
      return {
        ok: false,
        errors: ["This coupon does not apply to items in your cart."],
      };
    }
  }

  const discount = calcCouponDiscount(coupon, input.subtotal, input.lineItems);
  if (discount <= 0) {
    return { ok: false, errors: ["Coupon does not produce a discount."] };
  }
  return { ok: true, coupon, discount };
}

export function calcCartTotals(input: {
  items: CartLineItem[];
  discount: number;
  taxRate: number;
}) {
  const orderItems: OrderItem[] = input.items.map((item) => ({
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    price: item.unitPrice,
    notes: item.notes,
  }));
  return calcOrderTotals(orderItems, input.discount, input.taxRate);
}

export function pointsForOrder(total: number, settings: LoyaltySettings) {
  return Math.max(0, Math.floor(total * settings.pointsPerCurrency));
}

export function lifetimeEarnedPoints(txns: LoyaltyTransaction[], customerId: string) {
  return txns
    .filter(
      (txn) =>
        txn.customerId === customerId &&
        (txn.type === "earn" || (txn.type === "adjust" && txn.points > 0)),
    )
    .reduce((sum, txn) => sum + Math.max(0, txn.points), 0);
}

export function averageRating(reviews: MenuReview[], menuItemId: string) {
  const visible = reviews.filter(
    (review) =>
      review.menuItemId === menuItemId && review.status === "visible",
  );
  if (!visible.length) return { average: 0, count: 0 };
  const sum = visible.reduce((acc, review) => acc + review.rating, 0);
  return {
    average: roundMoney(sum / visible.length),
    count: visible.length,
  };
}

export function recommendMenuItems(input: {
  menuItems: MenuItem[];
  favoriteIds: string[];
  recentlyViewedIds: string[];
  recentOrderItemIds: string[];
  limit?: number;
}) {
  const available = input.menuItems.filter((item) => item.available);
  const scored = available.map((item) => {
    let score = 0;
    if (item.popular) score += 5;
    if (item.featured) score += 4;
    if (input.favoriteIds.includes(item.id)) score += 3;
    if (input.recentlyViewedIds.includes(item.id)) score += 2;
    if (input.recentOrderItemIds.includes(item.id)) score += 3;
    const relatedCategory = available.some(
      (other) =>
        other.categoryId === item.categoryId &&
        (input.favoriteIds.includes(other.id) ||
          input.recentOrderItemIds.includes(other.id)),
    );
    if (relatedCategory) score += 2;
    return { item, score };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, input.limit ?? 6)
    .map((entry) => entry.item);
}

export function orderTimelineStatuses(type: Order["type"]): Order["status"][] {
  if (type === "delivery") {
    return ["pending", "confirmed", "preparing", "ready", "served", "completed"];
  }
  return ["pending", "confirmed", "preparing", "ready", "completed"];
}

export type DiscountTypeAlias = DiscountType;
