import type {
  CategoryInput,
  CreateOrderInput,
  CustomerInput,
  DineFlowStore,
  MenuItem,
  MenuItemInput,
  OrderStatus,
  PaymentStatus,
  ReservationInput,
  ReservationStatus,
  TableInput,
  TableStatus,
} from "@/lib/types";
import {
  calcOrderTotals,
  DEFAULT_TAX_RATE,
  syncCategoryCounts,
} from "./calculations";
import { createId, nextOrderNumber, nowIso, slugify } from "./ids";
import { validateReservationSlot } from "./scheduling";
import { deductOrderStock, reverseOrderStock } from "./stock";
import {
  isActiveOrderStatus,
  isActiveReservationStatus,
  validateCategory,
  validateCreateOrder,
  validateCustomer,
  validateMenuItem,
  validateReservation,
  validateTable,
  type ValidationResult,
} from "./validation";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

function err<T = void>(errors: string[]): ActionResult<T> {
  return { ok: false, errors };
}

function fromValidation(result: ValidationResult): ActionResult<never> | null {
  if (result.ok) return null;
  return err(result.errors);
}

function withSyncedCategories(store: DineFlowStore): DineFlowStore {
  return {
    ...store,
    categories: syncCategoryCounts(store.categories, store.menuItems),
  };
}

export function addMenuItem(
  store: DineFlowStore,
  input: MenuItemInput,
): ActionResult<DineFlowStore> {
  const invalid = fromValidation(
    validateMenuItem(input, store.categories.map((c) => c.id)),
  );
  if (invalid) return invalid;

  const category = store.categories.find((c) => c.id === input.categoryId)!;
  const baseSlug = input.slug?.trim() || slugify(input.name);
  let slug = baseSlug;
  let i = 2;
  while (store.menuItems.some((item) => item.slug === slug)) {
    slug = `${baseSlug}-${i}`;
    i += 1;
  }

  const item: MenuItem = {
    id: createId("m"),
    name: input.name.trim(),
    slug,
    description: input.description.trim(),
    price: Number(input.price),
    categoryId: category.id,
    categorySlug: category.slug,
    image: input.image.trim(),
    tags: input.tags ?? [],
    featured: Boolean(input.featured),
    popular: Boolean(input.popular),
    available: input.available !== false,
    prepTimeMinutes: Number(input.prepTimeMinutes),
    calories: input.calories,
    createdAt: nowIso(),
  };

  return ok(
    withSyncedCategories({
      ...store,
      menuItems: [item, ...store.menuItems],
    }),
  );
}

export function updateMenuItem(
  store: DineFlowStore,
  id: string,
  input: MenuItemInput,
): ActionResult<DineFlowStore> {
  const existing = store.menuItems.find((item) => item.id === id);
  if (!existing) return err(["Menu item not found."]);

  const invalid = fromValidation(
    validateMenuItem(input, store.categories.map((c) => c.id)),
  );
  if (invalid) return invalid;

  const category = store.categories.find((c) => c.id === input.categoryId)!;
  const baseSlug = input.slug?.trim() || slugify(input.name);
  let slug = baseSlug;
  let i = 2;
  while (store.menuItems.some((item) => item.slug === slug && item.id !== id)) {
    slug = `${baseSlug}-${i}`;
    i += 1;
  }

  const menuItems = store.menuItems.map((item) =>
    item.id === id
      ? {
          ...item,
          name: input.name.trim(),
          slug,
          description: input.description.trim(),
          price: Number(input.price),
          categoryId: category.id,
          categorySlug: category.slug,
          image: input.image.trim(),
          tags: input.tags ?? item.tags,
          featured: Boolean(input.featured),
          popular: Boolean(input.popular),
          available: input.available !== false,
          prepTimeMinutes: Number(input.prepTimeMinutes),
          calories: input.calories,
        }
      : item,
  );

  return ok(withSyncedCategories({ ...store, menuItems }));
}

export function deleteMenuItem(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  if (!store.menuItems.some((item) => item.id === id)) {
    return err(["Menu item not found."]);
  }
  return ok(
    withSyncedCategories({
      ...store,
      menuItems: store.menuItems.filter((item) => item.id !== id),
    }),
  );
}

