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
import { downloadCsv } from "@/lib/data/billing";
import type {
  BillingPaymentMethod,
  Expense,
  ExpenseCategory,
} from "@/lib/types";
import { DEMO_NOW, formatCurrency, formatDate } from "@/lib/utils";
import { Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const PAGE_SIZE = 8;

const CATEGORIES: Array<ExpenseCategory | "all"> = [
  "all",
  "ingredients",
  "staff",
  "rent",
  "utilities",
  "maintenance",
  "marketing",
  "packaging",
  "transportation",
  "other",
  "payroll",
];

const EMPTY_FORM = {
  title: "",
  category: "ingredients" as ExpenseCategory,
  amount: "",
  date: new Date(DEMO_NOW).toISOString().slice(0, 10),
  vendor: "",
  paymentMethod: "cash" as BillingPaymentMethod,
  description: "",
  status: "paid" as "paid" | "pending",
};

export default function AdminExpensesPage() {
  const {
    hydrated,
    store,
    addExpense,
    updateExpense,
    deleteExpense,
  } = useData();
  const currency = store.billingSettings.currency;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "all">("all");
  const [status, setStatus] = useState<"all" | "paid" | "pending">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Expense | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.expenses.filter((expense) => {
      const matchesCategory =
        category === "all" || expense.category === category;
      const matchesStatus = status === "all" || expense.status === status;
      const matchesDate =
        !dateFilter || expense.date.slice(0, 10) === dateFilter;
      const matchesQuery =
        !q ||
        expense.title.toLowerCase().includes(q) ||
        expense.vendor.toLowerCase().includes(q) ||
        (expense.description?.toLowerCase().includes(q) ?? false) ||
        (expense.notes?.toLowerCase().includes(q) ?? false);
      return (
        matchesCategory && matchesStatus && matchesDate && matchesQuery
      );
    });
  }, [category, dateFilter, query, status, store.expenses]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const filteredTotal = filtered.reduce((sum, expense) => sum + expense.amount, 0);
  const allTotal = store.expenses.reduce((sum, expense) => sum + expense.amount, 0);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      date: new Date(DEMO_NOW).toISOString().slice(0, 10),
    });
    setErrors([]);
    setOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setForm({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      date: expense.date,
      vendor: expense.vendor,
      paymentMethod: expense.paymentMethod ?? "cash",
      description: expense.description ?? expense.notes ?? "",
      status: expense.status,
    });
    setErrors([]);
    setOpen(true);
  }

  function submit() {
    const payload = {
      title: form.title,
      category: form.category,
      amount: Number(form.amount),
      date: form.date,
      vendor: form.vendor,
      paymentMethod: form.paymentMethod,
      description: form.description,
      notes: form.description,
      status: form.status,
    };
    const result = editing
      ? updateExpense(editing.id, payload)
      : addExpense(payload);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setOpen(false);
  }

  function exportCsv() {
    downloadCsv(
      "dineflow-expenses.csv",
      filtered.map((expense) => ({
        id: expense.id,
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        date: expense.date,
        vendor: expense.vendor,
        paymentMethod: expense.paymentMethod ?? "",
        status: expense.status,
        description: expense.description ?? "",
      })),
    );
  }

  const columns: Column<Expense>[] = [
    {
      key: "title",
      header: "Expense",
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{row.title}</p>
          <p className="text-xs text-muted">{row.vendor}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => <span className="capitalize">{row.category}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => formatCurrency(row.amount, currency),
    },
    {
      key: "date",
      header: "Date",
      render: (row) => formatDate(row.date),
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
      header: "Actions",
      render: (row) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDetail(row)}
            aria-label="View"
          >
            <Eye className="h-4 w-4" />
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
            onClick={() => setDeleteId(row.id)}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading expenses..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-muted">All expenses</p>
          <p className="mt-2 font-display text-2xl text-navy">
            {formatCurrency(allTotal, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Filtered total</p>
          <p className="mt-2 font-display text-2xl text-navy">
            {formatCurrency(filteredTotal, currency)}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Expenses"
          description="Restaurant operating costs (demo records)"
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add expense
              </Button>
            </div>
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
                placeholder="Search expenses or vendors..."
              />
            </div>
            <Select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as ExpenseCategory | "all");
                setPage(1);
              }}
              className="lg:w-48"
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All categories" : item}
                </option>
              ))}
            </Select>
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "all" | "paid" | "pending");
                setPage(1);
              }}
              className="lg:w-40"
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(event) => {
                setDateFilter(event.target.value);
                setPage(1);
              }}
              className="lg:w-44"
              aria-label="Filter by expense date"
            />
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No expenses found"
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
        title={editing ? "Edit expense" : "Add expense"}
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
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    category: event.target.value as ExpenseCategory,
                  }))
                }
              >
                {CATEGORIES.filter((item) => item !== "all").map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.amount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, amount: event.target.value }))
                }
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, date: event.target.value }))
                }
              />
            </Field>
            <Field label="Payment method">
              <Select
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentMethod: event.target
                      .value as BillingPaymentMethod,
                  }))
                }
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank-transfer">Bank transfer</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Vendor">
              <Input
                value={form.vendor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, vendor: event.target.value }))
                }
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as "paid" | "pending",
                  }))
                }
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </Select>
            </Field>
          </div>
          <Field label="Description / notes">
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Expense details"
      >
        {detail ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium text-navy">{detail.title}</p>
            <p className="capitalize text-muted">{detail.category}</p>
            <p>{formatCurrency(detail.amount, currency)}</p>
            <p>{formatDate(detail.date)}</p>
            <p>Vendor: {detail.vendor}</p>
            <p>Method: {detail.paymentMethod ?? "—"}</p>
            <p>Status: {detail.status}</p>
            <p className="text-muted">
              {detail.description ?? detail.notes ?? "No description"}
            </p>
            <p className="text-xs text-muted">
              Created {formatDate(detail.createdAt)}
            </p>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete expense?"
        description="This removes the expense from demo financial records."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteId) deleteExpense(deleteId);
          setDeleteId(null);
        }}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
