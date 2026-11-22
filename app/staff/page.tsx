"use client";

import { useData } from "@/components/providers/DataProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { notifications } from "@/lib/mock-data";
import { DEMO_NOW, formatCurrency, formatRelativeTime } from "@/lib/utils";
import {
  Bell,
  CalendarDays,
  ShoppingBag,
  Table2,
  Users,
} from "lucide-react";
import Link from "next/link";

const STAFF_ID = "stf-2";

export default function StaffOverviewPage() {
  const { hydrated, store } = useData();

  if (!hydrated) return <LoadingState label="Loading staff overview..." />;

  const today = new Date(DEMO_NOW).toISOString().slice(0, 10);
  const myOrders = store.orders.filter(
    (order) => order.assignedStaffId === STAFF_ID,
  );
  const activeOrders = myOrders.filter((order) =>
    ["pending", "confirmed", "preparing", "ready", "served"].includes(
      order.status,
    ),
  );
  const readyToServe = myOrders.filter((order) => order.status === "ready");
  const occupiedTables = store.tables.filter(
    (table) => table.status === "occupied",
  );
  const tonightReservations = store.reservations.filter(
    (reservation) =>
      reservation.date === today &&
      ["pending", "confirmed", "seated"].includes(reservation.status),
  );
  const unread = notifications.filter((item) => !item.read).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My Active Orders"
          value={activeOrders.length}
          icon={ShoppingBag}
        />
        <StatCard
          label="Ready to Serve"
          value={readyToServe.length}
          icon={Bell}
        />
        <StatCard
          label="Occupied Tables"
          value={occupiedTables.length}
          icon={Table2}
        />
        <StatCard
          label="Tonight's Reservations"
          value={tonightReservations.length}
          icon={CalendarDays}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Assigned Orders"
            description="Tickets on your section right now"
            action={
              <Link
                href="/staff/orders"
                className="text-sm font-medium text-orange hover:underline"
              >
                View all
              </Link>
            }
          />
          <CardBody className="space-y-3 p-0">
            {myOrders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy">
                    {order.orderNumber}
                    {order.tableNumber ? ` · ${order.tableNumber}` : ""}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {order.customerName} · {formatCurrency(order.total)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                  <span className="text-xs text-muted">
                    {formatRelativeTime(order.createdAt)}
                  </span>
                </div>
              </div>
            ))}
            {myOrders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                No assigned orders yet.
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Floor Snapshot"
            description="Tables and upcoming reservations"
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["available", "Available"],
                  ["occupied", "Occupied"],
                  ["reserved", "Reserved"],
                  ["cleaning", "Cleaning"],
                ] as const
              ).map(([status, label]) => (
                <div
                  key={status}
                  className="rounded-lg border border-border bg-slate-50 px-3 py-3 text-center"
                >
                  <p className="font-display text-xl text-navy">
                    {
                      store.tables.filter((table) => table.status === status)
                        .length
                    }
                  </p>
                  <p className="mt-1 text-xs text-muted">{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-navy">Upcoming seating</p>
              {tonightReservations.slice(0, 4).map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-navy">
                      {reservation.guestName}
                    </p>
                    <p className="text-xs text-muted">
                      {reservation.time} · Party of {reservation.partySize}
                    </p>
                  </div>
                  <Badge tone={statusTone(reservation.status)}>
                    {reservation.status}
                  </Badge>
                </div>
              ))}
              {tonightReservations.length === 0 ? (
                <p className="text-sm text-muted">No reservations for tonight.</p>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Regular Guests"
            description="Frequent diners on the floor"
            action={
              <Link
                href="/staff/customers"
                className="text-sm font-medium text-orange hover:underline"
              >
                Directory
              </Link>
            }
          />
          <CardBody className="space-y-3 p-0">
            {[...store.customers]
              .sort((a, b) => b.visits - a.visits)
              .slice(0, 4)
              .map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                      {customer.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <div>
                      <p className="font-medium text-navy">{customer.name}</p>
                      <p className="text-xs text-muted">
                        {customer.visits} visits ·{" "}
                        {formatCurrency(customer.totalSpent)}
                      </p>
                    </div>
                  </div>
                  <Users className="h-4 w-4 text-muted" />
                </div>
              ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Alerts"
            description={`${unread} unread notification${unread === 1 ? "" : "s"}`}
            action={
              <Link
                href="/staff/notifications"
                className="text-sm font-medium text-orange hover:underline"
              >
                Open inbox
              </Link>
            }
          />
          <CardBody className="space-y-3 p-0">
            {notifications.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="border-b border-border/70 px-5 py-3 last:border-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-navy">{item.title}</p>
                    <p className="mt-1 text-sm text-muted">{item.message}</p>
                  </div>
                  {!item.read ? (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange" />
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted">
                  {formatRelativeTime(item.createdAt)}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