export function toggleMenuAvailability(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  const menuItems = store.menuItems.map((item) =>
    item.id === id ? { ...item, available: !item.available } : item,
  );
  if (menuItems === store.menuItems) return err(["Menu item not found."]);
  return ok({ ...store, menuItems });
}

export function toggleMenuFeatured(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  const menuItems = store.menuItems.map((item) =>
    item.id === id ? { ...item, featured: !item.featured } : item,
  );
  return ok({ ...store, menuItems });
}

export function addCategory(
  store: DineFlowStore,
  input: CategoryInput,
): ActionResult<DineFlowStore> {
  const invalid = fromValidation(validateCategory(input));
  if (invalid) return invalid;

  const baseSlug = input.slug?.trim() || slugify(input.name);
  let slug = baseSlug;
  let i = 2;
  while (store.categories.some((category) => category.slug === slug)) {
    slug = `${baseSlug}-${i}`;
    i += 1;
  }

  const category = {
    id: createId("cat"),
    name: input.name.trim(),
    slug,
    description: input.description.trim(),
    image: input.image.trim(),
    itemCount: 0,
  };

  return ok({ ...store, categories: [...store.categories, category] });
}

export function updateCategory(
  store: DineFlowStore,
  id: string,
  input: CategoryInput,
): ActionResult<DineFlowStore> {
  const existing = store.categories.find((category) => category.id === id);
  if (!existing) return err(["Category not found."]);
  const invalid = fromValidation(validateCategory(input));
  if (invalid) return invalid;

  const baseSlug = input.slug?.trim() || slugify(input.name);
  let slug = baseSlug;
  let i = 2;
  while (
    store.categories.some((category) => category.slug === slug && category.id !== id)
  ) {
    slug = `${baseSlug}-${i}`;
    i += 1;
  }

  const categories = store.categories.map((category) =>
    category.id === id
      ? {
          ...category,
          name: input.name.trim(),
          slug,
          description: input.description.trim(),
          image: input.image.trim(),
        }
      : category,
  );

  const menuItems = store.menuItems.map((item) =>
    item.categoryId === id ? { ...item, categorySlug: slug } : item,
  );

  return ok(withSyncedCategories({ ...store, categories, menuItems }));
}

export function deleteCategory(
  store: DineFlowStore,
  id: string,
  options?: { reassignToCategoryId?: string; force?: boolean },
): ActionResult<DineFlowStore> {
  const category = store.categories.find((item) => item.id === id);
  if (!category) return err(["Category not found."]);

  const linked = store.menuItems.filter((item) => item.categoryId === id);
  if (linked.length && !options?.reassignToCategoryId && !options?.force) {
    return err([
      `Category still has ${linked.length} menu item(s). Reassign them or confirm force delete.`,
    ]);
  }

  let menuItems = store.menuItems;
  if (linked.length && options?.reassignToCategoryId) {
    const target = store.categories.find(
      (item) => item.id === options.reassignToCategoryId,
    );
    if (!target || target.id === id) {
      return err(["Select a valid category to reassign items."]);
    }
    menuItems = store.menuItems.map((item) =>
      item.categoryId === id
        ? { ...item, categoryId: target.id, categorySlug: target.slug }
        : item,
    );
  } else if (linked.length && options?.force) {
    menuItems = store.menuItems.filter((item) => item.categoryId !== id);
  }

  return ok(
    withSyncedCategories({
      ...store,
      categories: store.categories.filter((item) => item.id !== id),
      menuItems,
    }),
  );
}

