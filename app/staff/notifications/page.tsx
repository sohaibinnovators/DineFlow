import { Badge, statusTone } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { notifications } from "@/lib/mock-data";
import { formatRelativeTime } from "@/lib/utils";

export default function StaffNotificationsPage() {
  const sorted = [...notifications].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader
          title="Notifications"
          description="Orders, reservations, and floor alerts"
        />
        <CardBody className="space-y-3 p-0">
          {sorted.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Inbox clear"
                description="You're caught up on staff alerts."
              />
            </div>
          ) : (
            sorted.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-navy">{item.title}</p>
                    <Badge tone={statusTone(item.type)}>{item.type}</Badge>
                    {!item.read ? (
                      <Badge tone="orange">Unread</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">{item.message}</p>
                  <p className="mt-2 text-xs text-muted">
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
                {!item.read ? (
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-orange" />
                ) : null}
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
