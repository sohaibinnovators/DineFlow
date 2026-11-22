"use client";

import { useData } from "@/components/providers/DataProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Tabs } from "@/components/ui/Tabs";
import type { Order, Table, TableStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

const statusFilters: Array<TableStatus | "all"> = [
  "all",
  "available",
  "occupied",
  "reserved",
  "cleaning",
];

function TableGrid({
  rows,
  orders,
}: {
  rows: Table[];
  orders: Order[];
}) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        No tables match this filter.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((table) => {
        const order = orders.find((item) => item.id === table.currentOrderId);
        return (
          <div
            key={table.id}
            className={cn(
              "rounded-xl border p-4 transition",
              table.status === "occupied" && "border-danger/30 bg-red-50/40",
              table.status === "available" && "border-success/30 bg-emerald-50/40",
              table.status === "reserved" && "border-warning/30 bg-amber-50/40",
              table.status === "cleaning" && "border-info/30 bg-blue-50/40",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-2xl text-navy">{table.number}</p>
                <p className="mt-1 text-sm text-muted">
                  {table.section} · Seats {table.capacity}
                </p>
              </div>
              <Badge tone={statusTone(table.status)}>{table.status}</Badge>
            </div>
            {order ? (
              <div className="mt-4 rounded-lg border border-border bg-white px-3 py-2.5">
                <p className="text-sm font-medium text-navy">
                  {order.orderNumber}
                </p>
                <p className="text-xs text-muted">
                  {order.customerName} · {order.status}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">No active ticket</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function StaffTablesPage() {
  const { hydrated, store } = useData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TableStatus | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.tables.filter((table) => {
      const matchesStatus = status === "all" || table.status === status;
      const matchesQuery =
        !q ||
        table.number.toLowerCase().includes(q) ||
        table.section.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [query, status, store.tables]);

  const sections = useMemo(
    () => Array.from(new Set(store.tables.map((table) => table.section))),
    [store.tables],
  );

  if (!hydrated) return <LoadingState label="Loading table map..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader
          title="Table map"
          description="Live floor status across sections"
          action={
            <div className="w-56">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search tables..."
              />
            </div>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatus(filter)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm capitalize transition",
                  status === filter
                    ? "border-orange bg-accent text-navy"
                    : "border-border bg-white text-muted hover:text-navy",
                )}
              >
                {filter}
                {filter !== "all"
                  ? ` (${store.tables.filter((table) => table.status === filter).length})`
                  : ` (${store.tables.length})`}
              </button>
            ))}
          </div>

          <Tabs
            defaultTab="all-sections"
            tabs={[
              {
                id: "all-sections",
                label: "All sections",
                content: (
                  <TableGrid rows={filtered} orders={store.orders} />
                ),
              },
              ...sections.map((section) => ({
                id: section.toLowerCase(),
                label: section,
                content: (
                  <TableGrid
                    rows={filtered.filter((table) => table.section === section)}
                    orders={store.orders}
                  />
                ),
              })),
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}
