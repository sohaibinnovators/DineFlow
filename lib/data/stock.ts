import type {
  DineFlowStore,
  InventoryItem,
  Order,
  Recipe,
  StockMovement,
} from "@/lib/types";
import { createId, nowIso } from "./ids";
import { roundMoney } from "./calculations";

export function calcRecipeCost(
  recipe: Recipe | undefined,
  inventory: InventoryItem[],
) {
  if (!recipe) return 0;
  return roundMoney(
    recipe.ingredients.reduce((sum, ingredient) => {
      const item = inventory.find(
        (entry) => entry.id === ingredient.inventoryItemId,
      );
      if (!item) return sum;
      return sum + item.costPerUnit * ingredient.quantityPerServing;
    }, 0),
  );
}

export function calcMargin(price: number, cost: number) {
  if (price <= 0) return 0;
  return roundMoney(((price - cost) / price) * 100);
}

export function inventoryValue(inventory: InventoryItem[]) {
  return roundMoney(
    inventory.reduce(
      (sum, item) => sum + item.quantity * item.costPerUnit,
      0,
    ),
  );
}

export function isLowStock(item: InventoryItem) {
  return item.quantity > 0 && item.quantity <= item.reorderLevel;
}

export function isOutOfStock(item: InventoryItem) {
  return item.quantity <= 0;
}

type Requirement = {
  inventoryItemId: string;
  quantity: number;
  name: string;
};

export function calcOrderIngredientRequirements(
  order: Order,
  recipes: Recipe[],
  inventory: InventoryItem[],
): Requirement[] {
  const totals = new Map<string, number>();

  for (const line of order.items) {
    const recipe = recipes.find((entry) => entry.menuItemId === line.menuItemId);
    if (!recipe) continue;
    for (const ingredient of recipe.ingredients) {
      const needed =
        ingredient.quantityPerServing * Math.max(1, line.quantity);
      totals.set(
        ingredient.inventoryItemId,
        (totals.get(ingredient.inventoryItemId) ?? 0) + needed,
      );
    }
  }

  return [...totals.entries()].map(([inventoryItemId, quantity]) => {
    const item = inventory.find((entry) => entry.id === inventoryItemId);
    return {
      inventoryItemId,
      quantity: roundMoney(quantity),
      name: item?.name ?? inventoryItemId,
    };
  });
}

export function applyStockMovement(
  store: DineFlowStore,
  input: {
    inventoryItemId: string;
    type: StockMovement["type"];
    quantity: number;
    direction: "in" | "out";
    reason: string;
    orderId?: string;
    allowNegative?: boolean;
  },
):
  | { ok: true; store: DineFlowStore; movement: StockMovement }
  | { ok: false; errors: string[] } {
  const item = store.inventory.find(
    (entry) => entry.id === input.inventoryItemId,
  );
  if (!item) return { ok: false, errors: ["Inventory item not found."] };
  if (input.quantity <= 0) {
    return { ok: false, errors: ["Quantity must be greater than zero."] };
  }

  const delta = input.direction === "in" ? input.quantity : -input.quantity;
  const updatedStock = roundMoney(item.quantity + delta);
  if (updatedStock < 0 && !input.allowNegative) {
    return {
      ok: false,
      errors: [
        `Insufficient stock for ${item.name}. Available ${item.quantity} ${item.unit}.`,
      ],
    };
  }

  const movement: StockMovement = {
    id: createId("mov"),
    inventoryItemId: item.id,
    type: input.type,
    quantity: input.quantity,
    direction: input.direction,
    previousStock: item.quantity,
    updatedStock,
    reason: input.reason,
    orderId: input.orderId,
    createdAt: nowIso(),
  };

  return {
    ok: true,
    movement,
    store: {
      ...store,
      inventory: store.inventory.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              quantity: updatedStock,
              updatedAt: nowIso(),
              lastRestocked:
                input.type === "received" ? nowIso().slice(0, 10) : entry.lastRestocked,
            }
          : entry,
      ),
      stockMovements: [movement, ...store.stockMovements],
    },
  };
}

export function deductOrderStock(store: DineFlowStore, orderId: string) {
  const order = store.orders.find((entry) => entry.id === orderId);
  if (!order) return { ok: false as const, errors: ["Order not found."] };
  if (order.stockDeducted) {
    return { ok: true as const, store, skipped: true as const };
  }
  if (order.status === "cancelled") {
    return {
      ok: false as const,
      errors: ["Cancelled orders do not deduct stock."],
    };
  }

  const requirements = calcOrderIngredientRequirements(
    order,
    store.recipes,
    store.inventory,
  );
  if (!requirements.length) {
    return {
      ok: true as const,
      store: {
        ...store,
        orders: store.orders.map((entry) =>
          entry.id === orderId
            ? { ...entry, stockDeducted: true, stockMovementIds: [] }
            : entry,
        ),
      },
      skipped: true as const,
    };
  }

  let next = store;
  const movementIds: string[] = [];
  const warnings: string[] = [];

  for (const requirement of requirements) {
    const result = applyStockMovement(next, {
      inventoryItemId: requirement.inventoryItemId,
      type: "order-deduction",
      quantity: requirement.quantity,
      direction: "out",
      reason: `Order ${order.orderNumber} completed`,
      orderId: order.id,
      allowNegative: false,
    });
    if (!result.ok) {
      warnings.push(...result.errors);
      // Continue attempting remaining items? Spec says clear warnings for insufficient.
      // Better to abort entirely to avoid partial deduction.
      return { ok: false as const, errors: warnings };
    }
    next = result.store;
    movementIds.push(result.movement.id);
  }

  next = {
    ...next,
    orders: next.orders.map((entry) =>
      entry.id === orderId
        ? {
            ...entry,
            stockDeducted: true,
            stockMovementIds: movementIds,
          }
        : entry,
    ),
  };

  return { ok: true as const, store: next, skipped: false as const, warnings };
}

export function reverseOrderStock(store: DineFlowStore, orderId: string) {
  const order = store.orders.find((entry) => entry.id === orderId);
  if (!order) return { ok: false as const, errors: ["Order not found."] };
  if (!order.stockDeducted) {
    return { ok: true as const, store, skipped: true as const };
  }

  const related = store.stockMovements.filter(
    (movement) =>
      movement.orderId === orderId && movement.type === "order-deduction",
  );

  let next = store;
  for (const movement of related) {
    const result = applyStockMovement(next, {
      inventoryItemId: movement.inventoryItemId,
      type: "order-reversal",
      quantity: movement.quantity,
      direction: "in",
      reason: `Reversal for order ${order.orderNumber}`,
      orderId: order.id,
      allowNegative: true,
    });
    if (!result.ok) return result;
    next = result.store;
  }

  next = {
    ...next,
    orders: next.orders.map((entry) =>
      entry.id === orderId
        ? { ...entry, stockDeducted: false, stockMovementIds: [] }
        : entry,
    ),
  };

  return { ok: true as const, store: next, skipped: false as const };
}
