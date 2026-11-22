"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { refundableAmount } from "@/lib/data/billing";
import type { RefundRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Printer, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

function methodLabel(method: string) {
  if (method === "bank-transfer") return "Bank transfer";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

export default function AdminPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { hydrated, store, recordRefund } = useData();
  const currency = store.billingSettings.currency;

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundForm, setRefundForm] = useState({ amount: "", reason: "" });
  const [refundErrors, setRefundErrors] = useState<string[]>([]);

  const payment = useMemo(
    () => store.payments.find((entry) => entry.id === id) ?? null,
    [id, store.payments],
  );

  const invoice = useMemo(
    () =>
      payment
        ? (store.invoices.find((entry) => entry.id === payment.invoiceId) ??
          null)
        : null,
    [payment, store.invoices],
  );

  const refunds = useMemo(
    () =>
      payment
        ? store.refunds
            .filter((refund) => refund.paymentId === payment.id)
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
        : [],
    [payment, store.refunds],
  );

  if (!hydrated) return <LoadingState label="Loading payment..." />;

  if (!payment) {
    return (
      <Card>
        <CardBody className="space-y-4">
          <p className="text-sm text-muted">Payment not found.</p>
          <Link href="/admin/payments">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back to payments
            </Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const available = refundableAmount(payment, store.refunds);
  const canRefund = payment.status === "successful" && available > 0;

  function openRefund() {
    setRefundForm({ amount: String(available), reason: "" });
    setRefundErrors([]);
    setRefundOpen(true);
  }

  function submitRefund() {
    const result = recordRefund({
      paymentId: payment!.id,
      amount: Number(refundForm.amount),
      reason: refundForm.reason,
    });
    if (!result.ok) {
      setRefundErrors(result.errors);
      return;
    }
    setRefundOpen(false);
  }

  const refundColumns: Column<RefundRecord>[] = [
    {
      key: "amount",
      header: "Amount",
      render: (row) => formatCurrency(row.amount, currency),
    },
    {
      key: "reason",
      header: "Reason",
      render: (row) => row.reason,
    },
    {
      key: "date",
      header: "Date",
      render: (row) => formatDate(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/payments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          {canRefund ? (
            <Button onClick={openRefund}>
              <RotateCcw className="h-4 w-4" />
              Record refund
            </Button>
          ) : null}
          <Link href={`/admin/payments/${payment.id}/print`}>
            <Button variant="outline">
              <Printer className="h-4 w-4" />
              Print receipt
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={`Receipt ${payment.receiptNumber}`}
            description="Payment record"
            action={
              <Badge tone={statusTone(payment.status)}>
                {payment.status}
              </Badge>
            }
          />
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Amount
                </dt>
                <dd className="mt-1 font-display text-2xl text-navy">
                  {formatCurrency(payment.amount, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Refundable
                </dt>
                <dd className="mt-1 text-sm font-medium text-navy">
                  {formatCurrency(available, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Method
                </dt>
                <dd className="mt-1 text-sm text-navy">
                  {methodLabel(payment.method)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Paid at
                </dt>
                <dd className="mt-1 text-sm text-navy">
                  {formatDate(payment.paidAt)}
                </dd>
              </div>
              {payment.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted">
                    Notes
                  </dt>
                  <dd className="mt-1 text-sm text-navy">{payment.notes}</dd>
                </div>
              ) : null}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Linked invoice"
            description={payment.invoiceNumber}
          />
          <CardBody className="space-y-3">
            {invoice ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(invoice.status)}>
                    {invoice.status}
                  </Badge>
                  <Link
                    href={`/admin/invoices/${invoice.id}`}
                    className="text-sm font-medium text-orange hover:underline"
                  >
                    View invoice
                  </Link>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">
                      Customer
                    </dt>
                    <dd className="mt-1 text-navy">{invoice.customerName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">
                      Grand total
                    </dt>
                    <dd className="mt-1 text-navy">
                      {formatCurrency(invoice.grandTotal, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">
                      Amount paid
                    </dt>
                    <dd className="mt-1 text-navy">
                      {formatCurrency(invoice.amountPaid, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">
                      Remaining balance
                    </dt>
                    <dd className="mt-1 font-medium text-navy">
                      {formatCurrency(invoice.remainingBalance, currency)}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="text-sm text-muted">
                Invoice {payment.invoiceNumber} is no longer in the store.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Refund history"
          description="Refunds issued against this payment"
        />
        <CardBody>
          <DataTable
            columns={refundColumns}
            rows={refunds}
            emptyTitle="No refunds for this payment"
          />
        </CardBody>
      </Card>

      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Record refund"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Refundable up to{" "}
            <span className="font-medium text-navy">
              {formatCurrency(available, currency)}
            </span>
          </p>
          <Field label="Amount">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={refundForm.amount}
              onChange={(event) =>
                setRefundForm({ ...refundForm, amount: event.target.value })
              }
            />
          </Field>
          <Field label="Reason">
            <Textarea
              value={refundForm.reason}
              onChange={(event) =>
                setRefundForm({ ...refundForm, reason: event.target.value })
              }
              placeholder="Why is this being refunded?"
            />
          </Field>
          {refundErrors.length ? (
            <Alert>
              <ul className="list-disc pl-4">
                {refundErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitRefund}>Record refund</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
