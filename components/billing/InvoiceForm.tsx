"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { addDaysIso } from "@/components/billing/invoiceHelpers";
import { calcInvoiceTotals } from "@/lib/data/billing";
import type {
  Customer,
  DiscountType,
  Invoice,
  InvoiceDraftInput,
  Order,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type LineDraft = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  menuItemId?: string;
};

type FormState = {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderId: string;
  issueDate: string;
  dueDate: string;
  discountType: DiscountType;
  discountValue: number;
  taxRatePercent: number;
  notes: string;
  lineItems: LineDraft[];
};

function buildInitial(
  defaults: {
    issueDate: string;
    dueDays: number;
    taxRate: number;
    discountType: DiscountType;
    discountValue: number;
  },
  invoice?: Invoice,
): FormState {
  if (invoice) {
    return {
      customerId: invoice.customerId ?? "",
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail ?? "",
      customerPhone: invoice.customerPhone ?? "",
      orderId: invoice.orderId ?? "",
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      discountType: invoice.discountType,
      discountValue: invoice.discountValue,
      taxRatePercent: Number((invoice.taxRate * 100).toFixed(2)),
      notes: invoice.notes ?? "",
      lineItems: invoice.lineItems.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        menuItemId: line.menuItemId,
      })),
    };
  }
  return {
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    orderId: "",
    issueDate: defaults.issueDate,
    dueDate: addDaysIso(defaults.issueDate, defaults.dueDays),
    discountType: defaults.discountType,
    discountValue: defaults.discountValue,
    taxRatePercent: Number((defaults.taxRate * 100).toFixed(2)),
    notes: "",
    lineItems: [
      {
        id: `line-${Date.now()}`,
        description: "",
        quantity: 1,
        unitPrice: 0,
      },
    ],
  };
}

function toInput(form: FormState, status: "draft" | "unpaid"): InvoiceDraftInput {
  return {
    customerId: form.customerId || undefined,
    customerName: form.customerName,
    customerEmail: form.customerEmail || undefined,
    customerPhone: form.customerPhone || undefined,
    orderId: form.orderId || undefined,
    issueDate: form.issueDate,
    dueDate: form.dueDate,
    lineItems: form.lineItems.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: Number(line.quantity) || 0,
      unitPrice: Number(line.unitPrice) || 0,
      menuItemId: line.menuItemId,
    })),
    discountType: form.discountType,
    discountValue: Number(form.discountValue) || 0,
    taxRate: (Number(form.taxRatePercent) || 0) / 100,
    notes: form.notes || undefined,
    status,
  };
}

