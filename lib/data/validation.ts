import type {
  CreateOrderInput,
  CustomerInput,
  MenuItemInput,
  OrderItem,
  OrderType,
  ReservationInput,
  TableInput,
} from "@/lib/types";

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

function fail(errors: string[]): ValidationResult {
  return { ok: false, errors: errors.filter(Boolean) };
}

export function validateMenuItem(
  input: Partial<MenuItemInput>,
  categoryIds: string[],
): ValidationResult {
  const errors: string[] = [];
  if (!input.name?.trim()) errors.push("Name is required.");
  if (!input.description?.trim()) errors.push("Description is required.");
  if (!input.categoryId || !categoryIds.includes(input.categoryId)) {
    errors.push("A valid category is required.");
  }
  if (input.price == null || Number.isNaN(Number(input.price)) || Number(input.price) < 0) {
    errors.push("Price must be zero or greater.");
  }
  if (
    input.prepTimeMinutes == null ||
    Number.isNaN(Number(input.prepTimeMinutes)) ||
    Number(input.prepTimeMinutes) < 0
  ) {
    errors.push("Preparation time must be zero or greater.");
  }
  if (!input.image?.trim()) errors.push("Image URL is required.");
  return errors.length ? fail(errors) : { ok: true };
}

export function validateCategory(input: {
  name?: string;
  description?: string;
  image?: string;
}): ValidationResult {
  const errors: string[] = [];
  if (!input.name?.trim()) errors.push("Category name is required.");
  if (!input.description?.trim()) errors.push("Description is required.");
  if (!input.image?.trim()) errors.push("Image URL is required.");
  return errors.length ? fail(errors) : { ok: true };
}

export function validateCustomer(input: Partial<CustomerInput>): ValidationResult {
  const errors: string[] = [];
  if (!input.name?.trim()) errors.push("Full name is required.");
  if (!input.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.push("A valid email is required.");
  }
  if (!input.phone?.trim()) errors.push("Phone is required.");
  return errors.length ? fail(errors) : { ok: true };
}

export function validateTable(input: Partial<TableInput>): ValidationResult {
  const errors: string[] = [];
  if (!input.number?.trim()) errors.push("Table number/name is required.");
  if (
    input.capacity == null ||
    Number.isNaN(Number(input.capacity)) ||
    Number(input.capacity) < 1
  ) {
    errors.push("Capacity must be at least 1.");
  }
  if (!input.section?.trim()) errors.push("Section/location is required.");
  if (!input.status) errors.push("Status is required.");
  return errors.length ? fail(errors) : { ok: true };
}

export function validateReservation(
  input: Partial<ReservationInput>,
): ValidationResult {
  const errors: string[] = [];
  if (!input.guestName?.trim()) errors.push("Guest name is required.");
  if (!input.phone?.trim()) errors.push("Phone is required.");
  if (!input.date) errors.push("Date is required.");
  if (!input.time) errors.push("Time is required.");
  if (
    input.partySize == null ||
    Number.isNaN(Number(input.partySize)) ||
    Number(input.partySize) < 1
  ) {
    errors.push("Guest count must be at least 1.");
  }
  return errors.length ? fail(errors) : { ok: true };
}

export function validateOrderItems(items: OrderItem[]): ValidationResult {
  const errors: string[] = [];
  if (!items.length) errors.push("Add at least one menu item.");
  for (const item of items) {
    if (!item.menuItemId) errors.push("Each line needs a menu item.");
    if (!item.name?.trim()) errors.push("Item name snapshot is required.");
    if (item.quantity < 1) errors.push(`Invalid quantity for ${item.name || "item"}.`);
    if (item.price < 0) errors.push(`Invalid price for ${item.name || "item"}.`);
  }
  return errors.length ? fail(errors) : { ok: true };
}

export function validateCreateOrder(
  input: CreateOrderInput,
  availableItemIds: Set<string>,
): ValidationResult {
  const errors: string[] = [];
  if (!input.customerName?.trim()) errors.push("Customer name is required.");
  if (!input.type) errors.push("Order type is required.");
  if (input.type === "dine-in" && !input.tableId) {
    errors.push("Select a table for dine-in orders.");
  }
  if (input.discount != null && input.discount < 0) {
    errors.push("Discount cannot be negative.");
  }
  const itemResult = validateOrderItems(input.items);
  if (!itemResult.ok) errors.push(...itemResult.errors);
  for (const item of input.items) {
    if (!availableItemIds.has(item.menuItemId)) {
      errors.push(`${item.name} is unavailable.`);
    }
  }
  return errors.length ? fail(errors) : { ok: true };
}

export function isActiveOrderStatus(status: string) {
  return ["pending", "confirmed", "preparing", "ready", "served"].includes(status);
}

export function isActiveReservationStatus(status: string) {
  return ["pending", "confirmed", "seated"].includes(status);
}

export function requiresTable(type: OrderType) {
  return type === "dine-in";
}