export function createOrder(
  store: DineFlowStore,
  input: CreateOrderInput,
): ActionResult<DineFlowStore> {
  const availableIds = new Set(
    store.menuItems.filter((item) => item.available).map((item) => item.id),
  );
  const invalid = fromValidation(validateCreateOrder(input, availableIds));
  if (invalid) return invalid;

  const table =
    input.type === "dine-in"
      ? store.tables.find((item) => item.id === input.tableId)
      : undefined;
  if (input.type === "dine-in" && !table) {
    return err(["Selected table was not found."]);
  }

  const snapshotItems = input.items.map((item) => {
    const menuItem = store.menuItems.find((entry) => entry.id === item.menuItemId);
    return {
      menuItemId: item.menuItemId,
      name: menuItem?.name ?? item.name,
      quantity: item.quantity,
      price: menuItem?.price ?? item.price,
      notes: item.notes,
      kitchenStatus: item.kitchenStatus ?? ("pending" as const),
    };
  });

  const totals = calcOrderTotals(
    snapshotItems,
    input.discount ?? 0,
    input.taxRate ?? DEFAULT_TAX_RATE,
  );

  let customers = store.customers;
  let customerId = input.customerId;
  if (!customerId) {
    const existing = store.customers.find(
      (customer) =>
        customer.email &&
        input.customerEmail &&
        customer.email.toLowerCase() === input.customerEmail.toLowerCase(),
    );
    if (existing) {
      customerId = existing.id;
    } else {
      customerId = createId("cus");
      customers = [
        {
          id: customerId,
          name: input.customerName.trim(),
          email: input.customerEmail?.trim() || `${customerId}@demo.mail`,
          phone: input.customerPhone?.trim() || "",
          address: "",
          visits: 0,
          totalSpent: 0,
          favoriteDishIds: [],
          joinedAt: nowIso().slice(0, 10),
        },
        ...customers,
      ];
    }
  }

  const orderId = createId("ord");
  const createdAt = nowIso();
  const status = input.status ?? "pending";
  const order = {
    id: orderId,
    orderNumber: nextOrderNumber(store.orders.map((entry) => entry.orderNumber)),
    customerId,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail?.trim(),
    customerPhone: input.customerPhone?.trim(),
    tableId: table?.id,
    tableNumber: table?.number,
    items: snapshotItems,
    status,
    paymentStatus: input.paymentStatus ?? "unpaid",
    type: input.type,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total,
    createdAt,
    updatedAt: createdAt,
    assignedStaffId: input.assignedStaffId,
    estimatedMinutes: Math.max(
      ...snapshotItems.map((item) => {
        const menuItem = store.menuItems.find((entry) => entry.id === item.menuItemId);
        return menuItem?.prepTimeMinutes ?? 15;
      }),
      10,
    ),
    prepStartedAt: status === "preparing" ? createdAt : undefined,
    deliveryAddress: input.deliveryAddress?.trim(),
    orderNotes: input.orderNotes?.trim(),
    couponCode: input.couponCode?.trim(),
    checkoutPaymentMethod: input.checkoutPaymentMethod,
    submissionToken: input.submissionToken,
    statusHistory: [{ status, at: createdAt }],
  };

  const tables = store.tables.map((entry) => {
    if (table && entry.id === table.id) {
      return {
        ...entry,
        status: "occupied" as TableStatus,
        currentOrderId: orderId,
      };
    }
    return entry;
  });

  customers = customers.map((customer) =>
    customer.id === customerId
      ? {
          ...customer,
          name: input.customerName.trim() || customer.name,
          phone: input.customerPhone?.trim() || customer.phone,
          email: input.customerEmail?.trim() || customer.email,
          visits: customer.visits + 1,
        }
      : customer,
  );

  return ok({
    ...store,
    orders: [order, ...store.orders],
    tables,
    customers,
  });
}

