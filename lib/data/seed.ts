import {
  categories as seedCategories,
  customers as seedCustomers,
  expenses as seedExpenses,
  inventory as seedInventory,
  menuItems as seedMenuItems,
  orders as seedOrders,
  reservations as seedReservations,
  staff as seedStaff,
  suppliers as seedSuppliers,
  tables as seedTables,
} from "@/lib/mock-data";
import { STORE_VERSION } from "@/lib/storage/keys";
import type {
  BillingSettings,
  Customer,
  DineFlowStore,
  Expense,
  InventoryItem,
  Invoice,
  MenuItem,
  Order,
  PaymentRecord,
  Recipe,
  RefundRecord,
  Reservation,
  RestaurantSettings,
  StaffMember,
  StaffShift,
  StockMovement,
  Supplier,
  Table,
} from "@/lib/types";
import {
  buildLineItem,
  calcInvoiceTotals,
  defaultBillingSettings,
  deriveInvoiceStatus,
  formatInvoiceNumber,
} from "./billing";
import { calcOrderTotals, roundMoney, syncCategoryCounts } from "./calculations";
import {
  defaultEngagement,
  emptyCart,
} from "./engagement";
import { defaultSettings } from "./settings";

function seedDemoBilling(base: DineFlowStore): Pick<
  DineFlowStore,
  "invoices" | "payments" | "refunds" | "billingSettings"
> {
  const methods = ["card", "cash", "bank-transfer", "card", "other", "cash"] as const;
  const billingSettings = defaultBillingSettings();
  const invoices: Invoice[] = [];
  const payments: PaymentRecord[] = [];
  const refunds: RefundRecord[] = [];

  const candidates = base.orders.filter(
    (order) =>
      order.paymentStatus === "paid" &&
      order.status !== "cancelled" &&
      order.items.length > 0,
  );

  candidates.slice(0, 6).forEach((order, index) => {
    const sequence = billingSettings.nextInvoiceSequence + index;
    const invoiceNumber = formatInvoiceNumber(
      billingSettings.invoicePrefix,
      sequence,
    );
    const issueDate = order.createdAt.slice(0, 10);
    const due = new Date(`${issueDate}T12:00:00`);
    due.setDate(due.getDate() + billingSettings.defaultDueDays);
    const taxableBase = Math.max(0, order.subtotal - order.discount);
    const taxRate =
      taxableBase > 0
        ? roundMoney(order.tax / taxableBase)
        : billingSettings.taxRate;
    const lineItems = order.items.map((item, lineIndex) =>
      buildLineItem({
        id: `line-seed-${index}-${lineIndex}`,
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        menuItemId: item.menuItemId,
      }),
    );
    const totals = calcInvoiceTotals({
      lineItems,
      discountType: "fixed",
      discountValue: order.discount,
      taxRate,
      amountPaid: 0,
    });

    let amountPaid = 0;
    if (index === 2) {
      amountPaid = roundMoney(totals.grandTotal * 0.4);
    } else if (index !== 5) {
      amountPaid = totals.grandTotal;
    }

    const withPaid = calcInvoiceTotals({
      lineItems,
      discountType: "fixed",
      discountValue: order.discount,
      taxRate,
      amountPaid,
    });
    const status = deriveInvoiceStatus({
      status: "unpaid",
      remainingBalance: withPaid.remainingBalance,
      amountPaid: withPaid.amountPaid,
      grandTotal: withPaid.grandTotal,
      dueDate: due.toISOString().slice(0, 10),
      today: "2026-11-22",
    });

    const invoiceId = `inv-seed-${index + 1}`;
    invoices.push({
      id: invoiceId,
      invoiceNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      orderId: order.id,
      orderNumber: order.orderNumber,
      issueDate,
      dueDate: due.toISOString().slice(0, 10),
      lineItems,
      discountType: "fixed",
      discountValue: order.discount,
      taxRate,
      notes: `Generated from order ${order.orderNumber}`,
      createdAt: `${issueDate}T16:00:00.000Z`,
      updatedAt: `${issueDate}T16:00:00.000Z`,
      ...withPaid,
      status,
    });

    if (amountPaid > 0) {
      payments.push({
        id: `pay-seed-${index + 1}`,
        receiptNumber: `RCT-SEED${String(index + 1).padStart(4, "0")}`,
        invoiceId,
        invoiceNumber,
        amount: amountPaid,
        method: methods[index % methods.length],
        status: "successful",
        paidAt: `${issueDate}T19:15:00.000Z`,
        notes: index === 2 ? "Partial demo payment" : "Demo settlement",
        createdAt: `${issueDate}T19:15:00.000Z`,
      });
    }
  });

  return {
    invoices,
    payments,
    refunds,
    billingSettings: {
      ...billingSettings,
      nextInvoiceSequence: billingSettings.nextInvoiceSequence + invoices.length,
    },
  };
}

