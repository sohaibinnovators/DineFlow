"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import type { FoodCategory } from "@/lib/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80";

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  image: DEFAULT_IMAGE,
};

export default function AdminCategoriesPage() {
  const {
    hydrated,
    store,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useData();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FoodCategory | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [simpleDelete, setSimpleDelete] = useState<FoodCategory | null>(null);
  const [linkedDelete, setLinkedDelete] = useState<FoodCategory | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [forceDelete, setForceDelete] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [pageError, setPageError] = useState<string[]>([]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return store.categories;
    return store.categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q) ||
        cat.slug.toLowerCase().includes(q),
    );
  }, [query, store.categories]);

  const otherCategories = useMemo(
    () => store.categories.filter((cat) => cat.id !== linkedDelete?.id),
    [linkedDelete?.id, store.categories],
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors([]);
    setOpen(true);
  }

  function openEdit(category: FoodCategory) {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
    });
    setErrors([]);
    setOpen(true);
  }

  function openDelete(category: FoodCategory) {
    setPageError([]);
    setDeleteErrors([]);
    if (category.itemCount > 0) {
      setReassignTo("");
      setForceDelete(false);
      setLinkedDelete(category);
      return;
    }
    setSimpleDelete(category);
  }

  function submit() {
    const payload = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description,
      image: form.image,
    };
    const result = editing
      ? updateCategory(editing.id, payload)
      : addCategory(payload);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setOpen(false);
  }

  function confirmLinkedDelete() {
    if (!linkedDelete) return;
    const result = forceDelete
      ? deleteCategory(linkedDelete.id, { force: true })
      : deleteCategory(linkedDelete.id, {
          reassignToCategoryId: reassignTo || undefined,
        });
    if (!result.ok) {
      setDeleteErrors(result.errors);
      return;
    }
    setLinkedDelete(null);
  }

  const columns: Column<FoodCategory>[] = [
    {
      key: "category",
      header: "Category",
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
            <p className="text-xs text-muted">/{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      className: "max-w-md",
      render: (row) => (
        <span className="whitespace-normal text-muted">{row.description}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (row) => <Badge tone="navy">{row.itemCount} dishes</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openDelete(row)}>
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading categories..." />;

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
          title="Categories"
          description="Organize the guest menu into clear sections"
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add category
            </Button>
          }
        />
        <CardBody>
          <div className="mb-4 max-w-md">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search categories..."
            />
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No categories found"
          />
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit category" : "Add category"}
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Starters"
            />
          </Field>
          <Field label="Slug">
            <Input
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              placeholder="starters (optional)"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder="Short section description..."
            />
          </Field>
          <Field label="Image URL">
            <Input
              value={form.image}
              onChange={(event) => setForm({ ...form, image: event.target.value })}
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
              {editing ? "Save changes" : "Create category"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(simpleDelete)}
        title="Delete category?"
        description={
          simpleDelete
            ? `Remove "${simpleDelete.name}" from the menu sections.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        onClose={() => setSimpleDelete(null)}
        onConfirm={() => {
          if (!simpleDelete) return;
          const result = deleteCategory(simpleDelete.id);
          if (!result.ok) setPageError(result.errors);
        }}
      />

      <Modal
        open={Boolean(linkedDelete)}
        onClose={() => setLinkedDelete(null)}
        title="Delete category?"
      >
        {linkedDelete ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              &ldquo;{linkedDelete.name}&rdquo; has {linkedDelete.itemCount} menu
              item(s). Reassign them to another category, or force delete the
              items.
            </p>
            <Field label="Reassign items to">
              <Select
                value={reassignTo}
                disabled={forceDelete}
                onChange={(event) => setReassignTo(event.target.value)}
              >
                <option value="">Select category</option>
                {otherCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={forceDelete}
                onChange={(event) => {
                  setForceDelete(event.target.checked);
                  if (event.target.checked) setReassignTo("");
                }}
              />
              Force delete items with this category
            </label>
            {deleteErrors.length ? (
              <Alert>
                <ul className="list-disc pl-4">
                  {deleteErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkedDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmLinkedDelete}>
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
