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
import { elapsedMinutesSince } from "@/lib/utils";
import { UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";

export default function KitchenPreparingPage() {
  const { hydrated, store, updateOrderStatus, updateKitchenItemStatus } =
    useData();
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilterValue>("all");

  const tickets = useMemo(
    () =>
      store.orders
        .filter(
          (order) =>
            order.status === "preparing" &&
            matchesOrderType(order.type, typeFilter),
        )
        .sort(
          (a, b) =>
            new Date(a.prepStartedAt ?? a.createdAt).getTime() -
            new Date(b.prepStartedAt ?? b.createdAt).getTime(),
        ),
    [store.orders, typeFilter],
  );

  if (!hydrated) return <LoadingState label="Loading prep line..." />;

  const overdue = tickets.filter((order) => {
    const start = order.prepStartedAt ?? order.createdAt;
    const elapsed = elapsedMinutesSince(start);
    return elapsed > (order.estimatedMinutes ?? 20);
  }).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="On the line"
          value={tickets.length}
          icon={UtensilsCrossed}
        />
        <StatCard label="Over estimate" value={overdue} icon={UtensilsCrossed} />
      </div>

      <Card className="border-t-4 border-t-orange">
        <CardHeader
          title="Preparing"
          description="Mark tickets ready when plates hit the pass"
          action={
            <OrderTypeFilter value={typeFilter} onChange={setTypeFilter} />
          }
        />
        <CardBody>
          {tickets.length === 0 ? (
            <EmptyState
              title="Line idle"
              description="No dishes are currently preparing."
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