function normalizeMenuItem(item: Partial<MenuItem> & { id: string; name: string }): MenuItem {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug ?? item.id,
    description: item.description ?? "",
    price: Number(item.price) || 0,
    categoryId: item.categoryId ?? "",
    categorySlug: item.categorySlug ?? "",
    image: item.image ?? "",
    tags: item.tags ?? [],
    featured: Boolean(item.featured),
    popular: Boolean(item.popular),
    available: item.available !== false,
    prepTimeMinutes: Number(item.prepTimeMinutes) || 0,
    calories: item.calories,
    createdAt: item.createdAt ?? "2026-01-01T00:00:00.000Z",
  };
}

function normalizeOrder(order: Partial<Order> & { id: string; items: Order["items"] }): Order {
  const totals =
    order.subtotal != null && order.total != null
      ? {
          subtotal: Number(order.subtotal),
          discount: Number(order.discount) || 0,
          tax: Number(order.tax) || 0,
          total: Number(order.total),
        }
      : calcOrderTotals(order.items ?? [], Number(order.discount) || 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber ?? order.id,
    customerId: order.customerId ?? "",
    customerName: order.customerName ?? "Guest",
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    tableId: order.tableId,
    tableNumber: order.tableNumber,
    items: (order.items ?? []).map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: Math.max(0, Number(item.price) || 0),
      notes: item.notes,
      kitchenStatus: item.kitchenStatus ?? "pending",
    })),
    status: order.status ?? "pending",
    paymentStatus:
      order.paymentStatus ?? (order.status === "completed" ? "paid" : "unpaid"),
    type: order.type ?? "dine-in",
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total,
    createdAt: order.createdAt ?? nowSafe(),
    updatedAt: order.updatedAt ?? order.createdAt ?? nowSafe(),
    assignedStaffId: order.assignedStaffId,
    prepStartedAt: order.prepStartedAt,
    estimatedMinutes: order.estimatedMinutes,
    stockDeducted: Boolean(order.stockDeducted),
    stockMovementIds: order.stockMovementIds ?? [],
    deliveryAddress: order.deliveryAddress,
    orderNotes: order.orderNotes,
    couponCode: order.couponCode,
    couponId: order.couponId,
    checkoutPaymentMethod: order.checkoutPaymentMethod,
    submissionToken: order.submissionToken,
    loyaltyPointsAwarded: Boolean(order.loyaltyPointsAwarded),
    statusHistory: Array.isArray(order.statusHistory)
      ? order.statusHistory
      : undefined,
  };
}

function normalizeCustomer(
  customer: Partial<Customer> & { id: string; name: string },
): Customer {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "Riverview District, Seattle, WA",
    visits: Number(customer.visits) || 0,
    totalSpent: Number(customer.totalSpent) || 0,
    favoriteDishIds: customer.favoriteDishIds ?? [],
    joinedAt: customer.joinedAt ?? "2026-01-01",
    avatar: customer.avatar,
    savedAddresses: customer.savedAddresses ?? [],
    preferences: customer.preferences ?? {
      orderUpdates: true,
      reservationReminders: true,
      couponAlerts: true,
      loyaltyAlerts: true,
      marketing: false,
    },
    loyaltyPoints: Number(customer.loyaltyPoints) || 0,
    loyaltyTier: customer.loyaltyTier ?? "bronze",
  };
}

