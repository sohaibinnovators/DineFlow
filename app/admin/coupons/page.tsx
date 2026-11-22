"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import type { Coupon, DiscountType } from "@/lib/types";
import { DEMO_NOW, formatCurrency, formatDate } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const PAGE_SIZE = 8;

type CouponForm = {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderAmount: string;
  maxDiscount: string;
  startDate: string;
  expiryDate: string;
  usageLimit: string;
  perCustomerLimit: string;
  applicableCategoryIds: string[];
  applicableMenuItemIds: string[];
  active: boolean;
};

function emptyForm(): CouponForm {
  const today = new Date(DEMO_NOW).toISOString().slice(0, 10);
  return {
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minOrderAmount: "0",
    maxDiscount: "",
    startDate: today,
    expiryDate: "2027-12-31",
    usageLimit: "",
    perCustomerLimit: "",
    applicableCategoryIds: [],
    applicableMenuItemIds: [],
    active: true,
  };
}

function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
}

export default function AdminCouponsPage() {
  const {
    hydrated,
    store,
    saveCoupon,
    deleteCoupon,
    setCouponActive,
  } = useData();
  const currency = store.billingSettings.currency || "PKR";

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.engagement.coupons.filter((coupon) => {
      const matchesStatus =
        status === "all" ||
        (status === "active" ? coupon.active : !coupon.active);
      const matchesQuery =
        !q ||
        coupon.code.toLowerCase().includes(q) ||
        coupon.description.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [query, status, store.engagement.coupons]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setErrors([]);
    setOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrderAmount: String(coupon.minOrderAmount),
      maxDiscount:
        coupon.maxDiscount === undefined ? "" : String(coupon.maxDiscount),
      startDate: coupon.startDate.slice(0, 10),
      expiryDate: coupon.expiryDate.slice(0, 10),
      usageLimit:
        coupon.usageLimit === undefined ? "" : String(coupon.usageLimit),
      perCustomerLimit:
        coupon.perCustomerLimit === undefined
          ? ""
          : String(coupon.perCustomerLimit),
      applicableCategoryIds: [...coupon.applicableCategoryIds],
      applicableMenuItemIds: [...coupon.applicableMenuItemIds],
      active: coupon.active,
    });
    setErrors([]);
    setOpen(true);
  }

  function submit() {
    const payload = {
      id: editing?.id,
      code: form.code,
      description: form.description,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: Number(form.minOrderAmount) || 0,
      maxDiscount: form.maxDiscount === "" ? undefined : Number(form.maxDiscount),
      startDate: form.startDate,
      expiryDate: form.expiryDate,
      usageLimit: form.usageLimit === "" ? undefined : Number(form.usageLimit),
      perCustomerLimit:
        form.perCustomerLimit === ""
          ? undefined
          : Number(form.perCustomerLimit),
      applicableCategoryIds: form.applicableCategoryIds,
      applicableMenuItemIds: form.applicableMenuItemIds,
      active: form.active,
      createdAt: editing?.createdAt,
    };
    const result = saveCoupon(payload);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setOpen(false);
  }

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      header: "Coupon",
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{row.code}</p>
          <p className="text-xs text-muted line-clamp-1">{row.description}</p>
        </div>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      render: (row) =>
        row.discountType === "percentage"
          ? `${row.discountValue}%`
          : formatCurrency(row.discountValue, currency),
    },
    {
      key: "min",
      header: "Min order",
      render: (row) => formatCurrency(row.minOrderAmount, currency),
    },
    {
      key: "dates",
      header: "Validity",
      render: (row) => (
        <span className="text-xs text-muted">
          {formatDate(row.startDate)} – {formatDate(row.expiryDate)}
        </span>
      ),
    },
    {
      key: "usage",
      header: "Usage",
      render: (row) =>
        row.usageLimit === undefined
          ? `${row.usageCount}`
          : `${row.usageCount}/${row.usageLimit}`,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={statusTone(row.active ? "active" : "inactive")}>
          {row.active ? "active" : "inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPageError([]);
              const result = setCouponActive(row.id, !row.active);
              if (!result.ok) setPageError(result.errors);
            }}
          >
            {row.active ? "Disable" : "Enable"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openEdit(row)}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setPageError([]);
              setDeleteId(row.id);
            }}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading coupons..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      {pageError.length > 0 ? (
        <Alert tone="danger">
          <ul className="list-disc pl-4">
            {pageError.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Total coupons</p>
          <p className="mt-2 font-display text-2xl text-navy">
            {store.engagement.coupons.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Active</p>
          <p className="mt-2 font-display text-2xl text-navy">
            {store.engagement.coupons.filter((coupon) => coupon.active).length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Total redemptions</p>
          <p className="mt-2 font-display text-2xl text-navy">
            {store.engagement.couponUsages.length}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Coupons"
          description="Create and manage promotional codes"
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add coupon
            </Button>
          }
        />
        <CardBody>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="max-w-md flex-1">
              <SearchInput
                value={query}
                onChange={(value) => {
                  setQuery(value);
                  setPage(1);
                }}
                placeholder="Search by code or description..."
              />
            </div>
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "all" | "active" | "inactive");
                setPage(1);
              }}
              className="lg:w-44"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No coupons found"
          />
          <div className="mt-4">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
            />
          </div>
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit coupon" : "Add coupon"}
      >
        <div className="space-y-4">
          {errors.length > 0 ? (
            <Alert tone="danger">
              <ul className="list-disc pl-4">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="WELCOME10"
              />
            </Field>
            <Field label="Discount type">
              <Select
                value={form.discountType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    discountType: event.target.value as DiscountType,
                  }))
                }
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed ({currency})</option>
              </Select>
            </Field>
            <Field
              label={
                form.discountType === "percentage"
                  ? "Discount %"
                  : `Discount (${currency})`
              }
            >
              <Input
                type="number"
                min={0}
                step={form.discountType === "percentage" ? 1 : 0.01}
                value={form.discountValue}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    discountValue: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label={`Min order (${currency})`}>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.minOrderAmount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    minOrderAmount: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label={`Max discount (${currency}, optional)`}>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.maxDiscount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    maxDiscount: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Usage limit (optional)">
              <Input
                type="number"
                min={0}
                value={form.usageLimit}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    usageLimit: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Per-customer limit (optional)">
              <Input
                type="number"
                min={0}
                value={form.perCustomerLimit}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    perCustomerLimit: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Start date">
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Expiry date">
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    expiryDate: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={2}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-navy">
                Categories (optional)
              </p>
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                {store.categories.length === 0 ? (
                  <p className="text-xs text-muted">No categories</p>
                ) : (
                  store.categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 text-sm text-navy"
                    >
                      <input
                        type="checkbox"
                        checked={form.applicableCategoryIds.includes(
                          category.id,
                        )}
                        onChange={() =>
                          setForm((prev) => ({
                            ...prev,
                            applicableCategoryIds: toggleId(
                              prev.applicableCategoryIds,
                              category.id,
                            ),
                          }))
                        }
                      />
                      {category.name}
                    </label>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-navy">
                Menu items (optional)
              </p>
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                {store.menuItems.length === 0 ? (
                  <p className="text-xs text-muted">No menu items</p>
                ) : (
                  store.menuItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 text-sm text-navy"
                    >
                      <input
                        type="checkbox"
                        checked={form.applicableMenuItemIds.includes(item.id)}
                        onChange={() =>
                          setForm((prev) => ({
                            ...prev,
                            applicableMenuItemIds: toggleId(
                              prev.applicableMenuItemIds,
                              item.id,
                            ),
                          }))
                        }
                      />
                      {item.name}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, active: event.target.checked }))
              }
            />
            Active
          </label>

          {editing ? (
            <p className="text-xs text-muted">
              Current usage count: {editing.usageCount}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>
              {editing ? "Save changes" : "Create coupon"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete coupon?"
        description="This permanently removes the coupon. Existing usage history is kept."
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          const result = deleteCoupon(deleteId);
          if (!result.ok) setPageError(result.errors);
        }}
      />
    </div>
  );
}
