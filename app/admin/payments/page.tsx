"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  downloadCsv,
  outstandingInvoices,
  refundableAmount,
} from "@/lib/data/billing";
import type {
  BillingPaymentMethod,
  BillingPaymentStatus,
  PaymentRecord,
} from "@/lib/types";
import { DEMO_NOW, formatCurrency, formatDate } from "@/lib/utils";
import { Download, Eye, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const PAGE_SIZE = 8;

const METHODS: Array<BillingPaymentMethod | "all"> = [
  "all",
  "cash",
  "bank-transfer",
  "card",
  "other",
];

const STATUSES: Array<BillingPaymentStatus | "all"> = [
  "all",
  "successful",
  "refunded",
  "failed",
];

type SortKey = "newest" | "oldest" | "amount-desc" | "amount-asc";

const EMPTY_PAYMENT = {
  invoiceId: "",
  amount: "",
  method: "cash" as BillingPaymentMethod,
  paidAt: new Date(DEMO_NOW).toISOString().slice(0, 10),
  notes: "",
};

const EMPTY_REFUND = {
  amount: "",
  reason: "",
};

function methodLabel(method: BillingPaymentMethod) {
  if (method === "bank-transfer") return "Bank transfer";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

export default function AdminPaymentsPage() {
  const { hydrated, store, recordPayment, recordRefund } = useData();
  const currency = store.billingSettings.currency;

  const [query, setQuery] = useState("");
  const [method, setMethod] = useState<BillingPaymentMethod | "all">("all");
  const [status, setStatus] = useState<BillingPaymentStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);

  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState(EMPTY_PAYMENT);
  const [payErrors, setPayErrors] = useState<string[]>([]);
  const [showAllInvoices, setShowAllInvoices] = useState(false);

  const [detail, setDetail] = useState<PaymentRecord | null>(null);

  const [refundPayment, setRefundPayment] = useState<PaymentRecord | null>(
    null,
  );
  const [refundForm, setRefundForm] = useState(EMPTY_REFUND);
  const [refundErrors, setRefundErrors] = useState<string[]>([]);
  const [pageError, setPageError] = useState<string[]>([]);

  const invoiceOptions = useMemo(() => {
    if (showAllInvoices) {
      return store.invoices.filter(
        (invoice) =>
          !["draft", "cancelled"].includes(invoice.status) &&
          invoice.remainingBalance > 0,
      );
    }
    return outstandingInvoices(store.invoices);
  }, [showAllInvoices, store.invoices]);

  const selectedInvoice = store.invoices.find(
    (invoice) => invoice.id === payForm.invoiceId,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = store.payments.filter((payment) => {
      const matchesMethod = method === "all" || payment.method === method;
      const matchesStatus = status === "all" || payment.status === status;
      const paidDay = payment.paidAt.slice(0, 10);
      const matchesDate = !dateFilter || paidDay === dateFilter;
      const matchesQuery =
        !q ||
        payment.receiptNumber.toLowerCase().includes(q) ||
        payment.invoiceNumber.toLowerCase().includes(q);
      return matchesMethod && matchesStatus && matchesDate && matchesQuery;
    });

    rows.sort((a, b) => {
      if (sort === "amount-desc") return b.amount - a.amount;
      if (sort === "amount-asc") return a.amount - b.amount;
      if (sort === "oldest") {
        return (
          new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime() ||
          a.receiptNumber.localeCompare(b.receiptNumber)
        );
      }
      return (
        new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime() ||
        b.receiptNumber.localeCompare(a.receiptNumber)
      );
    });

    return rows;
  }, [dateFilter, method, query, sort, status, store.payments]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function invoiceBalance(invoiceId: string) {
    return (
      store.invoices.find((invoice) => invoice.id === invoiceId)
        ?.remainingBalance ?? 0
    );
  }

  function openRecordPayment() {
    const first = invoiceOptions[0];
    setPayForm({
      ...EMPTY_PAYMENT,
      invoiceId: first?.id ?? "",
      amount: first ? String(first.remainingBalance) : "",
      paidAt: new Date(DEMO_NOW).toISOString().slice(0, 10),
    });
    setPayErrors([]);
    setShowAllInvoices(false);
    setPayOpen(true);
  }

  function onInvoiceChange(invoiceId: string) {
    const invoice = store.invoices.find((entry) => entry.id === invoiceId);
    setPayForm((current) => ({
      ...current,
      invoiceId,
      amount: invoice ? String(invoice.remainingBalance) : "",
    }));
  }

  function submitPayment() {
    const result = recordPayment({
      invoiceId: payForm.invoiceId,
      amount: Number(payForm.amount),
      method: payForm.method,
      paidAt: payForm.paidAt
        ? `${payForm.paidAt}T14:00:00.000Z`
        : undefined,
      notes: payForm.notes.trim() || undefined,
    });
    if (!result.ok) {
      setPayErrors(result.errors);
      return;
    }
    setPayOpen(false);
    setPageError([]);
  }

  function openRefund(payment: PaymentRecord) {
    const available = refundableAmount(payment, store.refunds);
    setRefundPayment(payment);
    setRefundForm({
      amount: String(available),
      reason: "",
    });
    setRefundErrors([]);
  }

  function submitRefund() {
    if (!refundPayment) return;
    const result = recordRefund({
      paymentId: refundPayment.id,
      amount: Number(refundForm.amount),
      reason: refundForm.reason,
    });
    if (!result.ok) {
      setRefundErrors(result.errors);
      return;
    }
    setRefundPayment(null);
    setDetail(null);
    setPageError([]);
  }

  function exportCsv() {
    downloadCsv(
      "dineflow-payments.csv",
      filtered.map((payment) => ({
        receiptNumber: payment.receiptNumber,
        invoiceNumber: payment.invoiceNumber,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        paidAt: payment.paidAt.slice(0, 10),
        remainingBalance: invoiceBalance(payment.invoiceId),
        notes: payment.notes ?? "",
      })),
    );
  }

  const columns: Column<PaymentRecord>[] = [
    {
      key: "receipt",
      header: "Receipt",
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{row.receiptNumber}</p>
          <p className="text-xs text-muted">{formatDate(row.paidAt)}</p>
        </div>
      ),
    },
    {
      key: "invoice",
      header: "Invoice",
      render: (row) => {
        const remaining = invoiceBalance(row.invoiceId);
        return (
          <div>
            <Link
              href={`/admin/invoices/${row.invoiceId}`}
              className="font-medium text-orange hover:underline"
            >
              {row.invoiceNumber}
            </Link>
            <p className="text-xs text-muted">
              Remaining {formatCurrency(remaining, currency)}
            </p>
          </div>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => formatCurrency(row.amount, currency),
    },
    {
      key: "method",
      header: "Method",
      render: (row) => methodLabel(row.method),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => {
        const canRefund =
          row.status === "successful" &&
          refundableAmount(row, store.refunds) > 0;
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetail(row)}
              aria-label="View payment"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canRefund ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openRefund(row)}
                aria-label="Refund payment"
              >
                <RotateCcw className="h-4 w-4 text-warning" />
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  if (!hydrated) return <LoadingState label="Loading payments..." />;

  const detailRefundable = detail
    ? refundableAmount(detail, store.refunds)
    : 0;
  const detailRefunds = detail
    ? store.refunds.filter((refund) => refund.paymentId === detail.id)
    : [];

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

      <Card>
        <CardHeader
          title="Payments"
          description="Record invoice payments, track receipts, and issue refunds"
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={openRecordPayment}>
                <Plus className="h-4 w-4" />
                Record payment
              </Button>
            </div>
          }
        />
        <CardBody>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="sm:col-span-2 lg:col-span-2">
              <SearchInput
                value={query}
                onChange={(value) => {
                  setQuery(value);
                  setPage(1);
                }}
                placeholder="Search receipt or invoice #..."
              />
            </div>
            <Select
              value={method}
              onChange={(event) => {
                setMethod(event.target.value as BillingPaymentMethod | "all");
                setPage(1);
              }}
            >
              {METHODS.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All methods" : methodLabel(item)}
                </option>
              ))}
            </Select>
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as BillingPaymentStatus | "all");
                setPage(1);
              }}
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All statuses" : item}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(event) => {
                setDateFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by payment date"
            />
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="sm:col-span-2 lg:col-span-1"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
            </Select>
          </div>

          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No payments found"
          />
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        </CardBody>
      </Card>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record payment"
        className="max-w-lg"
      >
        <div className="space-y-4">
          <Field label="Invoice">
            <Select
              value={payForm.invoiceId}
              onChange={(event) => onInvoiceChange(event.target.value)}
            >
              <option value="">Select invoice</option>
              {invoiceOptions.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} ·{" "}
                  {formatCurrency(invoice.remainingBalance, currency)} due ·{" "}
                  {invoice.customerName}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={showAllInvoices}
              onChange={(event) => {
                setShowAllInvoices(event.target.checked);
                setPayForm((current) => ({ ...current, invoiceId: "" }));
              }}
              className="rounded border-border"
            />
            Show all invoices with a balance
          </label>
          {selectedInvoice ? (
            <p className="text-xs text-muted">
              Remaining balance{" "}
              <span className="font-medium text-navy">
                {formatCurrency(selectedInvoice.remainingBalance, currency)}
              </span>
            </p>
          ) : null}
          <Field label="Amount">
            <Input
              type="number"
              min="0"
              step="0.01"
              max={selectedInvoice?.remainingBalance}
              value={payForm.amount}
              onChange={(event) =>
                setPayForm({ ...payForm, amount: event.target.value })
              }
              placeholder="0.00"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Method">
              <Select
                value={payForm.method}
                onChange={(event) =>
                  setPayForm({
                    ...payForm,
                    method: event.target.value as BillingPaymentMethod,
                  })
                }
              >
                {METHODS.filter((item) => item !== "all").map((item) => (
                  <option key={item} value={item}>
                    {methodLabel(item)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Payment date">
              <Input
                type="date"
                value={payForm.paidAt}
                onChange={(event) =>
                  setPayForm({ ...payForm, paidAt: event.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              value={payForm.notes}
              onChange={(event) =>
                setPayForm({ ...payForm, notes: event.target.value })
              }
              placeholder="Optional notes"
            />
          </Field>
          {payErrors.length ? (
            <Alert>
              <ul className="list-disc pl-4">
                {payErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPayment}>Save payment</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? `Receipt ${detail.receiptNumber}` : "Payment"}
        className="max-w-lg"
      >
        {detail ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Invoice
                </p>
                <Link
                  href={`/admin/invoices/${detail.invoiceId}`}
                  className="text-sm font-medium text-orange hover:underline"
                >
                  {detail.invoiceNumber}
                </Link>
                <p className="text-xs text-muted">
                  Remaining{" "}
                  {formatCurrency(
                    invoiceBalance(detail.invoiceId),
                    currency,
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Amount
                </p>
                <p className="text-sm font-medium text-navy">
                  {formatCurrency(detail.amount, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Method
                </p>
                <p className="text-sm text-navy">
                  {methodLabel(detail.method)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Status
                </p>
                <Badge tone={statusTone(detail.status)}>{detail.status}</Badge>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Paid
                </p>
                <p className="text-sm text-navy">{formatDate(detail.paidAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Refundable
                </p>
                <p className="text-sm text-navy">
                  {formatCurrency(detailRefundable, currency)}
                </p>
              </div>
              {detail.notes ? (
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Notes
                  </p>
                  <p className="text-sm text-navy">{detail.notes}</p>
                </div>
              ) : null}
            </div>

            {detailRefunds.length ? (
              <div>
                <h3 className="mb-2 text-sm font-medium text-navy">
                  Refunds on this payment
                </h3>
                <ul className="space-y-2">
                  {detailRefunds.map((refund) => (
                    <li
                      key={refund.id}
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-navy">
                          {formatCurrency(refund.amount, currency)}
                        </span>
                        <span className="text-xs text-muted">
                          {formatDate(refund.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted">{refund.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              {detailRefundable > 0 && detail.status === "successful" ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    openRefund(detail);
                    setDetail(null);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Refund
                </Button>
              ) : null}
              <Link href={`/admin/payments/${detail.id}`}>
                <Button variant="outline">Open details</Button>
              </Link>
              <Link href={`/admin/payments/${detail.id}/print`}>
                <Button variant="outline">Print receipt</Button>
              </Link>
              <Button variant="outline" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(refundPayment)}
        onClose={() => setRefundPayment(null)}
        title={
          refundPayment
            ? `Refund ${refundPayment.receiptNumber}`
            : "Record refund"
        }
      >
        {refundPayment ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Refundable up to{" "}
              <span className="font-medium text-navy">
                {formatCurrency(
                  refundableAmount(refundPayment, store.refunds),
                  currency,
                )}
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
              <Button variant="outline" onClick={() => setRefundPayment(null)}>
                Cancel
              </Button>
              <Button onClick={submitRefund}>Record refund</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
