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
import { Package } from "lucide-react";
import { useMemo, useState } from "react";

export default function KitchenCompletedPage() {
  const { hydrated, store } = useData();
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilterValue>("all");

  const tickets = useMemo(
    () =>
      store.orders
        .filter(
          (order) =>
            ["served", "completed"].includes(order.status) &&
            matchesOrderType(order.type, typeFilter),
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [store.orders, typeFilter],
  );

  if (!hydrated) return <LoadingState label="Loading completed tickets..." />;

  const served = tickets.filter((order) => order.status === "served").length;
  const completed = tickets.filter(
    (order) => order.status === "completed",
  ).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Served" value={served} icon={Package} />
        <StatCard label="Completed" value={completed} icon={Package} />
      </div>

      <Card className="border-t-4 border-t-navy">
        <CardHeader
          title="Completed"
          description="Recently served and closed kitchen tickets"
          action={
            <OrderTypeFilter value={typeFilter} onChange={setTypeFilter} />
          }
        />
        <CardBody>
          {tickets.length === 0 ? (
            <EmptyState
              title="No completed tickets"
              description="Finished plates will land here after service."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tickets.map((order) => (
                <OrderTicket key={order.id} order={order} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
