"use client";

import { CreateOrderForm } from "@/components/orders/CreateOrderForm";
import { useData } from "@/components/providers/DataProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { Tabs } from "@/components/ui/Tabs";
import type { Order } from "@/lib/types";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const STAFF_ID = "stf-2";

function OrderTable({
  rows,
  onSelect,
}: {
  rows: Order[];
  onSelect: (order: Order) => void;
}) {
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
      header: "Guest",
      render: (row) => row.customerName,
    },
    {
      key: "table",
      header: "Table",
      render: (row) => row.tableNumber ?? "—",
    },
    {
      key: "items",
      header: "Items",
      render: (row) =>
        row.items.reduce((sum, item) => sum + item.quantity, 0),
    },
    {
      key: "total",
      header: "Total",
      render: (row) => formatCurrency(row.total),
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
      header: "Updated",
      render: (row) => formatRelativeTime(row.updatedAt),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelect(row)}
          aria-label={`View ${row.orderNumber}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyTitle="No orders in this view"
      emptyDescription="Assigned tickets and dine-in orders will appear here."
    />
  );
}

export default function StaffOrdersPage() {
  const { hydrated, store } = useData();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const assigned = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.orders
      .filter((order) => order.assignedStaffId === STAFF_ID)
      .filter((order) => {
        if (!q) return true;
        return (
          order.orderNumber.toLowerCase().includes(q) ||
          order.customerName.toLowerCase().includes(q) ||
          (order.tableNumber?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [query, store.orders]);

  const dineIn = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.orders
      .filter((order) => order.type === "dine-in")
      .filter((order) => {
        if (!q) return true;
        return (
          order.orderNumber.toLowerCase().includes(q) ||
          order.customerName.toLowerCase().includes(q) ||
          (order.tableNumber?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [query, store.orders]);

  if (!hydrated) return <LoadingState label="Loading floor tickets..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader
          title="Floor tickets"
          description="Prefer your assigned section; dine-in orders available for coverage"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-56">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Search orders..."
                />
              </div>
              <Link href="/admin/orders/new">
                <Button variant="outline" size="sm">
                  Admin create
                </Button>
              </Link>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create order
              </Button>
            </div>
          }
        />
        <CardBody>
          <Tabs
            defaultTab="assigned"
            tabs={[
              {
                id: "assigned",
                label: `Assigned to me (${assigned.length})`,
                content: (
                  <OrderTable rows={assigned} onSelect={setSelected} />
                ),
              },
              {
                id: "dine-in",
                label: `Dine-in (${dineIn.length})`,
                content: <OrderTable rows={dineIn} onSelect={setSelected} />,
              },
            ]}
          />
        </CardBody>
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.orderNumber : "Order"}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(selected.status)}>
                {selected.status}
              </Badge>
              <Badge tone={statusTone(selected.paymentStatus)}>
                {selected.paymentStatus}
              </Badge>
              <Badge>{selected.type}</Badge>
              {selected.tableNumber ? (
                <Badge tone="navy">Table {selected.tableNumber}</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted">
              {selected.customerName} · {formatRelativeTime(selected.createdAt)}
            </p>
            <ul className="space-y-2">
              {selected.items.map((item) => (
                <li
                  key={`${selected.id}-${item.menuItemId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-medium text-navy">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>{formatCurrency(selected.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Discount</span>
                <span>−{formatCurrency(selected.discount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tax</span>
                <span>{formatCurrency(selected.tax)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 font-medium">
                <span className="text-navy">Total</span>
                <span className="font-display text-lg text-navy">
                  {formatCurrency(selected.total)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create floor order"
        className="max-w-2xl"
      >
        <CreateOrderForm
          assignedStaffId={STAFF_ID}
          onCancel={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      </Modal>
    </div>
  );
}
