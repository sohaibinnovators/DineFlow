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
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

type ColumnId = "incoming" | "preparing" | "ready" | "completed";

const columns: Array<{
  id: ColumnId;
  title: string;
  description: string;
  href: string;
  statuses: Order["status"][];
  accent: string;
  header: string;
}> = [
  {
    id: "incoming",
    title: "Incoming",
    description: "Pending & confirmed",
    href: "/kitchen/incoming",
    statuses: ["pending", "confirmed"],
    accent: "border-t-warning",
    header: "bg-amber-50 text-warning",
  },
  {
    id: "preparing",
    title: "Preparing",
    description: "On the line",
    href: "/kitchen/preparing",
    statuses: ["preparing"],
    accent: "border-t-orange",
    header: "bg-accent text-orange",
  },
  {
    id: "ready",
    title: "Ready",
    description: "Expo / pickup",
    href: "/kitchen/ready",
    statuses: ["ready"],
    accent: "border-t-success",
    header: "bg-emerald-50 text-success",
  },
  {
    id: "completed",
    title: "Completed",
    description: "Served & done",
    href: "/kitchen/completed",
    statuses: ["served", "completed"],
    accent: "border-t-navy",
    header: "bg-slate-100 text-navy",
  },
];

export default function KitchenBoardPage() {
  const { hydrated, store, updateOrderStatus, updateKitchenItemStatus } =
    useData();
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilterValue>("all");

  if (!hydrated) return <LoadingState label="Loading kitchen board..." />;

  function byColumn(statuses: Order["status"][]) {
    return store.orders
      .filter(
        (order) =>
          statuses.includes(order.status) &&
          matchesOrderType(order.type, typeFilter),
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Live kitchen display</p>
          <h2 className="font-display text-2xl text-navy">Expo board</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OrderTypeFilter value={typeFilter} onChange={setTypeFilter} />
          <p className="max-w-xs text-sm text-muted">
            Advance tickets from the board — timers turn amber at estimate and
            red when overdue.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {columns.map((column) => {
          const tickets = byColumn(column.statuses);
          return (
            <section
              key={column.id}
              className={cn(
                "flex min-h-[28rem] flex-col rounded-xl border border-border border-t-4 bg-white shadow-sm",
                column.accent,
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-between gap-2 rounded-t-[0.65rem] px-4 py-3",
                  column.header,
                )}
              >
                <div>
                  <p className="font-display text-lg">{column.title}</p>
                  <p className="text-xs opacity-80">{column.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-white/80 px-2 py-0.5 text-sm font-semibold text-navy">
                    {tickets.length}
                  </span>
                  <Link
                    href={column.href}
                    className="text-xs font-medium underline-offset-2 hover:underline"
                  >
                    Open
                  </Link>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin">
                {tickets.length === 0 ? (
                  <EmptyState
                    title="No tickets"
                    description={`Nothing in ${column.title.toLowerCase()} right now.`}
                  />
                ) : (
                  tickets.map((order) => (
                    <OrderTicket
                      key={order.id}
                      order={order}
                      compact
                      onAdvance={(status: OrderStatus) =>
                        updateOrderStatus(order.id, status)
                      }
                      onItemStatus={(menuItemId, itemIndex, kitchenStatus) =>
                        updateKitchenItemStatus(
                          order.id,
                          menuItemId,
                          itemIndex,
                          kitchenStatus,
                        )
                      }
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <Card>
        <CardHeader
          title="Station tips"
          description="Use advance buttons to move tickets through the line"
        />
        <CardBody className="grid gap-3 sm:grid-cols-3 text-sm text-muted">
          <p>
            <span className="font-medium text-navy">Incoming</span> holds new
            tickets waiting to start.
          </p>
          <p>
            <span className="font-medium text-navy">Preparing</span> shows active
            cook time against the estimate.
          </p>
          <p>
            <span className="font-medium text-navy">Ready</span> is expo — runners
            should clear these first.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