function normalizeReservation(
  reservation: Partial<Reservation> & { id: string },
): Reservation {
  return {
    id: reservation.id,
    guestName: reservation.guestName ?? "Guest",
    email: reservation.email ?? "",
    phone: reservation.phone ?? "",
    date: reservation.date ?? "",
    time: reservation.time ?? "",
    partySize: Math.max(1, Number(reservation.partySize) || 1),
    tableId: reservation.tableId,
    status: reservation.status ?? "pending",
    notes: reservation.notes,
    createdAt: reservation.createdAt ?? nowSafe(),
    durationMinutes: reservation.durationMinutes,
    checkedInAt: reservation.checkedInAt,
    seatedAt: reservation.seatedAt,
  };
}

function normalizeTable(table: Partial<Table> & { id: string }, index: number): Table {
  const col = index % 5;
  const row = Math.floor(index / 5);
  return {
    id: table.id,
    number: table.number ?? `T${index + 1}`,
    capacity: Number(table.capacity) || 2,
    status: table.status ?? "available",
    section: table.section ?? "Main",
    currentOrderId: table.currentOrderId,
    currentReservationId: table.currentReservationId,
    combineGroupId: table.combineGroupId,
    occupiedAt: table.occupiedAt,
    x: table.x ?? 8 + col * 18,
    y: table.y ?? 10 + row * 22,
  };
}

function normalizeSettings(raw?: Partial<RestaurantSettings>): RestaurantSettings {
  const defaults = defaultSettings();
  return {
    reservationDurationMinutes:
      Number(raw?.reservationDurationMinutes) || defaults.reservationDurationMinutes,
    bufferMinutes: Number(raw?.bufferMinutes) || defaults.bufferMinutes,
    hours:
      Array.isArray(raw?.hours) && raw!.hours!.length
        ? raw!.hours!.map((entry, index) => ({
            day: Number(entry.day ?? index),
            open: entry.open ?? "11:00",
            close: entry.close ?? "22:00",
            closed: Boolean(entry.closed),
          }))
        : defaults.hours,
    blockedSlots: Array.isArray(raw?.blockedSlots)
      ? raw!.blockedSlots!.map((slot) => ({
          id: slot.id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          reason: slot.reason ?? "",
          tableId: slot.tableId,
        }))
      : [],
  };
}

function seedRecipes(inventory: InventoryItem[]): Recipe[] {
  const bySku = (sku: string) => inventory.find((item) => item.sku === sku);
  const rib = bySku("MEAT-RIB-12");
  const bass = bySku("SEA-BAS-08");
  const tomato = bySku("DRY-TOM-01");
  const basil = bySku("PRD-BAS-02");
  const parm = bySku("DRY-PRM-01");
  const bourbon = bySku("BEV-BRB-04");

  const recipes: Recipe[] = [];
  if (rib) {
    recipes.push({
      id: "rcp-ribeye",
      menuItemId: "m-5",
      ingredients: [{ inventoryItemId: rib.id, quantityPerServing: 1 }],
      updatedAt: "2026-11-01T00:00:00.000Z",
    });
  }
  if (bass) {
    recipes.push({
      id: "rcp-bass",
      menuItemId: "m-10",
      ingredients: [{ inventoryItemId: bass.id, quantityPerServing: 0.35 }],
      updatedAt: "2026-11-01T00:00:00.000Z",
    });
  }
  if (tomato && basil && parm) {
    recipes.push({
      id: "rcp-tagliatelle",
      menuItemId: "m-13",
      ingredients: [
        { inventoryItemId: tomato.id, quantityPerServing: 0.5 },
        { inventoryItemId: basil.id, quantityPerServing: 0.2 },
        { inventoryItemId: parm.id, quantityPerServing: 0.05 },
      ],
      updatedAt: "2026-11-01T00:00:00.000Z",
    });
  }
  if (bourbon) {
    recipes.push({
      id: "rcp-oldfashioned",
      menuItemId: "m-20",
      ingredients: [{ inventoryItemId: bourbon.id, quantityPerServing: 0.05 }],
      updatedAt: "2026-11-01T00:00:00.000Z",
    });
  }
  return recipes;
}

