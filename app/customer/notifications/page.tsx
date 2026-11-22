"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export default function CustomerNotificationsPage() {
  const {
    hydrated,
    store,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
  } = useData();
  const demoId = store.engagement.demoCustomerId;
  const notifications = store.engagement.customerNotifications
    .filter((notification) => notification.customerId === demoId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  if (!hydrated) return <LoadingState label="Loading notifications..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <Alert tone="info">
        In-app demo notifications for <strong>{demoId}</strong>. No email/SMS.
      </Alert>

      <Card>
        <CardHeader
          title="Notifications"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllNotificationsRead(demoId)}
            >
              Mark all read
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted">No notifications yet.</p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-navy">
                        {notification.title}
                      </p>
                      {!notification.read ? (
                        <Badge tone="orange">Unread</Badge>
                      ) : null}
                      <Badge>{notification.type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!notification.read ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markNotificationRead(notification.id)}
                      >
                        Mark read
                      </Button>
                    ) : null}
                    {notification.href ? (
                      <Link href={notification.href}>
                        <Button size="sm" variant="ghost">
                          Open
                        </Button>
                      </Link>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
