"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  inventoryValue,
  isLowStock,
  isOutOfStock,
} from "@/lib/data/stock";
import type { InventoryItem, StockMovement } from "@/lib/types";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/utils";
import {
  AlertTriangle,
  ArrowDownUp,
  History,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

const EMPTY_FORM = {
  name: "",
  sku: "",
  category: "General",
  quantity: "0",
  unit: "units",
  reorderLevel: "0",
  supplierId: "",
  costPerUnit: "0",
  lastRestocked: "",
};

type MovementType = "received" | "adjustment" | "reduction" | "wastage";

const MOVEMENT_TYPES: MovementType[] = [
  "received",
  "adjustment",
  "reduction",
  "wastage",
];

export default function AdminInventoryPage() {
  const {
    hydrated,
    store,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    recordStockMovement,
  } = useData();

  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string[]>([]);
  const [moveItem, setMoveItem] = useState<InventoryItem | null>(null);
  const [moveForm, setMoveForm] = useState({
    type: "received" as MovementType,
    quantity: "",
    reason: "",
    allowNegative: false,
  });
  const [moveErrors, setMoveErrors] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(store.inventory.map((item) => item.category)),
      ).sort(),
    [store.inventory],
  );

  const supplierName = (id: string) =>
    store.suppliers.find((supplier) => supplier.id === id)?.name ?? "—";

  const lowCount = store.inventory.filter(isLowStock).length;
  const outCount = store.inventory.filter(isOutOfStock).length;
  const totalValue = inventoryValue(store.inventory);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.inventory.filter((item) => {
      const supplier =
        store.suppliers.find((entry) => entry.id === item.supplierId)?.name ??
        "";
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && isLowStock(item)) ||
        (stockFilter === "out" && isOutOfStock(item));
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        supplier.toLowerCase().includes(q);
      return matchesCategory && matchesStock && matchesQuery;
    });
  }, [categoryFilter, query, stockFilter, store.inventory, store.suppliers]);

  const movements = useMemo(
    () =>
      [...store.stockMovements].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [store.stockMovements],
  );

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      supplierId: store.suppliers[0]?.id ?? "",
      lastRestocked: new Date().toISOString().slice(0, 10),
    });
    setErrors([]);
    setOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      reorderLevel: String(item.reorderLevel),
      supplierId: item.supplierId,
      costPerUnit: String(item.costPerUnit),
      lastRestocked: item.lastRestocked,
    });
    setErrors([]);
    setOpen(true);
  }

  function submit() {
    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.category,
      quantity: Number(form.quantity),
      unit: form.unit,
      reorderLevel: Number(form.reorderLevel),
      supplierId: form.supplierId,
      costPerUnit: Number(form.costPerUnit),
      lastRestocked: form.lastRestocked,
    };
    const result = editing
      ? updateInventoryItem(editing.id, payload)
      : addInventoryItem(payload);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setOpen(false);
  }

  function openMove(item: InventoryItem) {
    setMoveItem(item);
    setMoveForm({
      type: "received",
      quantity: "",
      reason: "",
      allowNegative: false,
    });
    setMoveErrors([]);
  }

  function submitMove() {
    if (!moveItem) return;
    const quantity = Number(moveForm.quantity);
    if (!quantity || Number.isNaN(quantity)) {
      setMoveErrors(["Enter a valid quantity."]);
      return;
    }
    const result = recordStockMovement({
      inventoryItemId: moveItem.id,
      type: moveForm.type,
      quantity,
      reason: moveForm.reason,
      allowNegative: moveForm.allowNegative,
    });
    if (!result.ok) {
      setMoveErrors(result.errors);
      return;
    }
    setMoveItem(null);
  }

  const columns: Column<InventoryItem>[] = [
    {
      key: "item",
      header: "Item",
      render: (row) => {
        const low = isLowStock(row);
        const out = isOutOfStock(row);
        return (
          <div className="flex items-center gap-2">
            <div>
              <p
                className={cn(
                  "font-medium",
                  out || low ? "text-danger" : "text-navy",
                )}
              >
                {row.name}
              </p>
              <p className="text-xs text-muted">{row.sku}</p>
            </div>
            {out || low ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
            ) : null}
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Category",
      render: (row) => row.category,
    },
    {
      key: "qty",
      header: "Quantity",
      render: (row) => (
        <span
          className={cn(
            "font-medium",
            (isLowStock(row) || isOutOfStock(row)) && "text-danger",
          )}
        >
          {row.quantity} {row.unit}
        </span>
      ),
    },
    {
      key: "reorder",
      header: "Reorder at",
      render: (row) => `${row.reorderLevel} ${row.unit}`,
    },
    {
      key: "value",
      header: "Line value",
      render: (row) => formatCurrency(row.quantity * row.costPerUnit),
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (row) => supplierName(row.supplierId),
    },
    {
      key: "cost",
      header: "Unit cost",
      render: (row) => formatCurrency(row.costPerUnit),
    },
    {
      key: "restocked",
      header: "Last restocked",
      render: (row) => formatDate(row.lastRestocked),
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        isOutOfStock(row) ? (
          <Badge tone="danger">Out of stock</Badge>
        ) : isLowStock(row) ? (
          <Badge tone="danger">Low stock</Badge>
        ) : (
          <Badge tone="success">Healthy</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="Stock movement"
            onClick={() => openMove(row)}
          >
            <ArrowDownUp className="h-4 w-4 text-orange" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPageError([]);
              setDeleteId(row.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  const movementColumns: Column<StockMovement>[] = [
    {
      key: "when",
      header: "When",
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      key: "item",
      header: "Item",
      render: (row) => {
        const item = store.inventory.find(
          (entry) => entry.id === row.inventoryItemId,
        );
        return item?.name ?? row.inventoryItemId;
      },
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <Badge
          tone={
            row.direction === "in"
              ? "success"
              : row.type === "wastage"
                ? "danger"
                : "warning"
          }
        >
          {row.type}
        </Badge>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      render: (row) => (
        <span className={row.direction === "in" ? "text-success" : "text-danger"}>
          {row.direction === "in" ? "+" : "−"}
          {row.quantity}
        </span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      render: (row) => `${row.previousStock} → ${row.updatedStock}`,
    },
    {
      key: "reason",
      header: "Reason",
      render: (row) => row.reason || "—",
    },
  ];

  if (!hydrated) return <LoadingState label="Loading inventory..." />;

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-navy/10 p-4">
          <p className="text-sm text-muted">Stock value</p>
          <p className="mt-1 font-display text-2xl text-navy">
            {formatCurrency(totalValue)}
          </p>
        </Card>
        <Card className="border-navy/10 p-4">
          <p className="text-sm text-muted">SKUs</p>
          <p className="mt-1 font-display text-2xl text-navy">
            {store.inventory.length}
          </p>
        </Card>
        <Card className="border-orange/20 bg-orange/5 p-4">
          <p className="text-sm text-muted">Low stock</p>
          <p className="mt-1 font-display text-2xl text-orange">{lowCount}</p>
        </Card>
        <Card className="border-red-200 bg-red-50/50 p-4">
          <p className="text-sm text-muted">Out of stock</p>
          <p className="mt-1 font-display text-2xl text-danger">{outCount}</p>
        </Card>
      </div>

      {lowCount + outCount > 0 ? (
        <Card className="border-red-200 bg-red-50/60">
          <CardBody className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <div>
              <p className="font-medium text-danger">
                {outCount} out · {lowCount} low — restock before service peaks
              </p>
              <p className="text-sm text-danger/80">
                Use stock movements to receive inventory or record wastage.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Inventory"
          description="Stock levels, reorder thresholds, and supplier links"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory((value) => !value)}
              >
                <History className="h-4 w-4" />
                {showHistory ? "Hide history" : "Show history"}
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
          }
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search name, SKU, category, supplier..."
            />
            <Select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Select
              value={stockFilter}
              onChange={(event) =>
                setStockFilter(event.target.value as "all" | "low" | "out")
              }
            >
              <option value="all">All stock levels</option>
              <option value="low">Low stock only</option>
              <option value="out">Out of stock only</option>
            </Select>
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No inventory items"
          />
        </CardBody>
      </Card>

      {showHistory ? (
        <Card>
          <CardHeader
            title="Stock movements"
            description="Received, adjustments, reductions, wastage, and order deductions"
            action={
              <div className="flex items-center gap-2 text-sm text-muted">
                <Package className="h-4 w-4 text-orange" />
                {movements.length} recorded
              </div>
            }
          />
          <CardBody>
            <DataTable
              columns={movementColumns}
              rows={movements.slice(0, 40)}
              emptyTitle="No stock movements yet"
            />
          </CardBody>
        </Card>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit inventory item" : "Add inventory item"}
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU">
              <Input
                value={form.sku}
                onChange={(event) =>
                  setForm({ ...form, sku: event.target.value })
                }
                placeholder="Auto if blank"
              />
            </Field>
            <Field label="Category">
              <Input
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                list="inv-categories"
              />
              <datalist id="inv-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={editing ? "Quantity (view)" : "Opening quantity"}>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.quantity}
                disabled={Boolean(editing)}
                onChange={(event) =>
                  setForm({ ...form, quantity: event.target.value })
                }
              />
            </Field>
            <Field label="Unit">
              <Input
                value={form.unit}
                onChange={(event) =>
                  setForm({ ...form, unit: event.target.value })
                }
              />
            </Field>
          </div>
          {editing ? (
            <p className="text-xs text-muted">
              Change stock with a stock movement — not by editing quantity.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reorder level">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.reorderLevel}
                onChange={(event) =>
                  setForm({ ...form, reorderLevel: event.target.value })
                }
              />
            </Field>
            <Field label="Cost per unit">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.costPerUnit}
                onChange={(event) =>
                  setForm({ ...form, costPerUnit: event.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Supplier">
            <Select
              value={form.supplierId}
              onChange={(event) =>
                setForm({ ...form, supplierId: event.target.value })
              }
            >
              <option value="">No supplier</option>
              {store.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Last restocked">
            <Input
              type="date"
              value={form.lastRestocked}
              onChange={(event) =>
                setForm({ ...form, lastRestocked: event.target.value })
              }
            />
          </Field>
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
            <Button onClick={submit}>
              {editing ? "Save changes" : "Create item"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(moveItem)}
        onClose={() => setMoveItem(null)}
        title={
          moveItem
            ? `Stock movement · ${moveItem.name}`
            : "Stock movement"
        }
      >
        {moveItem ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              On hand:{" "}
              <span className="font-medium text-navy">
                {moveItem.quantity} {moveItem.unit}
              </span>
            </p>
            <Field label="Type">
              <Select
                value={moveForm.type}
                onChange={(event) =>
                  setMoveForm({
                    ...moveForm,
                    type: event.target.value as MovementType,
                  })
                }
              >
                {MOVEMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={
                moveForm.type === "adjustment"
                  ? "Quantity (positive = in, negative = out)"
                  : "Quantity"
              }
            >
              <Input
                type="number"
                step="0.01"
                value={moveForm.quantity}
                onChange={(event) =>
                  setMoveForm({ ...moveForm, quantity: event.target.value })
                }
              />
            </Field>
            <Field label="Reason">
              <Textarea
                value={moveForm.reason}
                onChange={(event) =>
                  setMoveForm({ ...moveForm, reason: event.target.value })
                }
                placeholder="Delivery note, spoilage, count correction..."
              />
            </Field>
            {moveForm.type === "adjustment" ? (
              <label className="inline-flex items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  checked={moveForm.allowNegative}
                  onChange={(event) =>
                    setMoveForm({
                      ...moveForm,
                      allowNegative: event.target.checked,
                    })
                  }
                  className="rounded border-border text-orange focus:ring-orange"
                />
                Allow negative stock
              </label>
            ) : null}
            {moveErrors.length ? (
              <Alert>
                <ul className="list-disc pl-4">
                  {moveErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMoveItem(null)}>
                Cancel
              </Button>
              <Button onClick={submitMove}>Record movement</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete inventory item?"
        description="This cannot be undone. Items linked to recipes cannot be deleted."
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          const result = deleteInventoryItem(deleteId);
          if (!result.ok) setPageError(result.errors);
        }}
      />
    </div>
  );
}