function seedShifts(staff: StaffMember[]): StaffShift[] {
  const today = "2026-11-22";
  const active = staff.filter((member) => member.status === "active").slice(0, 4);
  return active.map((member, index) => ({
    id: `shf-seed-${index + 1}`,
    staffId: member.id,
    date: today,
    startTime: index % 2 === 0 ? "11:00" : "16:00",
    endTime: index % 2 === 0 ? "19:00" : "23:00",
    role: member.role,
    notes: "Demo shift",
    status: "scheduled" as const,
  }));
}

export function createSeedStore(): DineFlowStore {
  const menuItems = seedMenuItems.map((item) =>
    normalizeMenuItem({
      ...item,
      createdAt: "2026-01-15T10:00:00.000Z",
    }),
  );

  const categories = syncCategoryCounts(
    seedCategories.map((category) => ({ ...category })),
    menuItems,
  );

  const inventory = seedInventory.map((item) => ({
    ...item,
    updatedAt: item.lastRestocked
      ? `${item.lastRestocked}T12:00:00.000Z`
      : "2026-11-20T12:00:00.000Z",
  }));

  const staff = seedStaff.map((member) => ({
    ...member,
    department:
      member.role === "chef"
        ? "Kitchen"
        : member.role === "manager"
          ? "Management"
          : "Front of House",
  }));

  const tables = seedTables.map((table, index) => normalizeTable(table, index));

  const expenses: Expense[] = seedExpenses.map((expense) => ({
    ...expense,
    category: expense.category === "payroll" ? "staff" : expense.category,
    description: expense.notes ?? expense.title,
    paymentMethod: "bank-transfer" as const,
    createdAt: `${expense.date}T09:00:00.000Z`,
  }));

  const base: DineFlowStore = {
    version: STORE_VERSION,
    menuItems,
    categories,
    orders: seedOrders.map((order) => normalizeOrder(order)),
    customers: seedCustomers.map((customer) => normalizeCustomer(customer)),
    tables,
    reservations: seedReservations.map((reservation) =>
      normalizeReservation(reservation),
    ),
    staff,
    inventory,
    suppliers: seedSuppliers.map((supplier) => ({ ...supplier })),
    recipes: seedRecipes(inventory),
    stockMovements: [],
    shifts: seedShifts(staff),
    settings: defaultSettings(),
    billingSettings: defaultBillingSettings(),
    invoices: [],
    payments: [],
    refunds: [],
    expenses,
    engagement: defaultEngagement(),
    cart: emptyCart(),
  };

  const billing = seedDemoBilling(base);
  return {
    ...base,
    ...billing,
    engagement: base.engagement,
    cart: base.cart,
  };
}

