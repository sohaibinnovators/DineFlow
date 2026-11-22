"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import type { Supplier } from "@/lib/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const EMPTY_FORM = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  category: "Produce",
  status: "active" as Supplier["status"],
  leadTimeDays: "2",
};

export default function AdminSuppliersPage() {
  const {
    hydrated,
    store,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } = useData();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Supplier["status"]>(
    "all",
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(store.suppliers.map((supplier) => supplier.category)),
      ).sort(),
    [store.suppliers],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.suppliers.filter((supplier) => {
      const matchesStatus =
        statusFilter === "all" || supplier.status === statusFilter;
      const matchesQuery =
        !q ||
        supplier.name.toLowerCase().includes(q) ||
        supplier.contactName.toLowerCase().includes(q) ||
        supplier.category.toLowerCase().includes(q) ||
        supplier.email.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, store.suppliers]);

  function linkedItems(supplierId: string) {
    return store.inventory.filter((item) => item.supplierId === supplierId);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors([]);
    setOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      contactName: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      category: supplier.category,
      status: supplier.status,
      leadTimeDays: String(supplier.leadTimeDays),
    });
    setErrors([]);
    setOpen(true);
  }

  function submit() {
    const payload = {
      name: form.name,
      contactName: form.contactName,
      email: form.email,
      phone: form.phone,
      category: form.category,
      status: form.status,
      leadTimeDays: Number(form.leadTimeDays) || 1,
    };
    const result = editing
      ? updateSupplier(editing.id, payload)
      : addSupplier(payload);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setOpen(false);
  }

  function confirmDelete() {
    if (!deleteId) return;
    const result = deleteSupplier(deleteId);
    if (!result.ok) {
      setPageError(result.errors);
      setDeleteId(null);
      return;
    }
    setPageError([]);
    setDeleteId(null);
    if (expandedId === deleteId) setExpandedId(null);
  }

  const columns: Column<Supplier>[] = [
    {
      key: "supplier",
      header: "Supplier",
      render: (row) => (
        <button
          type="button"
          className="text-left"
          onClick={() =>
            setExpandedId((current) => (current === row.id ? null : row.id))
          }
        >
          <p className="font-medium text-navy">{row.name}</p>
          <p className="text-xs text-muted">{row.category}</p>
          <p className="mt-0.5 text-xs text-orange">
            {linkedItems(row.id).length} linked item
            {linkedItems(row.id).length === 1 ? "" : "s"}
          </p>
        </button>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (row) => (
        <div>
          <p className="text-navy">{row.contactName}</p>
          <p className="text-xs text-muted">{row.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => row.phone,
    },
    {
      key: "lead",
      header: "Lead time",
      render: (row) =>
        `${row.leadTimeDays} day${row.leadTimeDays === 1 ? "" : "s"}`,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
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

  if (!hydrated) return <LoadingState label="Loading suppliers..." />;

  const expanded = expandedId
    ? store.suppliers.find((supplier) => supplier.id === expandedId)
    : null;
  const expandedItems = expandedId ? linkedItems(expandedId) : [];

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
          title="Suppliers"
          description="Vendor contacts, lead times, and linked inventory"
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add supplier
            </Button>
          }
        />
        <CardBody>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="max-w-md flex-1">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search suppliers..."
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "all" | Supplier["status"],
                )
              }
              className="sm:w-44"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No suppliers found"
          />
        </CardBody>
      </Card>

      {expanded ? (
        <Card>
          <CardHeader
            title={`Inventory linked to ${expanded.name}`}
            description="Items that order through this supplier"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setExpandedId(null)}
              >
                Close
              </Button>
            }
          />
          <CardBody>
            {expandedItems.length === 0 ? (
              <p className="text-sm text-muted">
                No inventory items are linked to this supplier yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {expandedItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-navy">{item.name}</p>
                      <p className="text-xs text-muted">
                        {item.sku} · {item.category}
                      </p>
                    </div>
                    <p className="text-sm text-navy">
                      {item.quantity} {item.unit}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit supplier" : "Add supplier"}
      >
        <div className="space-y-4">
          {errors.length ? (
            <Alert>
              <ul className="list-disc pl-4">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Supplier name">
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Category">
              <Input
                list="supplier-categories"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              />
              <datalist id="supplier-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </Field>
            <Field label="Contact name">
              <Input
                value={form.contactName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contactName: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Email" className="sm:col-span-2">
              <Input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Lead time (days)">
              <Input
                type="number"
                min={1}
                value={form.leadTimeDays}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    leadTimeDays: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as Supplier["status"],
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>
              {editing ? "Save changes" : "Add supplier"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete supplier?"
        description="Suppliers linked to inventory cannot be deleted until those items are reassigned."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
