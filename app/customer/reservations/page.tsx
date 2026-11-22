"use client";

import { useData } from "@/components/providers/DataProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/EmptyState";
import type { Reservation } from "@/lib/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const CUSTOMER_ID = "cus-1";

export default function CustomerReservationsPage() {
  const { hydrated, store } = useData();

  if (!hydrated) return <LoadingState label="Loading reservations..." />;

  const customer = store.customers.find((person) => person.id === CUSTOMER_ID);
  if (!customer) {
    return (
      <ErrorState
        title="Customer not found"
        description="The demo guest profile could not be loaded from local storage."
      />
    );
  }

  const rows = store.reservations
    .filter(
      (reservation) =>
        reservation.email === customer.email ||
        reservation.guestName === customer.name,
    )
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));

  const upcoming = rows.filter((reservation) =>
    ["pending", "confirmed", "seated"].includes(reservation.status),
  );
  const past = rows.filter((reservation) =>
    ["completed", "cancelled"].includes(reservation.status),
  );

  const columns: Column<Reservation>[] = [
    {
      key: "when",
      header: "When",
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{formatDate(row.date)}</p>
          <p className="text-xs text-muted">{row.time}</p>
        </div>
      ),
    },
    {
      key: "party",
      header: "Party",
      render: (row) => row.partySize,
    },
    {
      key: "table",
      header: "Table",
      render: (row) =>
        store.tables.find((table) => table.id === row.tableId)?.number ?? "TBD",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (row) => row.notes ?? "—",
    },
    {
      key: "booked",
      header: "Booked",
      render: (row) => formatRelativeTime(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-sm text-muted">Upcoming</p>
            <p className="mt-2 font-display text-3xl text-navy">
              {upcoming.length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-muted">Past visits</p>
            <p className="mt-2 font-display text-3xl text-navy">{past.length}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="My reservations"
          description={`Bookings under ${customer.name}`}
        />
        <CardBody className="p-0">
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No reservations"
                description="Reserve a table from the public site to see it here."
              />
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
