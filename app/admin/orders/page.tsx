"use client";

import { findNewestInvoiceId } from "@/components/billing/invoiceHelpers";
import { CreateOrderForm } from "@/components/orders/CreateOrderForm";
import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
} from "@/lib/utils";
import { Eye, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const PAGE_SIZE = 6;
const statuses: Array<OrderStatus | "all"> = [
  "all",
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
];

const STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
];

const PAYMENTS: PaymentStatus[] = ["unpaid", "paid", "refunded"];

type SortKey = "newest" | "oldest" | "total-desc" | "total-asc";

function nextStatus(status: OrderStatus): OrderStatus | null {
  if (status === "served") return "completed";
  const index = STATUS_FLOW.indexOf(status);
  if (index === -1 || index >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[index + 1];
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const {
    hydrated,
    store,
    updateOrderStatus,
    updateOrderPayment,
    cancelOrder,
    createInvoiceFromOrder,
  } = useData();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [duplicateOrderId, setDuplicateOrderId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string[]>([]);

  const selected =
    store.orders.find((order) => order.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = store.orders.filter((order) => {
      const matchesStatus = status === "all" || order.status === status;
      const matchesDate =
        !dateFilter || order.createdAt.slice(0, 10) === dateFilter;
      const matchesQuery =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        (order.tableNumber?.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesDate && matchesQuery;
    });

    rows.sort((a, b) => {
      if (sort === "total-desc") return b.total - a.total;
      if (sort === "total-asc") return a.total - b.total;
      if (sort === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return rows;
  }, [dateFilter, query, sort, status, store.orders]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function applyStatus(id: string, next: OrderStatus) {
    const result = updateOrderStatus(id, next);
    if (!result.ok) {
      setActionError(result.errors);
      return;
    }
    setActionError([]);
  }

  function applyPayment(id: string, paymentStatus: PaymentStatus) {
    const result = updateOrderPayment(id, paymentStatus);
    if (!result.ok) {
      setActionError(result.errors);
      return;
    }
    setActionError([]);
  }

  function generateInvoice(orderId: string, allowDuplicate = false) {
    const previousIds = new Set(store.invoices.map((invoice) => invoice.id));
    const result = createInvoiceFromOrder(
      orderId,
      allowDuplicate ? { allowDuplicate: true } : undefined,
    );
    if (!result.ok) {
      const duplicate = result.errors.some((error) =>
        error.toLowerCase().includes("already exists"),
      );
      if (duplicate && !allowDuplicate) {
        setDuplicateOrderId(orderId);
        setActionError(result.errors);
        return;
      }
      setActionError(result.errors);
      return;
    }
    setActionError([]);
    setDuplicateOrderId(null);
    const invoiceId = findNewestInvoiceId(previousIds);
    if (invoiceId) {
      setSelectedId(null);
      router.push(`/admin/invoices/${invoiceId}`);
    }
  }

  const columns: Column<Order>[] = [
    {
      key: "order",
      header: "Order",
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{row.orderNumber}</p>
          <p className="text-xs text-muted capitalize">{row.type}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => row.customerName,
    },
    {
      key: "table",
      header: "Table",
      render: (row) => row.tableNumber ?? "—",
    },
    {
      key: "total",
      header: "Total",
      render: (row) => formatCurrency(row.total),
    },
    {
      key: "payment",
      header: "Payment",
      render: (row) => (
        <Badge tone={statusTone(row.paymentStatus)}>{row.paymentStatus}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "time",
      header: "Placed",
      render: (row) => formatRelativeTime(row.createdAt),
    },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setActionError([]);
            setSelectedId(row.id);
          }}
          aria-label={`View ${row.orderNumber}`}
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading orders..." />;

  const advance = selected ? nextStatus(selected.status) : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader
          title="Orders"
          description="Search, filter, create, and manage live tickets"
          action={
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/orders/new">
                <Button variant="outline">Full create page</Button>
              </Link>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Order
              </Button>
            </div>
          }
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <SearchInput
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="Search by order, customer, or table..."
            />
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as OrderStatus | "all");
                setPage(1);
              }}
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All statuses" : item}
                </option>
              ))}
            </Select>
            <InputDate
              value={dateFilter}
              onChange={(value) => {
                setDateFilter(value);
                setPage(1);
              }}
            />
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="total-desc">Highest total</option>
              <option value="total-asc">Lowest total</option>
            </Select>
          </div>
          <DataTable columns={columns} rows={rows} emptyTitle="No orders found" />
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        </CardBody>
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? `Order ${selected.orderNumber}` : "Order"}
        className="max-w-xl"
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
              <Badge tone={statusTone(selected.paymentStatus)}>
                {selected.paymentStatus}
              </Badge>
              <Badge tone="navy">{selected.type}</Badge>
              {selected.tableNumber ? (
                <Badge>{selected.tableNumber}</Badge>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-muted">Customer</p>
                <p className="font-medium text-navy">{selected.customerName}</p>
                {selected.customerPhone ? (
                  <p className="text-xs text-muted">{selected.customerPhone}</p>
                ) : null}
                {selected.customerEmail ? (
                  <p className="text-xs text-muted">{selected.customerEmail}</p>
                ) : null}
              </div>
              <div>
                <p className="text-muted">Placed</p>
                <p className="font-medium text-navy">
                  {formatDateTime(selected.createdAt)}
                </p>
                <p className="text-xs text-muted">
                  {formatRelativeTime(selected.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-muted">Est. prep</p>
                <p className="font-medium text-navy">
                  {selected.estimatedMinutes
                    ? `${selected.estimatedMinutes} min`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted">Updated</p>
                <p className="font-medium text-navy">
                  {formatRelativeTime(selected.updatedAt)}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-navy">Items</p>
              <ul className="space-y-2 rounded-lg border border-border p-3">
                {selected.items.map((item) => (
                  <li
                    key={`${selected.id}-${item.menuItemId}-${item.name}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-navy">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="text-muted">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted">Subtotal</span>
                <span>{formatCurrency(selected.subtotal)}</span>
              </div>
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-muted">Discount</span>
                <span>−{formatCurrency(selected.discount)}</span>
              </div>
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-muted">Tax</span>
                <span>{formatCurrency(selected.tax)}</span>
              </div>
              <div className="mt-2 flex justify-between gap-2 border-t border-border pt-2 font-medium text-navy">
                <span>Total</span>
                <span>{formatCurrency(selected.total)}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Update status">
                <Select
                  value={selected.status}
                  disabled={selected.status === "cancelled"}
                  onChange={(event) => {
                    const next = event.target.value as OrderStatus;
                    if (next === "cancelled") {
                      setCancelId(selected.id);
                      return;
                    }
                    applyStatus(selected.id, next);
                  }}
                >
                  {statuses
                    .filter((item) => item !== "all")
                    .map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Payment status">
                <Select
                  value={selected.paymentStatus}
                  onChange={(event) =>
                    applyPayment(
                      selected.id,
                      event.target.value as PaymentStatus,
                    )
                  }
                >
                  {PAYMENTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {actionError.length ? (
              <Alert>
                <ul className="list-disc pl-4">
                  {actionError.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              {selected.status !== "cancelled" ? (
                <Button
                  variant="outline"
                  onClick={() => generateInvoice(selected.id)}
                >
                  <FileText className="h-4 w-4" />
                  Generate invoice
                </Button>
              ) : null}
              {advance && selected.status !== "cancelled" ? (
                <Button
                  variant="secondary"
                  onClick={() => applyStatus(selected.id, advance)}
                >
                  Mark {advance}
                </Button>
              ) : null}
              {selected.status !== "cancelled" &&
              selected.status !== "completed" ? (
                <Button
                  variant="danger"
                  onClick={() => setCancelId(selected.id)}
                >
                  Cancel order
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => setSelectedId(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create order"
        className="max-w-2xl"
      >
        <CreateOrderForm
          onCancel={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelId)}
        title="Cancel this order?"
        description="Cancelled tickets cannot be reopened in Phase 2. Linked tables will be freed."
        confirmLabel="Cancel order"
        danger
        onClose={() => setCancelId(null)}
        onConfirm={() => {
          if (!cancelId) return;
          const result = cancelOrder(cancelId);
          if (!result.ok) setActionError(result.errors);
          else setActionError([]);
        }}
      />

      <ConfirmDialog
        open={Boolean(duplicateOrderId)}
        title="Invoice already exists"
        description="An invoice is already linked to this order. Create another copy anyway?"
        confirmLabel="Create duplicate"
        onClose={() => setDuplicateOrderId(null)}
        onConfirm={() => {
          if (!duplicateOrderId) return;
          generateInvoice(duplicateOrderId, true);
        }}
      />
    </div>
  );
}

function InputDate({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-navy outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/20"
      aria-label="Filter by date"
    />
  );
}
