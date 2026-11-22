import type {
  BlockedSlot,
  DineFlowStore,
  InventoryInput,
  KitchenItemStatus,
  RecipeInput,
  RestaurantSettings,
  StaffInput,
  StaffShiftInput,
  SupplierInput,
  TableStatus,
} from "@/lib/types";
import type { ActionResult } from "./actions";
import { createId, nowIso } from "./ids";
import { applyStockMovement, reverseOrderStock } from "./stock";
import { timeToMinutes } from "./settings";

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function err<T = void>(errors: string[]): ActionResult<T> {
  return { ok: false, errors };
}

export function updateSettings(
  store: DineFlowStore,
  settings: RestaurantSettings,
): ActionResult<DineFlowStore> {
  if (settings.reservationDurationMinutes < 30) {
    return err(["Reservation duration must be at least 30 minutes."]);
  }
  if (settings.bufferMinutes < 0) {
    return err(["Buffer minutes cannot be negative."]);
  }
  return ok({ ...store, settings: { ...settings } });
}

export function addBlockedSlot(
  store: DineFlowStore,
  slot: Omit<BlockedSlot, "id">,
): ActionResult<DineFlowStore> {
  if (!slot.date || !slot.startTime || !slot.endTime) {
    return err(["Blocked slot needs date, start, and end time."]);
  }
  if (timeToMinutes(slot.endTime) <= timeToMinutes(slot.startTime)) {
    return err(["Blocked slot end time must be after start time."]);
  }
  return ok({
    ...store,
    settings: {
      ...store.settings,
      blockedSlots: [
        { ...slot, id: createId("blk"), reason: slot.reason.trim() },
        ...store.settings.blockedSlots,
      ],
    },
  });
}

export function removeBlockedSlot(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  return ok({
    ...store,
    settings: {
      ...store.settings,
      blockedSlots: store.settings.blockedSlots.filter((slot) => slot.id !== id),
    },
  });
}

export function combineTables(
  store: DineFlowStore,
  tableIds: string[],
): ActionResult<DineFlowStore> {
  if (tableIds.length < 2) return err(["Select at least two tables to combine."]);
  const selected = store.tables.filter((table) => tableIds.includes(table.id));
  if (selected.length !== tableIds.length) {
    return err(["One or more tables were not found."]);
  }
  if (
    selected.some(
      (table) =>
        table.currentOrderId ||
        table.status === "occupied" ||
        table.status === "reserved",
    )
  ) {
    return err(["Only free tables can be combined."]);
  }
  const groupId = createId("grp");
  return ok({
    ...store,
    tables: store.tables.map((table) =>
      tableIds.includes(table.id)
        ? { ...table, combineGroupId: groupId }
        : table,
    ),
  });
}

export function separateTables(
  store: DineFlowStore,
  tableId: string,
): ActionResult<DineFlowStore> {
  const table = store.tables.find((item) => item.id === tableId);
  if (!table?.combineGroupId) {
    return err(["Table is not part of a combined group."]);
  }
  const groupId = table.combineGroupId;
  return ok({
    ...store,
    tables: store.tables.map((item) =>
      item.combineGroupId === groupId
        ? { ...item, combineGroupId: undefined }
        : item,
    ),
  });
}

export function moveOrderToTable(
  store: DineFlowStore,
  orderId: string,
  tableId: string,
): ActionResult<DineFlowStore> {
  const order = store.orders.find((item) => item.id === orderId);
  const table = store.tables.find((item) => item.id === tableId);
  if (!order) return err(["Order not found."]);
  if (!table) return err(["Table not found."]);
  if (table.currentOrderId && table.currentOrderId !== orderId) {
    return err(["Target table already has an active order."]);
  }

  return ok({
    ...store,
    orders: store.orders.map((item) =>
      item.id === orderId
        ? { ...item, tableId: table.id, tableNumber: table.number, updatedAt: nowIso() }
        : item,
    ),
    tables: store.tables.map((item) => {
      if (item.id === order.tableId) {
        return {
          ...item,
          currentOrderId: undefined,
          status: "cleaning" as TableStatus,
          occupiedAt: undefined,
        };
      }
      if (item.id === tableId) {
        return {
          ...item,
          currentOrderId: orderId,
          status: "occupied" as TableStatus,
          occupiedAt: item.occupiedAt ?? nowIso(),
        };
      }
      return item;
    }),
  });
}