export function updateOrderStatus(
  store: DineFlowStore,
  id: string,
  status: OrderStatus,
): ActionResult<DineFlowStore> {
  const existing = store.orders.find((order) => order.id === id);
  if (!existing) return err(["Order not found."]);
  if (existing.status === "cancelled" && status !== "cancelled") {
    return err(["Cancelled orders cannot be reopened."]);
  }

  const updatedAt = nowIso();
  let next: DineFlowStore = {
    ...store,
    orders: store.orders.map((order) => {
      if (order.id !== id) return order;
      return {
        ...order,
        status,
        updatedAt,
        prepStartedAt:
          status === "preparing"
            ? order.prepStartedAt ?? updatedAt
            : order.prepStartedAt,
        paymentStatus:
          status === "completed" && order.paymentStatus === "unpaid"
            ? ("paid" as PaymentStatus)
            : order.paymentStatus,
        items:
          status === "preparing" || status === "ready" || status === "completed"
            ? order.items.map((item) => ({
                ...item,
                kitchenStatus:
                  status === "completed" || status === "ready"
                    ? "ready"
                    : item.kitchenStatus === "pending"
                      ? "preparing"
                      : item.kitchenStatus,
              }))
            : order.items,
      };
    }),
  };

  if (status === "completed" || status === "cancelled") {
    next = {
      ...next,
      tables: next.tables.map((table) =>
        table.currentOrderId === id
          ? {
              ...table,
              currentOrderId: undefined,
              occupiedAt: undefined,
              status: status === "completed" ? "cleaning" : "available",
            }
          : table,
      ),
    };
  }

  if (status === "completed" && existing.status !== "completed") {
    next = {
      ...next,
      customers: next.customers.map((customer) =>
        customer.id === existing.customerId
          ? {
              ...customer,
              totalSpent: customer.totalSpent + existing.total,
            }
          : customer,
      ),
    };

    const deducted = deductOrderStock(next, id);
    if (!deducted.ok) return err(deducted.errors);
    next = deducted.store;
  }

  if (status === "cancelled" && existing.status === "completed") {
    next = {
      ...next,
      customers: next.customers.map((customer) =>
        customer.id === existing.customerId
          ? {
              ...customer,
              totalSpent: Math.max(0, customer.totalSpent - existing.total),
            }
          : customer,
      ),
    };
  }

  if (
    (status === "cancelled" || status === "pending") &&
    existing.stockDeducted &&
    existing.status === "completed"
  ) {
    const reversed = reverseOrderStock(next, id);
    if (!reversed.ok) return err(reversed.errors);
    next = reversed.store;
  }

  if (status === "preparing" || status === "ready" || status === "served") {
    next = {
      ...next,
      tables: next.tables.map((table) =>
        table.id === existing.tableId
          ? {
              ...table,
              status: "occupied",
              currentOrderId: id,
              occupiedAt: table.occupiedAt ?? updatedAt,
            }
          : table,
      ),
    };
  }

  return ok(next);
}

export function updateOrderPayment(
  store: DineFlowStore,
  id: string,
  paymentStatus: PaymentStatus,
): ActionResult<DineFlowStore> {
  if (!store.orders.some((order) => order.id === id)) {
    return err(["Order not found."]);
  }
  return ok({
    ...store,
    orders: store.orders.map((order) =>
      order.id === id
        ? { ...order, paymentStatus, updatedAt: nowIso() }
        : order,
    ),
  });
}

export function cancelOrder(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  return updateOrderStatus(store, id, "cancelled");
}

export function addCustomer(
  store: DineFlowStore,
  input: CustomerInput,
): ActionResult<DineFlowStore> {
  const invalid = fromValidation(validateCustomer(input));
  if (invalid) return invalid;
  if (
    store.customers.some(
      (customer) => customer.email.toLowerCase() === input.email.trim().toLowerCase(),
    )
  ) {
    return err(["A customer with this email already exists."]);
  }

  const customer = {
    id: createId("cus"),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    address: input.address?.trim() ?? "",
    visits: input.visits ?? 0,
    totalSpent: input.totalSpent ?? 0,
    favoriteDishIds: input.favoriteDishIds ?? [],
    joinedAt: input.joinedAt ?? nowIso().slice(0, 10),
    avatar: input.avatar,
  };

  return ok({ ...store, customers: [customer, ...store.customers] });
}

export function updateCustomer(
  store: DineFlowStore,
  id: string,
  input: CustomerInput,
): ActionResult<DineFlowStore> {
  if (!store.customers.some((customer) => customer.id === id)) {
    return err(["Customer not found."]);
  }
  const invalid = fromValidation(validateCustomer(input));
  if (invalid) return invalid;
  if (
    store.customers.some(
      (customer) =>
        customer.id !== id &&
        customer.email.toLowerCase() === input.email.trim().toLowerCase(),
    )
  ) {
    return err(["A customer with this email already exists."]);
  }

  const customers = store.customers.map((customer) =>
    customer.id === id
      ? {
          ...customer,
          name: input.name.trim(),
          email: input.email.trim(),
          phone: input.phone.trim(),
          address: input.address?.trim() ?? "",
          avatar: input.avatar ?? customer.avatar,
        }
      : customer,
  );

  const orders = store.orders.map((order) =>
    order.customerId === id
      ? {
          ...order,
          customerName: input.name.trim(),
          customerEmail: input.email.trim(),
          customerPhone: input.phone.trim(),
        }
      : order,
  );

  return ok({ ...store, customers, orders });
}

