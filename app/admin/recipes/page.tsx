"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { calcMargin, calcRecipeCost } from "@/lib/data/stock";
import type { MenuItem, RecipeIngredient } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type RecipeRow = {
  id: string;
  menuItem: MenuItem;
  cost: number;
  margin: number;
  ingredientCount: number;
  hasRecipe: boolean;
};

type IngredientDraft = {
  inventoryItemId: string;
  quantityPerServing: string;
};

const LOW_MARGIN = 30;

export default function AdminRecipesPage() {
  const { hydrated, store, saveRecipe, deleteRecipe } = useData();

  const [query, setQuery] = useState("");
  const [marginFilter, setMarginFilter] = useState<
    "all" | "low" | "negative" | "missing"
  >("all");
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteMenuItemId, setDeleteMenuItemId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string[]>([]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const mapped: RecipeRow[] = store.menuItems.map((menuItem) => {
      const recipe = store.recipes.find(
        (entry) => entry.menuItemId === menuItem.id,
      );
      const cost = calcRecipeCost(recipe, store.inventory);
      const margin = calcMargin(menuItem.price, cost);
      return {
        id: menuItem.id,
        menuItem,
        cost,
        margin,
        ingredientCount: recipe?.ingredients.length ?? 0,
        hasRecipe: Boolean(recipe),
      };
    });

    return mapped.filter((row) => {
      const matchesQuery =
        !q ||
        row.menuItem.name.toLowerCase().includes(q) ||
        row.menuItem.id.toLowerCase().includes(q);
      const matchesMargin =
        marginFilter === "all" ||
        (marginFilter === "missing" && !row.hasRecipe) ||
        (marginFilter === "negative" && row.hasRecipe && row.margin < 0) ||
        (marginFilter === "low" &&
          row.hasRecipe &&
          row.margin >= 0 &&
          row.margin < LOW_MARGIN);
      return matchesQuery && matchesMargin;
    });
  }, [marginFilter, query, store.inventory, store.menuItems, store.recipes]);

  const stats = useMemo(() => {
    const withRecipe = store.menuItems.filter((item) =>
      store.recipes.some((recipe) => recipe.menuItemId === item.id),
    ).length;
    const low = store.menuItems.filter((item) => {
      const recipe = store.recipes.find((entry) => entry.menuItemId === item.id);
      if (!recipe) return false;
      const margin = calcMargin(
        item.price,
        calcRecipeCost(recipe, store.inventory),
      );
      return margin < LOW_MARGIN;
    }).length;
    return {
      withRecipe,
      missing: store.menuItems.length - withRecipe,
      low,
    };
  }, [store.inventory, store.menuItems, store.recipes]);

  function openEditor(menuItem: MenuItem) {
    const recipe = store.recipes.find(
      (entry) => entry.menuItemId === menuItem.id,
    );
    setEditingItem(menuItem);
    setIngredients(
      recipe?.ingredients.map((ingredient) => ({
        inventoryItemId: ingredient.inventoryItemId,
        quantityPerServing: String(ingredient.quantityPerServing),
      })) ?? [
        {
          inventoryItemId: store.inventory[0]?.id ?? "",
          quantityPerServing: "1",
        },
      ],
    );
    setErrors([]);
    setOpen(true);
  }

  function addIngredientRow() {
    setIngredients((prev) => [
      ...prev,
      {
        inventoryItemId: store.inventory[0]?.id ?? "",
        quantityPerServing: "1",
      },
    ]);
  }

  function updateIngredient(
    index: number,
    patch: Partial<IngredientDraft>,
  ) {
    setIngredients((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function draftCost() {
    const recipeIngredients: RecipeIngredient[] = ingredients
      .filter((row) => row.inventoryItemId)
      .map((row) => ({
        inventoryItemId: row.inventoryItemId,
        quantityPerServing: Number(row.quantityPerServing) || 0,
      }));
    return calcRecipeCost(
      {
        id: "draft",
        menuItemId: editingItem?.id ?? "",
        ingredients: recipeIngredients,
        updatedAt: "",
      },
      store.inventory,
    );
  }

  function submit() {
    if (!editingItem) return;
    const payload = {
      menuItemId: editingItem.id,
      ingredients: ingredients
        .filter((row) => row.inventoryItemId)
        .map((row) => ({
          inventoryItemId: row.inventoryItemId,
          quantityPerServing: Number(row.quantityPerServing),
        })),
    };
    const result = saveRecipe(payload);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setOpen(false);
  }

  const columns: Column<RecipeRow>[] = [
    {
      key: "dish",
      header: "Menu item",
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{row.menuItem.name}</p>
          <p className="text-xs text-muted">
            Sell {formatCurrency(row.menuItem.price)}
            {row.hasRecipe
              ? ` · ${row.ingredientCount} ingredient${row.ingredientCount === 1 ? "" : "s"}`
              : " · no recipe"}
          </p>
        </div>
      ),
    },
    {
      key: "cost",
      header: "Recipe cost",
      render: (row) =>
        row.hasRecipe ? (
          formatCurrency(row.cost)
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "price",
      header: "Selling price",
      render: (row) => formatCurrency(row.menuItem.price),
    },
    {
      key: "margin",
      header: "Margin",
      render: (row) => {
        if (!row.hasRecipe) {
          return <Badge tone="default">No recipe</Badge>;
        }
        const tone =
          row.margin < 0
            ? "danger"
            : row.margin < LOW_MARGIN
              ? "warning"
              : "success";
        return (
          <span
            className={cn(
              "font-medium",
              row.margin < 0 && "text-danger",
              row.margin >= 0 && row.margin < LOW_MARGIN && "text-orange",
              row.margin >= LOW_MARGIN && "text-success",
            )}
          >
            <Badge tone={tone}>{row.margin.toFixed(1)}%</Badge>
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditor(row.menuItem)}
            title="Edit recipe"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {row.hasRecipe ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPageError([]);
                setDeleteMenuItemId(row.menuItem.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading recipes..." />;

  const previewCost = editingItem ? draftCost() : 0;
  const previewMargin = editingItem
    ? calcMargin(editingItem.price, previewCost)
    : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {pageError.length ? (
        <Alert>
          <ul className="list-disc pl-4">
            {pageError.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-navy/10 p-4">
          <p className="text-sm text-muted">Recipes linked</p>
          <p className="mt-1 font-display text-2xl text-navy">
            {stats.withRecipe}
          </p>
        </Card>
        <Card className="border-navy/10 p-4">
          <p className="text-sm text-muted">Missing recipes</p>
          <p className="mt-1 font-display text-2xl text-navy">{stats.missing}</p>
        </Card>
        <Card className="border-orange/20 bg-orange/5 p-4">
          <p className="text-sm text-muted">Low / negative margin</p>
          <p className="mt-1 font-display text-2xl text-orange">{stats.low}</p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recipes & margins"
          description="Ingredient cost vs selling price — menu prices stay unchanged here"
          action={
            <div className="flex items-center gap-2 text-sm text-muted">
              <BookOpen className="h-4 w-4 text-orange" />
              Costed from inventory
            </div>
          }
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search menu items..."
            />
            <Select
              value={marginFilter}
              onChange={(event) =>
                setMarginFilter(
                  event.target.value as
                    | "all"
                    | "low"
                    | "negative"
                    | "missing",
                )
              }
            >
              <option value="all">All items</option>
              <option value="missing">Missing recipe</option>
              <option value="low">Low margin (&lt; {LOW_MARGIN}%)</option>
              <option value="negative">Negative margin</option>
            </Select>
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No menu items match"
          />
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          editingItem
            ? `Recipe · ${editingItem.name}`
            : "Edit recipe"
        }
        className="max-w-2xl"
      >
        {editingItem ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-navy/10 bg-navy/[0.02] p-3 text-sm">
              <p className="text-muted">
                Selling price{" "}
                <span className="font-medium text-navy">
                  {formatCurrency(editingItem.price)}
                </span>{" "}
                (read-only)
              </p>
              <p className="mt-1">
                Recipe cost{" "}
                <span className="font-medium text-navy">
                  {formatCurrency(previewCost)}
                </span>
                {" · "}
                Margin{" "}
                <span
                  className={cn(
                    "font-medium",
                    previewMargin < 0
                      ? "text-danger"
                      : previewMargin < LOW_MARGIN
                        ? "text-orange"
                        : "text-success",
                  )}
                >
                  {previewMargin.toFixed(1)}%
                </span>
              </p>
            </div>

            <div className="space-y-3">
              {ingredients.map((row, index) => {
                const inv = store.inventory.find(
                  (item) => item.id === row.inventoryItemId,
                );
                return (
                  <div
                    key={`${row.inventoryItemId}-${index}`}
                    className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_120px_auto]"
                  >
                    <Field label="Inventory item">
                      <Select
                        value={row.inventoryItemId}
                        onChange={(event) =>
                          updateIngredient(index, {
                            inventoryItemId: event.target.value,
                          })
                        }
                      >
                        <option value="">Select item</option>
                        {store.inventory.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label={`Qty / serving${inv ? ` (${inv.unit})` : ""}`}>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.quantityPerServing}
                        onChange={(event) =>
                          updateIngredient(index, {
                            quantityPerServing: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIngredient(index)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button variant="outline" onClick={addIngredientRow}>
              <Plus className="h-4 w-4" />
              Add ingredient
            </Button>

            {errors.length ? (
              <Alert>
                <ul className="list-disc pl-4">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit}>Save recipe</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteMenuItemId)}
        title="Delete recipe?"
        description="Ingredient links for this menu item will be removed. The menu price is not changed."
        confirmLabel="Delete recipe"
        danger
        onClose={() => setDeleteMenuItemId(null)}
        onConfirm={() => {
          if (!deleteMenuItemId) return;
          const result = deleteRecipe(deleteMenuItemId);
          if (!result.ok) setPageError(result.errors);
        }}
      />
    </div>
  );
}
