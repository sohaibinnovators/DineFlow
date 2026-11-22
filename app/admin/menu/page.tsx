"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import type { MenuItem } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

const PAGE_SIZE = 8;
const EMPTY_FORM = {
  name: "",
  description: "",
  categoryId: "",
  price: "0",
  image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
  prepTimeMinutes: "15",
  available: true,
  featured: false,
  popular: false,
  tags: "",
};

type SortKey = "name" | "price" | "date";

export default function AdminMenuPage() {
  const {
    hydrated,
    store,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuAvailability,
    toggleMenuFeatured,
  } = useData();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = store.menuItems.filter((item) => {
      const matchesCategory = category === "all" || item.categoryId === category;
      const matchesAvailability =
        availability === "all" ||
        (availability === "available" && item.available) ||
        (availability === "unavailable" && !item.available);
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchesCategory && matchesAvailability && matchesQuery;
    });

    rows.sort((a, b) => {
      if (sort === "price") return a.price - b.price;
      if (sort === "date") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [availability, category, query, sort, store.menuItems]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      categoryId: store.categories[0]?.id ?? "",
    });
    setErrors([]);
    setOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description,
      categoryId: item.categoryId,
      price: String(item.price),
      image: item.image,
      prepTimeMinutes: String(item.prepTimeMinutes),
      available: item.available,
      featured: item.featured,
      popular: item.popular,
      tags: item.tags.join(", "),
    });
    setErrors([]);
    setOpen(true);
  }

  function submit() {
    const payload = {
      name: form.name,
      description: form.description,
      categoryId: form.categoryId,
      price: Number(form.price),
      image: form.image,
      prepTimeMinutes: Number(form.prepTimeMinutes),
      available: form.available,
      featured: form.featured,
      popular: form.popular,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    const result = editing
      ? updateMenuItem(editing.id, payload)
      : addMenuItem(payload);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setOpen(false);
  }

  const columns: Column<MenuItem>[] = [
    {
      key: "item",
      header: "Item",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Image
            src={row.image}
            alt={row.name}
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-cover"
          />
          <div>
            <p className="font-medium text-navy">{row.name}</p>
            <p className="max-w-xs truncate text-xs text-muted">{row.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => <span className="capitalize">{row.categorySlug}</span>,
    },
    {
      key: "price",
      header: "Price",
      render: (row) => formatCurrency(row.price),
    },
    {
      key: "prep",
      header: "Prep",
      render: (row) => `${row.prepTimeMinutes}m`,
    },
    {
      key: "flags",
      header: "Status",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={row.available ? "success" : "danger"}>
            {row.available ? "Available" : "Unavailable"}
          </Badge>
          {row.featured ? <Badge tone="orange">Featured</Badge> : null}
        </div>
      ),
    },
    {
      key: "created",
      header: "Created",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleMenuAvailability(row.id)}
            title="Toggle availability"
          >
            {row.available ? "Hide" : "Show"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleMenuFeatured(row.id)}
            title="Toggle featured"
          >
            <Star
              className={`h-4 w-4 ${row.featured ? "fill-orange text-orange" : ""}`}
            />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}>
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading menu data..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader
          title="Menu Management"
          description="Add, edit, and feature dishes across categories"
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <SearchInput
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="Search dishes..."
            />
            <Select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All categories</option>
              {store.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select
              value={availability}
              onChange={(event) => {
                setAvailability(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All availability</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </Select>
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              <option value="name">Sort by name</option>
              <option value="price">Sort by price</option>
              <option value="date">Sort by date</option>
            </Select>
          </div>
          <DataTable columns={columns} rows={rows} />
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit menu item" : "Add menu item"}
        className="max-w-2xl"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </Field>
          <Field label="Category">
            <Select
              value={form.categoryId}
              onChange={(event) =>
                setForm({ ...form, categoryId: event.target.value })
              }
            >
              {store.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Price">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </Field>
          <Field label="Prep time (minutes)">
            <Input
              type="number"
              min="0"
              value={form.prepTimeMinutes}
              onChange={(event) =>
                setForm({ ...form, prepTimeMinutes: event.target.value })
              }
            />
          </Field>
          <Field label="Image URL">
            <Input
              value={form.image}
              onChange={(event) => setForm({ ...form, image: event.target.value })}
            />
          </Field>
          <Field label="Tags (comma separated)" className="sm:col-span-2">
            <Input
              value={form.tags}
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(event) =>
                setForm({ ...form, available: event.target.checked })
              }
            />
            Available
          </label>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) =>
                setForm({ ...form, featured: event.target.checked })
              }
            />
            Featured
          </label>
        </div>
        {errors.length ? (
          <Alert className="mt-3">
            <ul className="list-disc pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{editing ? "Save changes" : "Create item"}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete menu item?"
        description="This removes the dish from the admin and public menus. Historical orders keep their snapshots."
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteMenuItem(deleteId);
        }}
      />
    </div>
  );
}