export function deleteCustomer(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  const hasActiveOrders = store.orders.some(
    (order) => order.customerId === id && isActiveOrderStatus(order.status),
  );
  if (hasActiveOrders) {
    return err(["Cannot delete a customer with active orders."]);
  }
  return ok({
    ...store,
    customers: store.customers.filter((customer) => customer.id !== id),
  });
}

export function addTable(
  store: DineFlowStore,
  input: TableInput,
): ActionResult<DineFlowStore> {
  const invalid = fromValidation(validateTable(input));
  if (invalid) return invalid;
  if (
    store.tables.some(
      (table) => table.number.toLowerCase() === input.number.trim().toLowerCase(),
    )
  ) {
    return err(["A table with this number already exists."]);
  }

  const table = {
    id: createId("tbl"),
    number: input.number.trim(),
    capacity: Number(input.capacity),
    status: input.status,
    section: input.section.trim(),
    x: input.x != null ? Number(input.x) : undefined,
    y: input.y != null ? Number(input.y) : undefined,
    combineGroupId: input.combineGroupId,
  };

  return ok({ ...store, tables: [...store.tables, table] });
}

export function updateTable(
  store: DineFlowStore,
  id: string,
  input: TableInput,
): ActionResult<DineFlowStore> {
  if (!store.tables.some((table) => table.id === id)) {
    return err(["Table not found."]);
  }
  const invalid = fromValidation(validateTable(input));
  if (invalid) return invalid;
  if (
    store.tables.some(
      (table) =>
        table.id !== id &&
        table.number.toLowerCase() === input.number.trim().toLowerCase(),
    )
  ) {
    return err(["A table with this number already exists."]);
  }

  return ok({
    ...store,
    tables: store.tables.map((table) =>
      table.id === id
        ? {
            ...table,
            number: input.number.trim(),
            capacity: Number(input.capacity),
            status: input.status,
            section: input.section.trim(),
            x: input.x != null ? Number(input.x) : table.x,
            y: input.y != null ? Number(input.y) : table.y,
          }
        : table,
    ),
  });
}

export function updateTableStatus(
  store: DineFlowStore,
  id: string,
  status: TableStatus,
): ActionResult<DineFlowStore> {
  if (!store.tables.some((table) => table.id === id)) {
    return err(["Table not found."]);
  }
  return ok({
    ...store,
    tables: store.tables.map((table) =>
      table.id === id ? { ...table, status } : table,
    ),
  });
}

export function deleteTable(
  store: DineFlowStore,
  id: string,
  options?: { reassignReservationsTo?: string },
): ActionResult<DineFlowStore> {
  const table = store.tables.find((item) => item.id === id);
  if (!table) return err(["Table not found."]);

  const activeOrder = store.orders.find(
    (order) => order.tableId === id && isActiveOrderStatus(order.status),
  );
  if (activeOrder || table.currentOrderId) {
    return err(["Cannot delete a table with an active order."]);
  }

  const linkedReservations = store.reservations.filter(
    (reservation) =>
      reservation.tableId === id && isActiveReservationStatus(reservation.status),
  );

  if (linkedReservations.length && !options?.reassignReservationsTo) {
    return err([
      `Table has ${linkedReservations.length} active reservation(s). Reassign them first.`,
    ]);
  }

  let reservations = store.reservations;
  if (linkedReservations.length && options?.reassignReservationsTo) {
    const target = store.tables.find(
      (item) => item.id === options.reassignReservationsTo,
    );
    if (!target || target.id === id) {
      return err(["Select a valid table for reservation reassignment."]);
    }
    reservations = store.reservations.map((reservation) =>
      reservation.tableId === id && isActiveReservationStatus(reservation.status)
        ? { ...reservation, tableId: target.id }
        : reservation,
    );
  }

  return ok({
    ...store,
    tables: store.tables.filter((item) => item.id !== id),
    reservations,
  });
}

