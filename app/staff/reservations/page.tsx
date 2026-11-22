"use client";

import { useData } from "@/components/providers/DataProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import type { Reservation } from "@/lib/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { useMemo, useState } from "react";

export default function StaffReservationsPage() {
  const { hydrated, store } = useData();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.reservations
      .filter((reservation) => {
        if (!q) return true;
        return (
          reservation.guestName.toLowerCase().includes(q) ||
          reservation.email.toLowerCase().includes(q) ||
          reservation.phone.includes(q)
        );
      })
      .sort((a, b) => {
        const aKey = `${a.date} ${a.time}`;
        const bKey = `${b.date} ${b.time}`;
        return aKey.localeCompare(bKey);
      });
  }, [query, store.reservations]);

  const columns: Column<Reservation>[] = [
    {
      key: "guest",
      header: "Guest",
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{row.guestName}</p>
          <p className="text-xs text-muted">{row.phone}</p>
        </div>
      ),
    },
    {
      key: "when",
      header: "When",
      render: (row) => (
        <div>
          <p>{formatDate(row.date)}</p>
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
        store.tables.find((table) => table.id === row.tableId)?.number ??
        "Unassigned",
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
      render: (row) => (
        <span className="max-w-[180px] truncate text-muted">
          {row.notes ?? "—"}
        </span>
      ),
    },
    {
      key: "booked",
      header: "Booked",
      render: (row) => formatRelativeTime(row.createdAt),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading reservations..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader
          title="Reservations"
          description="Confirm arrivals and seat parties on time"
          action={
            <div className="w-56">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search guests..."
              />
            </div>
          }
        />
        <CardBody className="p-0">
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No reservations found"
            emptyDescription="Try a different guest name or phone number."
          />
        </CardBody>
      </Card>
    </div>
  );
}
