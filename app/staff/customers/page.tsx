"use client";

import { useData } from "@/components/providers/DataProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import type { Customer } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useMemo, useState } from "react";

export default function StaffCustomersPage() {
  const { hydrated, store } = useData();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.customers
      .filter((customer) => {
        if (!q) return true;
        return (
          customer.name.toLowerCase().includes(q) ||
          customer.email.toLowerCase().includes(q) ||
          customer.phone.includes(q)
        );
      })
      .sort((a, b) => b.visits - a.visits);
  }, [query, store.customers]);

  const columns: Column<Customer>[] = [
    {
      key: "guest",
      header: "Guest",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
            {row.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div>
            <p className="font-medium text-navy">{row.name}</p>
            <p className="text-xs text-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => row.phone,
    },
    {
      key: "visits",
      header: "Visits",
      render: (row) => row.visits,
    },
    {
      key: "spent",
      header: "Lifetime spend",
      render: (row) => formatCurrency(row.totalSpent),
    },
    {
      key: "favorites",
      header: "Favorites",
      render: (row) => {
        const names = row.favoriteDishIds
          .map(
            (id) => store.menuItems.find((item) => item.id === id)?.name,
          )
          .filter(Boolean)
          .slice(0, 2)
          .join(", ");
        return <span className="text-muted">{names || "—"}</span>;
      },
    },
    {
      key: "joined",
      header: "Joined",
      render: (row) => formatDate(row.joinedAt),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading guests..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader
          title="Guest directory"
          description="Recognize regulars and note preferences"
          action={
            <div className="w-56">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search customers..."
              />
            </div>
          }
        />
        <CardBody className="p-0">
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No customers found"
            emptyDescription="Adjust your search to find a guest."
          />
        </CardBody>
      </Card>
    </div>
  );
}