export function updateKitchenItemStatus(
  store: DineFlowStore,
  orderId: string,
  menuItemId: string,
  itemIndex: number,
  kitchenStatus: KitchenItemStatus,
): ActionResult<DineFlowStore> {
  const order = store.orders.find((item) => item.id === orderId);
  if (!order) return err(["Order not found."]);

  const items = order.items.map((item, index) =>
    index === itemIndex && item.menuItemId === menuItemId
      ? { ...item, kitchenStatus }
      : item,
  );

  let status = order.status;
  if (items.every((item) => item.kitchenStatus === "ready")) {
    status = "ready";
  } else if (items.some((item) => item.kitchenStatus === "preparing" || item.kitchenStatus === "ready")) {
    status = status === "pending" || status === "confirmed" ? "preparing" : status;
  }

  return ok({
    ...store,
    orders: store.orders.map((item) =>
      item.id === orderId
        ? {
            ...item,
            items,
            status,
            updatedAt: nowIso(),
            prepStartedAt:
              status === "preparing"
                ? item.prepStartedAt ?? nowIso()
                : item.prepStartedAt,
          }
        : item,
    ),
  });
}

export function addInventoryItem(
  store: DineFlowStore,
  input: InventoryInput,
): ActionResult<DineFlowStore> {
  if (!input.name?.trim()) return err(["Item name is required."]);
  if (!input.unit?.trim()) return err(["Unit is required."]);
  if (Number(input.quantity) < 0 || Number(input.costPerUnit) < 0) {
    return err(["Quantity and cost cannot be negative."]);
  }
  const item = {
    id: createId("inv"),
    name: input.name.trim(),
    sku: input.sku?.trim() || createId("SKU").toUpperCase(),
    category: input.category?.trim() || "General",
    quantity: Number(input.quantity) || 0,
    unit: input.unit.trim(),
    reorderLevel: Number(input.reorderLevel) || 0,
    supplierId: input.supplierId,
    lastRestocked: input.lastRestocked || nowIso().slice(0, 10),
    costPerUnit: Number(input.costPerUnit) || 0,
    updatedAt: nowIso(),
  };
  return ok({ ...store, inventory: [item, ...store.inventory] });
}

export function updateInventoryItem(
  store: DineFlowStore,
  id: string,
  input: InventoryInput,
): ActionResult<DineFlowStore> {
  if (!store.inventory.some((item) => item.id === id)) {
    return err(["Inventory item not found."]);
  }
  if (!input.name?.trim()) return err(["Item name is required."]);
  return ok({
    ...store,
    inventory: store.inventory.map((item) =>
      item.id === id
        ? {
            ...item,
            name: input.name.trim(),
            sku: input.sku?.trim() || item.sku,
            category: input.category?.trim() || item.category,
            unit: input.unit.trim(),
            reorderLevel: Number(input.reorderLevel) || 0,
            supplierId: input.supplierId,
            costPerUnit: Number(input.costPerUnit) || 0,
            updatedAt: nowIso(),
          }
        : item,
    ),
  });
}

export function deleteInventoryItem(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  const used = store.recipes.some((recipe) =>
    recipe.ingredients.some((ingredient) => ingredient.inventoryItemId === id),
  );
  if (used) {
    return err(["Cannot delete inventory used in recipes. Remove recipe links first."]);
  }
  return ok({
    ...store,
    inventory: store.inventory.filter((item) => item.id !== id),
  });
}