export function addReservation(
  store: DineFlowStore,
  input: ReservationInput,
): ActionResult<DineFlowStore> {
  const invalid = fromValidation(validateReservation(input));
  if (invalid) return invalid;

  const slot = validateReservationSlot({
    date: input.date,
    time: input.time,
    partySize: Number(input.partySize),
    tableId: input.tableId,
    durationMinutes: input.durationMinutes,
    settings: store.settings,
    reservations: store.reservations,
    tables: store.tables,
  });
  if (!slot.ok) return err(slot.errors);

  const reservation = {
    id: createId("res"),
    guestName: input.guestName.trim(),
    email: input.email?.trim() ?? "",
    phone: input.phone.trim(),
    date: input.date,
    time: input.time,
    partySize: Number(input.partySize),
    tableId: input.tableId,
    status: input.status ?? "pending",
    notes: input.notes?.trim(),
    createdAt: nowIso(),
    durationMinutes: input.durationMinutes,
  };

  let tables = store.tables;
  if (
    reservation.tableId &&
    ["confirmed", "seated"].includes(reservation.status)
  ) {
    tables = tables.map((table) =>
      table.id === reservation.tableId
        ? {
            ...table,
            status:
              reservation.status === "seated"
                ? ("occupied" as TableStatus)
                : ("reserved" as TableStatus),
            currentReservationId: reservation.id,
            occupiedAt:
              reservation.status === "seated" ? nowIso() : table.occupiedAt,
          }
        : table,
    );
  }

  return ok({
    ...store,
    reservations: [reservation, ...store.reservations],
    tables,
  });
}

export function updateReservation(
  store: DineFlowStore,
  id: string,
  input: ReservationInput,
): ActionResult<DineFlowStore> {
  if (!store.reservations.some((reservation) => reservation.id === id)) {
    return err(["Reservation not found."]);
  }
  const invalid = fromValidation(validateReservation(input));
  if (invalid) return invalid;

  const slot = validateReservationSlot({
    date: input.date,
    time: input.time,
    partySize: Number(input.partySize),
    tableId: input.tableId,
    durationMinutes: input.durationMinutes,
    excludeReservationId: id,
    settings: store.settings,
    reservations: store.reservations,
    tables: store.tables,
  });
  if (!slot.ok) return err(slot.errors);

  return ok({
    ...store,
    reservations: store.reservations.map((reservation) =>
      reservation.id === id
        ? {
            ...reservation,
            guestName: input.guestName.trim(),
            email: input.email?.trim() ?? "",
            phone: input.phone.trim(),
            date: input.date,
            time: input.time,
            partySize: Number(input.partySize),
            tableId: input.tableId,
            status: input.status ?? reservation.status,
            notes: input.notes?.trim(),
            durationMinutes:
              input.durationMinutes ?? reservation.durationMinutes,
          }
        : reservation,
    ),
  });
}

export function updateReservationStatus(
  store: DineFlowStore,
  id: string,
  status: ReservationStatus,
): ActionResult<DineFlowStore> {
  const existing = store.reservations.find((reservation) => reservation.id === id);
  if (!existing) return err(["Reservation not found."]);
  const stamp = nowIso();

  const reservations = store.reservations.map((reservation) =>
    reservation.id === id
      ? {
          ...reservation,
          status,
          checkedInAt:
            status === "seated"
              ? reservation.checkedInAt ?? stamp
              : reservation.checkedInAt,
          seatedAt: status === "seated" ? stamp : reservation.seatedAt,
        }
      : reservation,
  );

  let tables = store.tables;
  if (existing.tableId) {
    if (status === "seated") {
      tables = tables.map((table) =>
        table.id === existing.tableId
          ? {
              ...table,
              status: "occupied" as TableStatus,
              currentReservationId: id,
              occupiedAt: stamp,
            }
          : table,
      );
    }
    if (status === "cancelled" || status === "no-show" || status === "completed") {
      tables = tables.map((table) =>
        table.id === existing.tableId
          ? {
              ...table,
              status:
                table.currentOrderId
                  ? table.status
                  : ("available" as TableStatus),
              currentReservationId:
                table.currentReservationId === id
                  ? undefined
                  : table.currentReservationId,
              occupiedAt: table.currentOrderId ? table.occupiedAt : undefined,
            }
          : table,
      );
    }
    if (status === "confirmed") {
      tables = tables.map((table) =>
        table.id === existing.tableId &&
        (table.status === "available" || table.status === "reserved")
          ? {
              ...table,
              status: "reserved" as TableStatus,
              currentReservationId: id,
            }
          : table,
      );
    }
  }

  return ok({ ...store, reservations, tables });
}

export function cancelReservation(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  return updateReservationStatus(store, id, "cancelled");
}
