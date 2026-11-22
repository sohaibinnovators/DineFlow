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
import { Receipt } from "lucide-react";
import { useMemo, useState } from "react";

export default function KitchenReadyPage() {
  const { hydrated, store, updateOrderStatus, updateKitchenItemStatus } =
    useData();
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilterValue>("all");

  const tickets = useMemo(
    () =>
      store.orders
        .filter(
          (order) =>
            order.status === "ready" &&
            matchesOrderType(order.type, typeFilter),
        )
        .sort(
          (a, b) =>
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
        ),
    [store.orders, typeFilter],
  );

  if (!hydrated) return <LoadingState label="Loading expo..." />;

  const dineIn = tickets.filter((order) => order.type === "dine-in").length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Ready for expo" value={tickets.length} icon={Receipt} />
        <StatCard label="Dine-in ready" value={dineIn} icon={Receipt} />
      </div>

      <Card className="border-t-4 border-t-success">
        <CardHeader
          title="Ready"
          description="Complete tickets after runners clear the pass"
          action={
            <OrderTypeFilter value={typeFilter} onChange={setTypeFilter} />
          }
        />
        <CardBody>
          {tickets.length === 0 ? (
            <EmptyState
              title="Expo clear"
              description="No tickets are marked ready."
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
