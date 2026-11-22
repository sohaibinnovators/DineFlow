import type { OrderItem } from "@/lib/types";

export const DEFAULT_TAX_RATE = 0.08;

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcSubtotal(items: OrderItem[]) {
  return roundMoney(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
}

export function calcOrderTotals(
  items: OrderItem[],
  discount = 0,
  taxRate = DEFAULT_TAX_RATE,
) {
  const subtotal = calcSubtotal(items);
  const safeDiscount = roundMoney(Math.max(0, Math.min(discount, subtotal)));
  const taxable = roundMoney(subtotal - safeDiscount);
  const tax = roundMoney(taxable * taxRate);
  const total = roundMoney(taxable + tax);
  return { subtotal, discount: safeDiscount, tax, total };
}

export function syncCategoryCounts<
  TCategory extends { id: string; itemCount: number },
  TItem extends { categoryId: string },
>(categories: TCategory[], items: TItem[]) {
  return categories.map((category) => ({
    ...category,
    itemCount: items.filter((item) => item.categoryId === category.id).length,
  }));
}

export function computeDashboardStats(input: {
  orders: { total: number; status: string; createdAt: string; paymentStatus?: string }[];
  customers: unknown[];
  menuItems: unknown[];
  reservations: { status: string }[];
}) {
  const activeReservations = input.reservations.filter((reservation) =>
    ["pending", "confirmed", "seated"].includes(reservation.status),
  ).length;

  const completedOrders = input.orders.filter(
    (order) =>
      order.status === "completed" ||
      order.status === "served" ||
      order.paymentStatus === "paid",
  );

  const totalRevenue = roundMoney(
    completedOrders.reduce((sum, order) => sum + order.total, 0),
  );

  return {
    totalRevenue,
    totalOrders: input.orders.length,
    activeReservations,
    totalCustomers: input.customers.length,
    menuItemCount: input.menuItems.length,
  };
}
