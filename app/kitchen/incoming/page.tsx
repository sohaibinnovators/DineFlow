"use client";

import { OrderTicket } from "@/components/kitchen/OrderTicket";
import {
  matchesOrderType,
  OrderTypeFilter,
  type OrderTypeFilterValue,
} from "@/components/kitchen/OrderTypeFilter";
import { useData } from "@/components/providers/DataProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState, LoadingState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";

export default function KitchenIncomingPage() {
  const { hydrated, store, updateOrderStatus, updateKitchenItemStatus } =
    useData();
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilterValue>("all");

  const tickets = useMemo(
    () =>
      store.orders
        .filter(
          (order) =>
            ["pending", "confirmed"].includes(order.status) &&
            matchesOrderType(order.type, typeFilter),
        )
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [store.orders, typeFilter],
  );

  if (!hydrated) return <LoadingState label="Loading incoming queue..." />;

  const pending = tickets.filter((order) => order.status === "pending").length;
  const confirmed = tickets.filter(
    (order) => order.status === "confirmed",
  ).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Pending" value={pending} icon={ClipboardList} />
        <StatCard label="Confirmed" value={confirmed} icon={ClipboardList} />
      </div>

      <Card className="border-t-4 border-t-warning">
        <CardHeader
          title="Incoming queue"
          description="Confirm tickets, then start preparing when the line is ready"
          action={
            <OrderTypeFilter value={typeFilter} onChange={setTypeFilter} />
          }
        />
        <CardBody>
          {tickets.length === 0 ? (
            <EmptyState
              title="Queue clear"
              description="No pending or confirmed tickets waiting."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tickets.map((order) => (
                <OrderTicket
                  key={order.id}
                  order={order}
                  onAdvance={(status) => updateOrderStatus(order.id, status)}
                  onItemStatus={(menuItemId, itemIndex, kitchenStatus) =>
                    updateKitchenItemStatus(
                      order.id,
                      menuItemId,
                      itemIndex,
                      kitchenStatus,
                    )
                  }
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