export function InvoiceForm({
  customers,
  orders,
  currency,
  defaults,
  initialInvoice,
  errors,
  submitting,
  onCancel,
  onSubmit,
}: {
  customers: Customer[];
  orders: Order[];
  currency: string;
  defaults: {
    issueDate: string;
    dueDays: number;
    taxRate: number;
    discountType: DiscountType;
    discountValue: number;
  };
  initialInvoice?: Invoice;
  errors: string[];
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (input: InvoiceDraftInput) => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    buildInitial(defaults, initialInvoice),
  );
  const [orderNotice, setOrderNotice] = useState("");

  const totals = useMemo(
    () =>
      calcInvoiceTotals({
        lineItems: form.lineItems.map((line) => ({
          ...line,
          lineTotal:
            Math.round(
              (Number(line.quantity) || 0) *
                (Number(line.unitPrice) || 0) *
                100,
            ) / 100,
        })),
        discountType: form.discountType,
        discountValue: Number(form.discountValue) || 0,
        taxRate: (Number(form.taxRatePercent) || 0) / 100,
      }),
    [form],
  );

  function applyCustomer(customerId: string) {
    const customer = customers.find((entry) => entry.id === customerId);
    setForm((prev) => ({
      ...prev,
      customerId,
      customerName: customer?.name ?? prev.customerName,
      customerEmail: customer?.email ?? prev.customerEmail,
      customerPhone: customer?.phone ?? prev.customerPhone,
    }));
  }

  function applyOrder(orderId: string) {
    if (!orderId) {
      setForm((prev) => ({ ...prev, orderId: "" }));
      setOrderNotice("");
      return;
    }
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return;
    setForm((prev) => ({
      ...prev,
      orderId,
      customerId: order.customerId || prev.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail ?? prev.customerEmail,
      customerPhone: order.customerPhone ?? prev.customerPhone,
      discountType: "fixed",
      discountValue: order.discount,
      lineItems: order.items.map((item, index) => ({
        id: `line-order-${index}`,
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        menuItemId: item.menuItemId,
      })),
    }));
    setOrderNotice(
      `Loaded snapshot prices from ${order.orderNumber}. Later menu price changes will not alter these lines.`,
    );
  }

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((line) =>
        line.id === id ? { ...line, ...patch } : line,
      ),
    }));
  }

  return (
    <div className="space-y-6">
      {errors.length > 0 ? (
        <Alert tone="danger">
          <ul className="list-disc space-y-1 pl-4">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {orderNotice ? <Alert tone="info">{orderNotice}</Alert> : null}

      <Card>
        <CardHeader title="Customer & dates" description="Who this invoice is for" />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label="Customer profile">
            <Select
              value={form.customerId}
              onChange={(event) => applyCustomer(event.target.value)}
            >
              <option value="">Custom / walk-in</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Link order (optional)">
            <Select
              value={form.orderId}
              onChange={(event) => applyOrder(event.target.value)}
            >
              <option value="">No linked order</option>
              {orders
                .filter(
                  (order) =>
                    order.status !== "cancelled" &&
                    (order.status === "completed" ||
                      order.paymentStatus === "unpaid"),
                )
                .map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber} · {order.customerName} · {order.status}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Customer name">
            <Input
              value={form.customerName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, customerName: event.target.value }))
              }
            />
          </Field>
          <Field label="Email">
            <Input
              value={form.customerEmail}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  customerEmail: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.customerPhone}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  customerPhone: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Issue date">
            <Input
              type="date"
              value={form.issueDate}
              onChange={(event) => {
                const issueDate = event.target.value;
                setForm((prev) => ({
                  ...prev,
                  issueDate,
                  dueDate: addDaysIso(issueDate, defaults.dueDays),
                }));
              }}
            />
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dueDate: event.target.value }))
              }
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Line items"
          description="Descriptions, quantities, and unit prices"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  lineItems: [
                    ...prev.lineItems,
                    {
                      id: `line-${Date.now()}`,
                      description: "",
                      quantity: 1,
                      unitPrice: 0,
                    },
                  ],
                }))
              }
            >
              <Plus className="h-4 w-4" />
              Add line
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {form.lineItems.map((line) => (
            <div
              key={line.id}
              className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1.5fr_0.6fr_0.8fr_auto]"
            >
              <Field label="Description">
                <Input
                  value={line.description}
                  onChange={(event) =>
                    updateLine(line.id, { description: event.target.value })
                  }
                />
              </Field>
              <Field label="Qty">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={line.quantity}
                  onChange={(event) =>
                    updateLine(line.id, {
                      quantity: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Unit price">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.unitPrice}
                  onChange={(event) =>
                    updateLine(line.id, {
                      unitPrice: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={form.lineItems.length <= 1}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      lineItems: prev.lineItems.filter(
                        (entry) => entry.id !== line.id,
                      ),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tax & discount" description="Invoice-level adjustments" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Discount type">
              <Select
                value={form.discountType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    discountType: event.target.value as DiscountType,
                  }))
                }
              >
                <option value="fixed">Fixed</option>
                <option value="percentage">Percentage</option>
              </Select>
            </Field>
            <Field label="Discount value">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.discountValue}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    discountValue: Number(event.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Tax rate (%)">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.taxRatePercent}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    taxRatePercent: Number(event.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Notes">
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={3}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Totals preview" description="Rounded to 2 decimals" />
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{formatCurrency(totals.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Discount</span>
              <span>-{formatCurrency(totals.discountAmount, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Tax</span>
              <span>{formatCurrency(totals.taxAmount, currency)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-display text-lg text-navy">
              <span>Grand total</span>
              <span>{formatCurrency(totals.grandTotal, currency)}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={submitting}
          onClick={() => onSubmit(toInput(form, "draft"))}
        >
          Save draft
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={submitting}
          onClick={() => onSubmit(toInput(form, "unpaid"))}
        >
          Issue invoice
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
