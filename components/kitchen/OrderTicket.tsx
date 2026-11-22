"use client";

import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { KitchenItemStatus, Order, OrderStatus } from "@/lib/types";
import { cn, elapsedMinutesSince, formatRelativeTime } from "@/lib/utils";
import { ChevronDown, Clock } from "lucide-react";
import { useState } from "react";

const columnAccent: Record<string, string> = {
  pending: "border-l-warning bg-amber-50/50",
  confirmed: "border-l-info bg-blue-50/40",
  preparing: "border-l-orange bg-accent/70",
  ready: "border-l-success bg-emerald-50/50",
  served: "border-l-navy bg-slate-50",
  completed: "border-l-success bg-emerald-50/30",
  cancelled: "border-l-danger bg-red-50/40",
};

const FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
];

const ITEM_FLOW: KitchenItemStatus[] = ["pending", "preparing", "ready"];

function prepTone(elapsed: number, estimate: number) {
  if (elapsed >= estimate + 5) return "text-danger";
  if (elapsed >= estimate) return "text-warning";
  return "text-success";
}

function nextStatus(status: OrderStatus): OrderStatus | null {
  if (status === "served") return "completed";
  const index = FLOW.indexOf(status);
  if (index === -1 || index >= FLOW.length - 1) return null;
  return FLOW[index + 1];
}

function advanceLabel(status: OrderStatus) {
  const map: Partial<Record<OrderStatus, string>> = {
    pending: "Confirm",
    confirmed: "Start preparing",
    preparing: "Mark ready",
    ready: "Complete",
    served: "Complete",
  };
  return map[status] ?? "Advance";
}

function nextItemStatus(status: KitchenItemStatus): KitchenItemStatus | null {
  const index = ITEM_FLOW.indexOf(status);
  if (index === -1 || index >= ITEM_FLOW.length - 1) return null;
  return ITEM_FLOW[index + 1];
}

function itemStatusLabel(status: KitchenItemStatus) {
  const map: Record<KitchenItemStatus, string> = {
    pending: "Start item",
    preparing: "Item ready",
    ready: "Ready",
  };
  return map[status];
}

export function OrderTicket({
  order,
  compact = false,
  onAdvance,
  onItemStatus,
}: {
  order: Order;
  compact?: boolean;
  onAdvance?: (status: OrderStatus) => void;
  onItemStatus?: (
    menuItemId: string,
    itemIndex: number,
    kitchenStatus: KitchenItemStatus,
  ) => void;
}) {
  const [expanded, setExpanded] = useState(!compact);
  const start = order.prepStartedAt ?? order.createdAt;
  const elapsed = elapsedMinutesSince(start);
  const estimate = order.estimatedMinutes ?? 20;
  const delayed = elapsed > estimate;
  const advance = onAdvance ? nextStatus(order.status) : null;
  const showItems = expanded || !compact;

  return (
    <article
      className={cn(
        "rounded-xl border border-border border-l-4 bg-white p-4 shadow-sm transition",
        columnAccent[order.status] ?? "border-l-slate-300",
        delayed && "ring-2 ring-danger/40 shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg text-navy">{order.orderNumber}</p>
          <p className="mt-0.5 text-sm text-muted">
            {order.tableNumber
              ? `Table ${order.tableNumber}`
              : order.type.replace("-", " ")}
            {" · "}
            {order.customerName}
          </p>
          <p className="mt-0.5 text-xs capitalize text-muted">
            {order.type.replace("-", " ")}
            {delayed ? (
              <span className="ml-2 font-semibold text-danger">Delayed</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={statusTone(order.status)}>{order.status}</Badge>
          {compact ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-navy"
            >
              {expanded ? "Less" : "Details"}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition",
                  expanded && "rotate-180",
                )}
              />
            </button>
          ) : null}
        </div>
      </div>

      {showItems ? (
        <ul className={cn("mt-3 space-y-2", compact && "mt-2")}>
          {order.items.map((item, index) => {
            const kitchenStatus = item.kitchenStatus ?? "pending";
            const next = onItemStatus ? nextItemStatus(kitchenStatus) : null;
            return (
              <li
                key={`${order.id}-${item.menuItemId}-${index}`}
                className="rounded-lg border border-border/70 bg-white/70 px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-navy">
                      <span className="font-semibold">{item.quantity}×</span>{" "}
                      {item.name}
                    </p>
                    {item.notes ? (
                      <span className="mt-0.5 block text-xs text-muted">
                        {item.notes}
                      </span>
                    ) : null}
                  </div>
                  <Badge tone={statusTone(kitchenStatus)}>{kitchenStatus}</Badge>
                </div>
                {next ? (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-full text-xs"
                      onClick={() =>
                        onItemStatus?.(item.menuItemId, index, next)
                      }
                    >
                      {itemStatusLabel(kitchenStatus)}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">
          {order.items.length} item{order.items.length === 1 ? "" : "s"}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium",
            prepTone(elapsed, estimate),
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          {elapsed}m / {estimate}m est.
        </span>
        <span className="text-muted">{formatRelativeTime(order.createdAt)}</span>
      </div>

      {advance ? (
        <div className="mt-3">
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={() => onAdvance?.(advance)}
          >
            {advanceLabel(order.status)}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