export function recordStockMovement(
  store: DineFlowStore,
  input: {
    inventoryItemId: string;
    type: "received" | "adjustment" | "reduction" | "wastage";
    quantity: number;
    reason: string;
    allowNegative?: boolean;
  },
): ActionResult<DineFlowStore> {
  const direction =
    input.type === "received" || (input.type === "adjustment" && input.quantity > 0)
      ? "in"
      : "out";
  const quantity = Math.abs(input.quantity);
  const result = applyStockMovement(store, {
    inventoryItemId: input.inventoryItemId,
    type: input.type,
    quantity,
    direction: input.type === "adjustment" ? direction : direction,
    reason: input.reason.trim() || input.type,
    allowNegative: input.allowNegative && input.type === "adjustment",
  });
  if (!result.ok) return err(result.errors);
  return ok(result.store);
}

export function saveRecipe(
  store: DineFlowStore,
  input: RecipeInput,
): ActionResult<DineFlowStore> {
  if (!store.menuItems.some((item) => item.id === input.menuItemId)) {
    return err(["Menu item not found."]);
  }
  if (!input.ingredients.length) {
    return err(["Add at least one ingredient."]);
  }
  for (const ingredient of input.ingredients) {
    if (!store.inventory.some((item) => item.id === ingredient.inventoryItemId)) {
      return err(["One or more ingredients are invalid."]);
    }
    if (ingredient.quantityPerServing <= 0) {
      return err(["Ingredient quantities must be greater than zero."]);
    }
  }

  const existing = store.recipes.find(
    (recipe) => recipe.menuItemId === input.menuItemId,
  );
  const recipe = {
    id: existing?.id ?? createId("rcp"),
    menuItemId: input.menuItemId,
    ingredients: input.ingredients,
    updatedAt: nowIso(),
  };

  return ok({
    ...store,
    recipes: existing
      ? store.recipes.map((item) => (item.id === existing.id ? recipe : item))
      : [recipe, ...store.recipes],
  });
}

export function deleteRecipe(
  store: DineFlowStore,
  menuItemId: string,
): ActionResult<DineFlowStore> {
  return ok({
    ...store,
    recipes: store.recipes.filter((recipe) => recipe.menuItemId !== menuItemId),
  });
}

export function reverseCompletedOrderStock(
  store: DineFlowStore,
  orderId: string,
): ActionResult<DineFlowStore> {
  const result = reverseOrderStock(store, orderId);
  if (!result.ok) return err(result.errors);
  return ok(result.store);
}

export function addSupplier(
  store: DineFlowStore,
  input: SupplierInput,
): ActionResult<DineFlowStore> {
  if (!input.name?.trim() || !input.email?.trim()) {
    return err(["Supplier name and email are required."]);
  }
  return ok({
    ...store,
    suppliers: [
      {
        id: createId("sup"),
        name: input.name.trim(),
        contactName: input.contactName.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        category: input.category.trim(),
        status: input.status ?? "active",
        leadTimeDays: Number(input.leadTimeDays) || 1,
      },
      ...store.suppliers,
    ],
  });
}

export function updateSupplier(
  store: DineFlowStore,
  id: string,
  input: SupplierInput,
): ActionResult<DineFlowStore> {
  if (!store.suppliers.some((supplier) => supplier.id === id)) {
    return err(["Supplier not found."]);
  }
  return ok({
    ...store,
    suppliers: store.suppliers.map((supplier) =>
      supplier.id === id
        ? {
            ...supplier,
            name: input.name.trim(),
            contactName: input.contactName.trim(),
            email: input.email.trim(),
            phone: input.phone.trim(),
            category: input.category.trim(),
            status: input.status ?? supplier.status,
            leadTimeDays: Number(input.leadTimeDays) || supplier.leadTimeDays,
          }
        : supplier,
    ),
  });
}

export function deleteSupplier(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  const linked = store.inventory.filter((item) => item.supplierId === id);
  if (linked.length) {
    return err([
      `Supplier is linked to ${linked.length} inventory item(s). Reassign them first.`,
    ]);
  }
  return ok({
    ...store,
    suppliers: store.suppliers.filter((supplier) => supplier.id !== id),
  });
}

