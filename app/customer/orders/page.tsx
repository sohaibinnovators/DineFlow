"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import type { Order } from "@/lib/types";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function CustomerOrdersPage() {
  const { hydrated, store } = useData();
  const [query, setQuery] = useState("");
  const demoId = store.engagement?.demoCustomerId ?? "cus-1";
  const currency = store.billingSettings?.currency || "PKR";
  const customer = store.customers.find((person) => person.id === demoId);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.orders
      .filter((order) => order.customerId === demoId)
      .filter((order) => {
        if (!q) return true;
        return (
          order.orderNumber.toLowerCase().includes(q) ||
          order.status.toLowerCase().includes(q) ||
          order.type.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [demoId, query, store.orders]);

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
      key: "items",
      header: "Items",
      render: (row) =>
        row.items.map((item) => `${item.quantity}× ${item.name}`).join(", "),
    },
    {
      key: "total",
      header: "Total",
      render: (row) => formatCurrency(row.total, currency),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "placed",
      header: "Placed",
      render: (row) => formatRelativeTime(row.createdAt),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link href={`/customer/orders/${row.id}`}>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`View ${row.orderNumber}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading orders..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <Alert tone="info">
        Demo session for {customer?.name ?? "guest"} ({demoId}) — order history
        is filtered to this demo customer, not a live login.
      </Alert>

      <Card>
        <CardHeader
          title="My orders"
          description={`History and in-progress tickets for ${customer?.name ?? "demo guest"}`}
          action={
            <div className="w-56">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search orders..."
              />
            </div>
          }
        />
        <CardBody className="p-0">
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No orders yet"
            emptyDescription="When you place an order, it will show up here."
          />
        </CardBody>
      </Card>
    </div>
  );
}
