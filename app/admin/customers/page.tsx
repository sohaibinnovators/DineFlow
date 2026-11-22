"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import type { Customer, Order } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

const PAGE_SIZE = 6;

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

export default function AdminCustomersPage() {
  const {
    hydrated,
    store,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  } = useData();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Customer | null>(null);
  const [pageError, setPageError] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return store.customers;
    return store.customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(q) ||
        customer.email.toLowerCase().includes(q) ||
        customer.phone.includes(q) ||
        customer.address.toLowerCase().includes(q),
    );
  }, [query, store.customers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const profileOrders = useMemo(() => {
    if (!profile) return [] as Order[];
    return store.orders
      .filter((order) => order.customerId === profile.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [profile, store.orders]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors([]);
    setOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    });
    setErrors([]);
    setOpen(true);
  }

  function submit() {
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
    };
    const result = editing
      ? updateCustomer(editing.id, payload)
      : addCustomer(payload);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setOpen(false);
  }

  const columns: Column<Customer>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.avatar ? (
            <Image
              src={row.avatar}
              alt={row.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-medium text-orange">
              {row.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
          )}
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
      key: "orders",
      header: "Total orders",
      render: (row) => row.visits,
    },
    {
      key: "spent",
      header: "Total spent",
      render: (row) => formatCurrency(row.totalSpent),
    },
    {
      key: "joined",
      header: "Joined",
      render: (row) => formatDate(row.joinedAt),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setProfile(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPageError([]);
              setDeleteId(row.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  const orderColumns: Column<Order>[] = [
    {
      key: "order",
      header: "Order",
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{row.orderNumber}</p>
          <p className="text-xs text-muted">{formatDate(row.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      render: (row) => (
        <Badge tone={statusTone(row.paymentStatus)}>{row.paymentStatus}</Badge>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (row) => formatCurrency(row.total),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading customers..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      {pageError.length ? (
        <Alert>
          <ul className="list-disc pl-4">
            {pageError.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Customers"
          description="Guest profiles, spend history, and order activity"
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add customer
            </Button>
          }
        />
        <CardBody>
          <div className="mb-4 max-w-md">
            <SearchInput
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="Search customers..."
            />
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No customers found"
          />
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit customer" : "Add customer"}
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Full name"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="guest@email.com"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="+1 555 0100"
            />
          </Field>
          <Field label="Address">
            <Textarea
              value={form.address}
              onChange={(event) =>
                setForm({ ...form, address: event.target.value })
              }
              placeholder="Street, city"
            />
          </Field>
          {errors.length ? (
            <Alert>
              <ul className="list-disc pl-4">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>
              {editing ? "Save changes" : "Create customer"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(profile)}
        onClose={() => setProfile(null)}
        title={profile ? `${profile.name}'s profile` : "Customer profile"}
        className="max-w-2xl"
      >
        {profile ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Email</p>
                <p className="text-sm text-navy">{profile.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Phone</p>
                <p className="text-sm text-navy">{profile.phone}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted">
                  Address
                </p>
                <p className="text-sm text-navy">
                  {profile.address || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Total orders
                </p>
                <p className="text-sm font-medium text-navy">{profile.visits}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Total spent
                </p>
                <p className="text-sm font-medium text-navy">
                  {formatCurrency(profile.totalSpent)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Joined</p>
                <p className="text-sm text-navy">
                  {formatDate(profile.joinedAt)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-medium text-navy">Order history</h3>
              <DataTable
                columns={orderColumns}
                rows={profileOrders}
                emptyTitle="No orders for this guest yet"
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete customer?"
        description="This removes the guest profile. Customers with active orders cannot be deleted."
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          const result = deleteCustomer(deleteId);
          if (!result.ok) setPageError(result.errors);
        }}
      />
    </div>
  );
}