export function addStaffMember(
  store: DineFlowStore,
  input: StaffInput,
): ActionResult<DineFlowStore> {
  if (!input.name?.trim() || !input.email?.trim()) {
    return err(["Staff name and email are required."]);
  }
  return ok({
    ...store,
    staff: [
      {
        id: createId("stf"),
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        role: input.role,
        department: input.department?.trim() || "Front of House",
        status: input.status ?? "active",
        shift: input.shift?.trim() || "Flexible",
        avatar: input.avatar,
        joinedAt: input.joinedAt ?? nowIso().slice(0, 10),
      },
      ...store.staff,
    ],
  });
}

export function updateStaffMember(
  store: DineFlowStore,
  id: string,
  input: StaffInput,
): ActionResult<DineFlowStore> {
  if (!store.staff.some((member) => member.id === id)) {
    return err(["Staff member not found."]);
  }
  return ok({
    ...store,
    staff: store.staff.map((member) =>
      member.id === id
        ? {
            ...member,
            name: input.name.trim(),
            email: input.email.trim(),
            phone: input.phone.trim(),
            role: input.role,
            department: input.department?.trim() || member.department,
            status: input.status ?? member.status,
            shift: input.shift?.trim() || member.shift,
          }
        : member,
    ),
  });
}

function shiftsOverlap(
  a: { date: string; startTime: string; endTime: string },
  b: { date: string; startTime: string; endTime: string },
) {
  if (a.date !== b.date) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

export function addStaffShift(
  store: DineFlowStore,
  input: StaffShiftInput,
): ActionResult<DineFlowStore> {
  if (!store.staff.some((member) => member.id === input.staffId)) {
    return err(["Staff member not found."]);
  }
  if (timeToMinutes(input.endTime) <= timeToMinutes(input.startTime)) {
    return err(["Shift end time must be after start time."]);
  }
  const conflict = store.shifts.some(
    (shift) =>
      shift.staffId === input.staffId &&
      shift.status === "scheduled" &&
      shiftsOverlap(shift, input),
  );
  if (conflict) {
    return err(["This staff member already has an overlapping shift."]);
  }
  return ok({
    ...store,
    shifts: [
      {
        id: createId("shf"),
        staffId: input.staffId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        role: input.role,
        notes: input.notes,
        status: "scheduled",
      },
      ...store.shifts,
    ],
  });
}

export function updateStaffShift(
  store: DineFlowStore,
  id: string,
  input: StaffShiftInput,
): ActionResult<DineFlowStore> {
  const existing = store.shifts.find((shift) => shift.id === id);
  if (!existing) return err(["Shift not found."]);
  if (timeToMinutes(input.endTime) <= timeToMinutes(input.startTime)) {
    return err(["Shift end time must be after start time."]);
  }
  const conflict = store.shifts.some(
    (shift) =>
      shift.id !== id &&
      shift.staffId === input.staffId &&
      shift.status === "scheduled" &&
      input.status !== "cancelled" &&
      shiftsOverlap(shift, input),
  );
  if (conflict) {
    return err(["This staff member already has an overlapping shift."]);
  }
  return ok({
    ...store,
    shifts: store.shifts.map((shift) =>
      shift.id === id
        ? {
            ...shift,
            staffId: input.staffId,
            date: input.date,
            startTime: input.startTime,
            endTime: input.endTime,
            role: input.role,
            notes: input.notes,
            status: input.status ?? shift.status,
          }
        : shift,
    ),
  });
}

export function cancelStaffShift(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  if (!store.shifts.some((shift) => shift.id === id)) {
    return err(["Shift not found."]);
  }
  return ok({
    ...store,
    shifts: store.shifts.map((shift) =>
      shift.id === id ? { ...shift, status: "cancelled" } : shift,
    ),
  });
}