export function normalizeStore(raw: unknown): DineFlowStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<DineFlowStore>;
  if (!Array.isArray(data.menuItems) || !Array.isArray(data.categories)) {
    return null;
  }

  try {
    const menuItems = data.menuItems.map((item) =>
      normalizeMenuItem(item as MenuItem),
    );
    const categories = syncCategoryCounts(
      (data.categories ?? []).map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
        image: category.image ?? "",
        itemCount: Number(category.itemCount) || 0,
      })),
      menuItems,
    );

    const inventory = (data.inventory ?? []).map((item) => ({
      ...(item as InventoryItem),
      quantity: Number(item.quantity) || 0,
      reorderLevel: Number(item.reorderLevel) || 0,
      costPerUnit: Number(item.costPerUnit) || 0,
      updatedAt: item.updatedAt ?? `${item.lastRestocked ?? "2026-11-01"}T12:00:00.000Z`,
    }));

    const staff = (data.staff ?? []).map((member) => ({
      ...(member as StaffMember),
      department:
        member.department ??
        (member.role === "chef"
          ? "Kitchen"
          : member.role === "manager"
            ? "Management"
            : "Front of House"),
    }));

    const recipes = Array.isArray(data.recipes)
      ? (data.recipes as Recipe[])
      : seedRecipes(inventory);
    const shifts = Array.isArray(data.shifts)
      ? (data.shifts as StaffShift[])
      : seedShifts(staff);
    const stockMovements = Array.isArray(data.stockMovements)
      ? (data.stockMovements as StockMovement[])
      : [];

    return {
      version: STORE_VERSION,
      menuItems,
      categories,
      orders: (data.orders ?? []).map((order) => normalizeOrder(order as Order)),
      customers: (data.customers ?? []).map((customer) =>
        normalizeCustomer(customer as Customer),
      ),
      tables: (data.tables ?? []).map((table, index) =>
        normalizeTable(table as Table, index),
      ),
      reservations: (data.reservations ?? []).map((reservation) =>
        normalizeReservation(reservation as Reservation),
      ),
      staff,
      inventory,
      suppliers: (data.suppliers ?? []).map((supplier) => ({
        ...(supplier as Supplier),
      })),
      recipes,
      stockMovements,
      shifts,
      settings: normalizeSettings(data.settings),
      billingSettings: {
        ...defaultBillingSettings(),
        ...(data.billingSettings as BillingSettings | undefined),
      },
      invoices: Array.isArray(data.invoices) ? (data.invoices as Invoice[]) : [],
      payments: Array.isArray(data.payments)
        ? (data.payments as PaymentRecord[])
        : [],
      refunds: Array.isArray(data.refunds) ? (data.refunds as RefundRecord[]) : [],
      expenses: Array.isArray(data.expenses)
        ? (data.expenses as Expense[]).map((expense) => ({
            ...expense,
            category:
              expense.category === "payroll" ? "staff" : expense.category,
            createdAt: expense.createdAt ?? `${expense.date}T09:00:00.000Z`,
            paymentMethod: expense.paymentMethod ?? "cash",
            description: expense.description ?? expense.notes ?? expense.title,
          }))
        : [],
      engagement: {
        ...defaultEngagement(),
        ...(data.engagement ?? {}),
        loyaltySettings: {
          ...defaultEngagement().loyaltySettings,
          ...(data.engagement?.loyaltySettings ?? {}),
        },
        loyaltyRewards: Array.isArray(data.engagement?.loyaltyRewards)
          ? data.engagement!.loyaltyRewards
          : defaultEngagement().loyaltyRewards,
        loyaltyTransactions: Array.isArray(data.engagement?.loyaltyTransactions)
          ? data.engagement!.loyaltyTransactions
          : [],
        coupons: Array.isArray(data.engagement?.coupons)
          ? data.engagement!.coupons
          : defaultEngagement().coupons,
        couponUsages: Array.isArray(data.engagement?.couponUsages)
          ? data.engagement!.couponUsages
          : [],
        reviews: Array.isArray(data.engagement?.reviews)
          ? data.engagement!.reviews
          : [],
        customerNotifications: Array.isArray(
          data.engagement?.customerNotifications,
        )
          ? data.engagement!.customerNotifications
          : defaultEngagement().customerNotifications,
        recentlyViewedIds: Array.isArray(data.engagement?.recentlyViewedIds)
          ? data.engagement!.recentlyViewedIds
          : [],
        demoCustomerId:
          data.engagement?.demoCustomerId ?? defaultEngagement().demoCustomerId,
      },
      cart: Array.isArray(data.cart?.items)
        ? {
            items: data.cart!.items,
            couponCode: data.cart!.couponCode,
            updatedAt: data.cart!.updatedAt ?? nowSafe(),
          }
        : emptyCart(),
    };
  } catch {
    return null;
  }
}

function nowSafe() {
  return "2026-11-22T12:00:00.000Z";
}
