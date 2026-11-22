"use client";

import { invoiceStatusTone } from "@/components/billing/invoiceHelpers";
import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { downloadCsv } from "@/lib/data/billing";
import type {
  BillingPaymentMethod,
  Invoice,
  InvoiceStatus,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const PAGE_SIZE = 10;

type SortKey = "date-desc" | "date-asc" | "total-desc" | "total-asc" | "status";

const STATUSES: Array<InvoiceStatus | "all"> = [
  "all",
  "draft",
  "unpaid",
  "partially-paid",
  "paid",
  "overdue",
  "cancelled",
];

const METHODS: Array<BillingPaymentMethod | "all"> = [
  "all",
  "cash",
  "bank-transfer",
  "card",
  "other",
];

export default function AdminInvoicesPage() {
  const { hydrated, store, deleteInvoice } = useData();
  const currency = store.billingSettings.currency;

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [method, setMethod] = useState<BillingPaymentMethod | "all">("all");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = store.invoices.filter((invoice) => {
      const matchesStatus = status === "all" || invoice.status === status;
      const matchesFrom = !dateFrom || invoice.issueDate >= dateFrom;
      const matchesTo = !dateTo || invoice.issueDate <= dateTo;
      const matchesQuery =
        !q ||
        invoice.invoiceNumber.toLowerCase().includes(q) ||
        invoice.customerName.toLowerCase().includes(q) ||
        (invoice.orderNumber?.toLowerCase().includes(q) ?? false);
      const matchesMethod =
        method === "all" ||
        store.payments.some(
          (payment) =>
            payment.invoiceId === invoice.id &&
            payment.status === "successful" &&
            payment.method === method,
        );
      return (
        matchesStatus &&
        matchesFrom &&
        matchesTo &&
        matchesQuery &&
        matchesMethod
      );
    });

    rows.sort((a, b) => {
      if (sort === "total-desc") return b.grandTotal - a.grandTotal;
      if (sort === "total-asc") return a.grandTotal - b.grandTotal;
      if (sort === "status") return a.status.localeCompare(b.status);
      if (sort === "date-asc") {
        return a.issueDate.localeCompare(b.issueDate);
      }
      return b.issueDate.localeCompare(a.issueDate);
    });
    return rows;
  }, [
    dateFrom,
    dateTo,
    method,
    query,
    sort,
    status,
    store.invoices,
    store.payments,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function exportCsv() {
    downloadCsv(
      `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((invoice) => ({
        number: invoice.invoiceNumber,
        customer: invoice.customerName,
        order: invoice.orderNumber ?? "",
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        total: invoice.grandTotal,
        paid: invoice.amountPaid,
        balance: invoice.remainingBalance,
        status: invoice.status,
      })),
    );
  }

  const columns: Column<Invoice>[] = [
    {
      key: "number",
      header: "Number",
      render: (row) => (
        <Link
          href={`/admin/invoices/${row.id}`}
          className="font-medium text-navy hover:text-orange"
        >
          {row.invoiceNumber}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => row.customerName,
    },
    {
      key: "order",
      header: "Order",
      render: (row) => row.orderNumber ?? "—",
    },
    {
      key: "dates",
      header: "Dates",
      render: (row) => (
        <div className="text-xs">
          <p>Issued {formatDate(row.issueDate)}</p>
          <p className="text-muted">Due {formatDate(row.dueDate)}</p>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (row) => formatCurrency(row.grandTotal, currency),
    },
    {
      key: "paid",
      header: "Paid",
      render: (row) => formatCurrency(row.amountPaid, currency),
    },
    {
      key: "balance",
      header: "Balance",
      render: (row) => formatCurrency(row.remainingBalance, currency),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={invoiceStatusTone(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Link href={`/admin/invoices/${row.id}`}>
            <Button variant="ghost" size="sm" aria-label="View invoice">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {row.status === "draft" ? (
            <>
              <Link href={`/admin/invoices/${row.id}/edit`}>
                <Button variant="ghost" size="sm" aria-label="Edit draft">
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete draft"
                onClick={() => {
                  setPageError([]);
                  setDeleteId(row.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading invoices..." />;

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
          title="Invoices"
          description="Create, filter, and export billing documents"
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Link href="/admin/invoices/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  Create invoice
                </Button>
              </Link>
            </div>
          }
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="md:col-span-2">
              <SearchInput
                value={query}
                onChange={(value) => {
                  setQuery(value);
                  setPage(1);
                }}
                placeholder="Search number, customer, order..."
              />
            </div>
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as InvoiceStatus | "all");
                setPage(1);
              }}
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All statuses" : item}
                </option>
              ))}
            </Select>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
              className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-navy outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/20"
              aria-label="Issue date from"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
              className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-navy outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/20"
              aria-label="Issue date to"
            />
            <Select
              value={method}
              onChange={(event) => {
                setMethod(event.target.value as BillingPaymentMethod | "all");
                setPage(1);
              }}
            >
              {METHODS.map((item) => (
                <option key={item} value={item}>
                  {item === "all"
                    ? "All payment methods"
                    : item === "bank-transfer"
                      ? "Bank transfer"
                      : item}
                </option>
              ))}
            </Select>
          </div>
          <div className="max-w-xs">
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              <option value="date-desc">Newest issue date</option>
              <option value="date-asc">Oldest issue date</option>
              <option value="total-desc">Highest total</option>
              <option value="total-asc">Lowest total</option>
              <option value="status">Status</option>
            </Select>
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No invoices found"
          />
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        </CardBody>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete draft invoice?"
        description="This permanently removes the draft. Issued invoices cannot be deleted."
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          const result = deleteInvoice(deleteId);
          if (!result.ok) setPageError(result.errors);
          else setPageError([]);
        }}
      />
    </div>
  );
}
