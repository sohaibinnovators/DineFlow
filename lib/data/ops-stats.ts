import type { DineFlowStore } from "@/lib/types";
import { elapsedMinutesSince } from "@/lib/utils";
import { isLowStock, isOutOfStock } from "./stock";

export function computeOpsStats(store: DineFlowStore, today = "2026-11-22") {
  const todaysReservations = store.reservations.filter(
    (reservation) => reservation.date === today,
  );
  const activeKitchen = store.orders.filter((order) =>
    ["pending", "confirmed", "preparing", "ready"].includes(order.status),
  );
  const delayedOrders = activeKitchen.filter((order) => {
    const elapsed = elapsedMinutesSince(order.prepStartedAt ?? order.createdAt);
    return elapsed > (order.estimatedMinutes ?? 20);
  });

  return {
    todaysReservations: todaysReservations.length,
    todaysReservationList: todaysReservations,
    availableTables: store.tables.filter((table) => table.status === "available")
      .length,
    occupiedTables: store.tables.filter((table) => table.status === "occupied")
      .length,
    reservedTables: store.tables.filter((table) => table.status === "reserved")
      .length,
    activeKitchenOrders: activeKitchen.length,
    delayedOrders: delayedOrders.length,
    delayedOrderList: delayedOrders,
    lowStock: store.inventory.filter(isLowStock),
    outOfStock: store.inventory.filter(isOutOfStock),
    upcomingShifts: store.shifts
      .filter((shift) => shift.status === "scheduled" && shift.date >= today)
      .slice(0, 8),
    recentMovements: store.stockMovements.slice(0, 8),
    popularDishes: store.menuItems
      .filter((item) => item.popular || item.featured)
      .slice(0, 5),
  };
}
