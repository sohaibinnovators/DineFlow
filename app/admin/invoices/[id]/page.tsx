"use client";

import {
  invoiceStatusTone,
  paymentMethodLabel,
} from "@/components/billing/invoiceHelpers";
import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { BillingPaymentMethod } from "@/lib/types";
import { DEMO_NOW, formatCurrency, formatDate } from "@/lib/utils";
import {
  Ban,
  CheckCircle2,
  Pencil,
  Printer,
  Trash2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    hydrated,
    store,
    issueInvoice,
    cancelInvoice,
    deleteInvoice,
    recordPayment,
  } = useData();

  const invoice = store.invoices.find((entry) => entry.id === params.id);
  const currency = store.billingSettings.currency;

  const payments = useMemo(
    () =>
      store.payments
        .filter((payment) => payment.invoiceId === params.id)
        .sort(
          (a, b) =>
            new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
        ),
    [params.id, store.payments],
  );

  const refunds = useMemo(
    () =>
      store.refunds.filter((refund) => refund.invoiceId === params.id),
    [params.id, store.refunds],
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: "",
    method: "cash" as BillingPaymentMethod,
    paidAt: new Date(DEMO_NOW).toISOString().slice(0, 10),
    notes: "",
  });
  const [payErrors, setPayErrors] = useState<string[]>([]);

  if (!hydrated) return <LoadingState label="Loading invoice..." />;

  if (!invoice) {
    return (
      <div className="space-y-4 animate-fade-up">
        <Alert>Invoice not found.</Alert>
        <Link href="/admin/invoices">
          <Button variant="outline">Back to invoices</Button>
        </Link>
      </div>
    );
  }

  function submitPayment() {
    if (!invoice) return;
    setPayErrors([]);
    const result = recordPayment({
      invoiceId: invoice.id,
      amount: Number(payForm.amount),
      method: payForm.method,
      paidAt: `${payForm.paidAt}T12:00:00.000Z`,
      notes: payForm.notes || undefined,
    });
    if (!result.ok) {
      setPayErrors(result.errors);
      return;
    }
    setPayOpen(false);
  }

  const canPay =
    invoice.remainingBalance > 0 &&
    !["draft", "cancelled"].includes(invoice.status);

  return (
    <div className="space-y-6 animate-fade-up">
      {errors.length > 0 ? (
        <Alert tone="danger">
          <ul className="list-disc pl-4">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl text-navy">
              {invoice.invoiceNumber}
            </h2>
            <Badge tone={invoiceStatusTone(invoice.status)}>
              {invoice.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Issued {formatDate(invoice.issueDate)} · Due{" "}
            {formatDate(invoice.dueDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status === "draft" ? (
            <>
              <Link href={`/admin/invoices/${invoice.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={() => {
                  const result = issueInvoice(invoice.id);
                  if (!result.ok) setErrors(result.errors);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Issue
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          ) : null}
          {invoice.amountPaid === 0 && invoice.status !== "cancelled" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCancelOpen(true)}
            >
              <Ban className="h-4 w-4" />
              Cancel
            </Button>
          ) : null}
          {canPay ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setPayForm({
                  amount: String(invoice.remainingBalance),
                  method: "cash",
                  paidAt: new Date(DEMO_NOW).toISOString().slice(0, 10),
                  notes: "",
                });
                setPayErrors([]);
                setPayOpen(true);
              }}
            >
              <Wallet className="h-4 w-4" />
              Record payment
            </Button>
          ) : null}
          <Link href={`/admin/invoices/${invoice.id}/print`}>
            <Button size="sm" variant="outline">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Line items" description="Historical price snapshot" />
          <CardBody className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Qty</th>
                  <th className="pb-2 font-medium">Unit</th>
                  <th className="pb-2 font-medium text-right">Line total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((line) => (
                  <tr key={line.id} className="border-b border-border/70">
                    <td className="py-2 text-navy">{line.description}</td>
                    <td className="py-2">{line.quantity}</td>
                    <td className="py-2">
                      {formatCurrency(line.unitPrice, currency)}
                    </td>
                    <td className="py-2 text-right">
                      {formatCurrency(line.lineTotal, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Totals" />
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">
                Discount (
                {invoice.discountType === "percentage"
                  ? `${invoice.discountValue}%`
                  : "fixed"}
                )
              </span>
              <span>-{formatCurrency(invoice.discountAmount, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">
                Tax ({(invoice.taxRate * 100).toFixed(2)}%)
              </span>
              <span>{formatCurrency(invoice.taxAmount, currency)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-display text-lg text-navy">
              <span>Grand total</span>
              <span>{formatCurrency(invoice.grandTotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Amount paid</span>
              <span>{formatCurrency(invoice.amountPaid, currency)}</span>
            </div>
            <div className="flex justify-between font-medium text-navy">
              <span>Remaining</span>
              <span>{formatCurrency(invoice.remainingBalance, currency)}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Customer" description="Billed party" />
          <CardBody className="space-y-1 text-sm">
            <p className="font-medium text-navy">{invoice.customerName}</p>
            {invoice.customerEmail ? (
              <p className="text-muted">{invoice.customerEmail}</p>
            ) : null}
            {invoice.customerPhone ? (
              <p className="text-muted">{invoice.customerPhone}</p>
            ) : null}
            {invoice.orderId ? (
              <p className="pt-2 text-muted">
                Order{" "}
                <Link
                  href="/admin/orders"
                  className="font-medium text-navy underline"
                >
                  {invoice.orderNumber ?? invoice.orderId}
                </Link>
              </p>
            ) : null}
            {invoice.notes ? (
              <p className="pt-2 text-muted">{invoice.notes}</p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Payments & refunds" />
          <CardBody className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-sm text-muted">No payments recorded.</p>
            ) : (
              payments.map((payment) => (
                <Link
                  key={payment.id}
                  href={`/admin/payments/${payment.id}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 hover:bg-accent"
                >
                  <div>
                    <p className="font-medium text-navy">
                      {payment.receiptNumber}
                    </p>
                    <p className="text-xs text-muted">
                      {paymentMethodLabel(payment.method)} ·{" "}
                      {formatDate(payment.paidAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(payment.amount, currency)}
                    </p>
                    <Badge tone={statusTone(payment.status)}>
                      {payment.status}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
            {refunds.length > 0 ? (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-sm font-medium text-navy">Refunds</p>
                {refunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="flex justify-between gap-2">
                      <span>{formatDate(refund.createdAt)}</span>
                      <span className="font-medium text-danger">
                        -{formatCurrency(refund.amount, currency)}
                      </span>
                    </div>
                    <p className="mt-1 text-muted">{refund.reason}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record payment"
      >
        <div className="space-y-4">
          {payErrors.length > 0 ? (
            <Alert tone="danger">
              <ul className="list-disc pl-4">
                {payErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <p className="text-sm text-muted">
            Remaining balance{" "}
            {formatCurrency(invoice.remainingBalance, currency)}
          </p>
          <Field label="Amount">
            <Input
              type="number"
              min={0}
              max={invoice.remainingBalance}
              step={0.01}
              value={payForm.amount}
              onChange={(event) =>
                setPayForm((prev) => ({ ...prev, amount: event.target.value }))
              }
            />
          </Field>
          <Field label="Method">
            <Select
              value={payForm.method}
              onChange={(event) =>
                setPayForm((prev) => ({
                  ...prev,
                  method: event.target.value as BillingPaymentMethod,
                }))
              }
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank-transfer">Bank transfer</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Payment date">
            <Input
              type="date"
              value={payForm.paidAt}
              onChange={(event) =>
                setPayForm((prev) => ({ ...prev, paidAt: event.target.value }))
              }
            />
          </Field>
          <Field label="Notes">
            <Textarea
              value={payForm.notes}
              onChange={(event) =>
                setPayForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              rows={3}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPayment}>Save payment</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete draft invoice?"
        description="This permanently removes the draft. Issued invoices cannot be deleted."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          const result = deleteInvoice(invoice.id);
          if (!result.ok) {
            setErrors(result.errors);
            setDeleteOpen(false);
            return;
          }
          router.push("/admin/invoices");
        }}
        onClose={() => setDeleteOpen(false)}
      />

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel invoice?"
        description="Cancelled invoices are excluded from outstanding balances."
        confirmLabel="Cancel invoice"
        danger
        onConfirm={() => {
          const result = cancelInvoice(invoice.id);
          if (!result.ok) setErrors(result.errors);
          setCancelOpen(false);
        }}
        onClose={() => setCancelOpen(false)}
      />
    </div>
  );
}
