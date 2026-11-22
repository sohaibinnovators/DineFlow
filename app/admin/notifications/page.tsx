"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { notifications as initialNotifications } from "@/lib/mock-data";
import type { NotificationItem } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Bell, CheckCheck } from "lucide-react";
import { useMemo, useState } from "react";

const typeTone: Record<
  NotificationItem["type"],
  "orange" | "info" | "warning" | "navy" | "success"
> = {
  order: "orange",
  reservation: "info",
  inventory: "warning",
  system: "navy",
  promo: "success",
};

function NotificationList({
  list,
  onMarkRead,
}: {
  list: NotificationItem[];
  onMarkRead: (id: string) => void;
}) {
  if (list.length === 0) {
    return (
      <EmptyState
        title="All caught up"
        description="There are no notifications in this view."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {list.map((item) => (
        <li
          key={item.id}
          className={cn(
            "rounded-xl border border-border p-4 transition",
            item.read ? "bg-white" : "bg-accent/60",
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="mt-0.5 rounded-lg bg-white p-2 text-orange shadow-sm">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-navy">{item.title}</p>
                  <Badge tone={typeTone[item.type]}>{item.type}</Badge>
                  {!item.read ? <Badge tone="orange">Unread</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted">{item.message}</p>
                <p className="mt-2 text-xs text-muted">
                  {formatRelativeTime(item.createdAt)}
                </p>
              </div>
            </div>
            {!item.read ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkRead(item.id)}
              >
                Mark read
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState(initialNotifications);

  const unread = useMemo(
    () => items.filter((item) => !item.read),
    [items],
  );

  function markAllRead() {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  }

  function markRead(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader
          title="Notifications"
          description="Orders, inventory alerts, reservations, and system updates"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              disabled={unread.length === 0}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          }
        />
        <CardBody>
          <Tabs
            tabs={[
              {
                id: "all",
                label: `All (${items.length})`,
                content: <NotificationList list={items} onMarkRead={markRead} />,
              },
              {
                id: "unread",
                label: `Unread (${unread.length})`,
                content: (
                  <NotificationList list={unread} onMarkRead={markRead} />
                ),
              },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}
