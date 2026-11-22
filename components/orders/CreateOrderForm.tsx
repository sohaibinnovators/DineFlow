"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { calcOrderTotals } from "@/lib/data/calculations";
import type { CreateOrderInput, OrderItem, OrderType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type LineDraft = {
  menuItemId: string;
  quantity: number;
};

const EMPTY_CUSTOMER = {
  customerId: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
};

export function CreateOrderForm({
  assignedStaffId,
  submitLabel = "Create order",
  onSuccess,
  onCancel,
}: {
  assignedStaffId?: string;
  submitLabel?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { store, createOrder } = useData();
  const availableItems = useMemo(
    () => store.menuItems.filter((item) => item.available),
    [store.menuItems],
  );
  const availableTables = useMemo(
    () => store.tables.filter((table) => table.status === "available"),
    [store.tables],
  );

  const [type, setType] = useState<OrderType>("dine-in");
  const [tableId, setTableId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [lines, setLines] = useState<LineDraft[]>([
    { menuItemId: availableItems[0]?.id ?? "", quantity: 1 },
  ]);
  const [pickItemId, setPickItemId] = useState(availableItems[0]?.id ?? "");
  const [errors, setErrors] = useState<string[]>([]);

  const snapshotItems: OrderItem[] = useMemo(
    () =>
      lines
        .filter((line) => line.menuItemId)
        .map((line) => {
          const menuItem = store.menuItems.find(
            (item) => item.id === line.menuItemId,
          );
          return {
            menuItemId: line.menuItemId,
            name: menuItem?.name ?? "Item",
            quantity: line.quantity,
            price: menuItem?.price ?? 0,
          };
        }),
    [lines, store.menuItems],
  );

  const totals = useMemo(
    () => calcOrderTotals(snapshotItems, Number(discount) || 0),
    [discount, snapshotItems],
  );

  function selectCustomer(id: string) {
    if (!id) {
      setCustomer(EMPTY_CUSTOMER);
      return;
    }
    const match = store.customers.find((entry) => entry.id === id);
    if (!match) return;
    setCustomer({
      customerId: match.id,
      customerName: match.name,
      customerEmail: match.email,
      customerPhone: match.phone,
    });
  }

  function addLine() {
    if (!pickItemId) return;
    setLines((current) => {
      const existing = current.find((line) => line.menuItemId === pickItemId);
      if (existing) {
        return current.map((line) =>
          line.menuItemId === pickItemId
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...current, { menuItemId: pickItemId, quantity: 1 }];
    });
  }

  function updateQty(menuItemId: string, quantity: number) {
    setLines((current) =>
      current.map((line) =>
        line.menuItemId === menuItemId
          ? { ...line, quantity: Math.max(1, quantity) }
          : line,
      ),
    );
  }

  function removeLine(menuItemId: string) {
    setLines((current) => current.filter((line) => line.menuItemId !== menuItemId));
  }

  function submit() {
    const payload: CreateOrderInput = {
      customerId: customer.customerId || undefined,
      customerName: customer.customerName,
      customerEmail: customer.customerEmail || undefined,
      customerPhone: customer.customerPhone || undefined,
      type,
      tableId: type === "dine-in" ? tableId || undefined : undefined,
      items: snapshotItems,
      discount: Number(discount) || 0,
      assignedStaffId,
    };
    const result = createOrder(payload);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    onSuccess?.();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Order type">
          <Select
            value={type}
            onChange={(event) => {
              setType(event.target.value as OrderType);
              if (event.target.value !== "dine-in") setTableId("");
            }}
          >
            <option value="dine-in">Dine-in</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </Select>
        </Field>
        {type === "dine-in" ? (
          <Field label="Table">
            <Select
              value={tableId}
              onChange={(event) => setTableId(event.target.value)}
            >
              <option value="">Select available table</option>
              {availableTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.number} · {table.section} (seats {table.capacity})
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Table">
            <Input value="Not required" disabled />
          </Field>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Existing customer" className="sm:col-span-2">
          <Select
            value={customer.customerId}
            onChange={(event) => selectCustomer(event.target.value)}
          >
            <option value="">Walk-in / new guest</option>
            {store.customers.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} · {entry.email}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Customer name">
          <Input
            value={customer.customerName}
            onChange={(event) =>
              setCustomer({ ...customer, customerName: event.target.value })
            }
          />
        </Field>
        <Field label="Phone">
          <Input
            value={customer.customerPhone}
            onChange={(event) =>
              setCustomer({ ...customer, customerPhone: event.target.value })
            }
          />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input
            type="email"
            value={customer.customerEmail}
            onChange={(event) =>
              setCustomer({ ...customer, customerEmail: event.target.value })
            }
          />
        </Field>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-3">
        <p className="text-sm font-medium text-navy">Menu items</p>
        <div className="flex flex-wrap gap-2">
          <Select
            className="min-w-[12rem] flex-1"
            value={pickItemId}
            onChange={(event) => setPickItemId(event.target.value)}
          >
            {availableItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {formatCurrency(item.price)}
              </option>
            ))}
          </Select>
          <Button type="button" variant="outline" onClick={addLine}>
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        </div>
        {snapshotItems.length === 0 ? (
          <p className="text-sm text-muted">No items yet. Add at least one dish.</p>
        ) : (
          <ul className="space-y-2">
            {snapshotItems.map((item) => (
              <li
                key={item.menuItemId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-navy">{item.name}</p>
                  <p className="text-xs text-muted">
                    {formatCurrency(item.price)} each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={item.quantity}
                    onChange={(event) =>
                      updateQty(item.menuItemId, Number(event.target.value) || 1)
                    }
                  />
                  <span className="w-20 text-right text-sm text-navy">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(item.menuItemId)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Demo discount ($)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
          />
        </Field>
        <div className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted">Subtotal</span>
            <span className="text-navy">{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <span className="text-muted">Discount</span>
            <span className="text-navy">−{formatCurrency(totals.discount)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <span className="text-muted">Tax</span>
            <span className="text-navy">{formatCurrency(totals.tax)}</span>
          </div>
          <div className="mt-2 flex justify-between gap-2 border-t border-border pt-2 font-medium">
            <span className="text-navy">Total</span>
            <span className="text-navy">{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </div>

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
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="button" onClick={submit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
