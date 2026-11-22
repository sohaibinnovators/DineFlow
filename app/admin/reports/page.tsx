"use client";

import { useData } from "@/components/providers/DataProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { OrderStatusChart, RevenueChart } from "@/components/ui/Charts";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import {
  downloadCsv,
  netCollectedRevenue,
  outstandingInvoices,
} from "@/lib/data/billing";
import { roundMoney } from "@/lib/data/calculations";
import type {
  Expense,
  Invoice,
  Order,
  PaymentRecord,
  RefundRecord,
} from "@/lib/types";
import { DEMO_NOW, formatCurrency, formatDate } from "@/lib/utils";
import {
  Download,
  FileText,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

type RangePreset = "daily" | "weekly" | "monthly" | "custom";

const METHOD_COLORS: Record<string, string> = {
  cash: "#15803d",
  card: "#1d4ed8",
  "bank-transfer": "#e58a45",
  other: "#64748b",
  manual: "#14243a",
};

const TYPE_COLORS: Record<string, string> = {
  "dine-in": "#14243a",
  takeaway: "#e58a45",
  delivery: "#1d4ed8",
  manual: "#64748b",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#b45309",
  confirmed: "#1d4ed8",
  preparing: "#e58a45",
  ready: "#15803d",
  served: "#14243a",
  completed: "#15803d",
  cancelled: "#b91c1c",
};

function toDateKey(value: string | number | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function demoToday() {
  return toDateKey(DEMO_NOW);
}

function shiftDate(base: string, days: number) {
  const date = new Date(`${base}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function resolveRange(
  preset: RangePreset,
  customFrom: string,
  customTo: string,
) {
  const today = demoToday();
  if (preset === "daily") return { from: today, to: today };
  if (preset === "weekly") return { from: shiftDate(today, -6), to: today };
  if (preset === "monthly") {
    return { from: `${today.slice(0, 7)}-01`, to: today };
  }
  const from = customFrom || today;
  const to = customTo || today;
  return from <= to ? { from, to } : { from: to, to: from };
}

function inRange(dateValue: string, from: string, to: string) {
  const key = toDateKey(dateValue);
  return key >= from && key <= to;
}

function eachDay(from: string, to: string) {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    cursor = shiftDate(cursor, 1);
  }
  return days;
}

function monthKeys(from: string, to: string) {
  const keys: string[] = [];
  let cursor = from.slice(0, 7);
  const end = to.slice(0, 7);
  while (cursor <= end) {
    keys.push(cursor);
    const [year, month] = cursor.split("-").map(Number);
    const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
    cursor = next;
  }
  return keys;
}

function labelDay(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

function labelMonth(month: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
    new Date(`${month}-01T12:00:00`),
  );
}

function methodLabel(method: string) {
  return method.replace("-", " ");
}

function netByDay(
  payments: PaymentRecord[],
  refunds: RefundRecord[],
  from: string,
  to: string,
) {
  const map = new Map<string, number>();
  for (const day of eachDay(from, to)) map.set(day, 0);

  for (const payment of payments) {
    if (payment.status !== "successful") continue;
    const day = toDateKey(payment.paidAt);
    if (!inRange(day, from, to)) continue;
    map.set(day, roundMoney((map.get(day) ?? 0) + payment.amount));
  }
  for (const refund of refunds) {
    const day = toDateKey(refund.createdAt);
    if (!inRange(day, from, to)) continue;
    map.set(day, roundMoney((map.get(day) ?? 0) - refund.amount));
  }

  return [...map.entries()].map(([day, revenue]) => ({
    label: labelDay(day),
    day,
    revenue: Math.max(0, revenue),
    orders: 0,
  }));
}

function allocatePaymentBuckets(
  payments: PaymentRecord[],
  refunds: RefundRecord[],
  invoices: Invoice[],
  orders: Order[],
  from: string,
  to: string,
) {
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const paymentById = new Map(payments.map((payment) => [payment.id, payment]));

  const byMethod = new Map<string, number>();
  const byType = new Map<string, number>();

  const bump = (map: Map<string, number>, key: string, amount: number) => {
    map.set(key, roundMoney((map.get(key) ?? 0) + amount));
  };

  for (const payment of payments) {
    if (payment.status !== "successful") continue;
    if (!inRange(payment.paidAt, from, to)) continue;
    bump(byMethod, payment.method, payment.amount);

    const invoice = invoiceById.get(payment.invoiceId);
    const order = invoice?.orderId ? orderById.get(invoice.orderId) : undefined;
    bump(byType, order?.type ?? "manual", payment.amount);
  }

  for (const refund of refunds) {
    if (!inRange(refund.createdAt, from, to)) continue;
    const payment = paymentById.get(refund.paymentId);
    const method = payment?.method ?? "other";
    bump(byMethod, method, -refund.amount);

    const invoice = invoiceById.get(refund.invoiceId);
    const order = invoice?.orderId ? orderById.get(invoice.orderId) : undefined;
    bump(byType, order?.type ?? "manual", -refund.amount);
  }

  return {
    byMethod: [...byMethod.entries()]
      .map(([label, value]) => ({
        label: methodLabel(label),
        key: label,
        value: Math.max(0, roundMoney(value)),
        color: METHOD_COLORS[label] ?? "#64748b",
      }))
      .sort((a, b) => b.value - a.value),
    byType: [...byType.entries()]
      .map(([label, value]) => ({
        label: label.replace("-", " "),
        key: label,
        value: Math.max(0, roundMoney(value)),
        color: TYPE_COLORS[label] ?? "#64748b",
      }))
      .sort((a, b) => b.value - a.value),
  };
}

function expensesInRange(expenses: Expense[], from: string, to: string) {
  return expenses.filter((expense) => inRange(expense.date, from, to));
}

function expenseByCategory(expenses: Expense[]) {
  const map = new Map<string, number>();
  for (const expense of expenses) {
    map.set(
      expense.category,
      roundMoney((map.get(expense.category) ?? 0) + expense.amount),
    );
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function DateRangeControls({
  preset,
  customFrom,
  customTo,
  onPreset,
  onFrom,
  onTo,
  currency,
  onExport,
  exportLabel = "Export CSV",
}: {
  preset: RangePreset;
  customFrom: string;
  customTo: string;
  onPreset: (value: RangePreset) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  currency: string;
  onExport?: () => void;
  exportLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Range">
          <Select
            value={preset}
            onChange={(event) => onPreset(event.target.value as RangePreset)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </Select>
        </Field>
        <Field label="From">
          <Input
            type="date"
            value={customFrom}
            disabled={preset !== "custom"}
            onChange={(event) => onFrom(event.target.value)}
          />
        </Field>
        <Field label="To">
          <Input
            type="date"
            value={customTo}
            disabled={preset !== "custom"}
            onChange={(event) => onTo(event.target.value)}
          />
        </Field>
        <div className="flex items-end">
          <p className="pb-2 text-xs text-muted">Currency · {currency}</p>
        </div>
      </div>
      {onExport ? (
        <Button type="button" variant="outline" onClick={onExport}>
          <Download className="h-4 w-4" />
          {exportLabel}
        </Button>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-3 last:border-0 last:pb-0">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-medium text-navy">{value}</p>
    </div>
  );
}

export default function AdminReportsPage() {
  const { hydrated, store } = useData();
  const today = demoToday();
  const [preset, setPreset] = useState<RangePreset>("weekly");
  const [customFrom, setCustomFrom] = useState(shiftDate(today, -6));
  const [customTo, setCustomTo] = useState(today);

  const currency = store.billingSettings.currency || "PKR";
  const range = resolveRange(preset, customFrom, customTo);

  const report = useMemo(() => {
    const payments = store.payments;
    const refunds = store.refunds;
    const invoices = store.invoices;
    const orders = store.orders;
    const expenses = expensesInRange(store.expenses, range.from, range.to);

    const rangedPayments = payments.filter(
      (payment) =>
        payment.status === "successful" &&
        inRange(payment.paidAt, range.from, range.to),
    );
    const rangedRefunds = refunds.filter((refund) =>
      inRange(refund.createdAt, range.from, range.to),
    );

    const recordedRevenue = netCollectedRevenue(rangedPayments, rangedRefunds);
    const invoiceTotals = roundMoney(
      invoices
        .filter(
          (invoice) =>
            invoice.status !== "cancelled" &&
            invoice.status !== "draft" &&
            inRange(invoice.issueDate, range.from, range.to),
        )
        .reduce((sum, invoice) => sum + invoice.grandTotal, 0),
    );
    const outstanding = outstandingInvoices(invoices);
    const outstandingBalance = roundMoney(
      outstanding.reduce((sum, invoice) => sum + invoice.remainingBalance, 0),
    );
    const totalExpenses = roundMoney(
      expenses.reduce((sum, expense) => sum + expense.amount, 0),
    );
    const netProfit = roundMoney(recordedRevenue - totalExpenses);

    const series = netByDay(payments, refunds, range.from, range.to);
    const orderCountsByDay = new Map<string, number>();
    for (const order of orders) {
      const day = toDateKey(order.createdAt);
      if (!inRange(day, range.from, range.to)) continue;
      orderCountsByDay.set(day, (orderCountsByDay.get(day) ?? 0) + 1);
    }
    const revenueSeries = series.map((point) => ({
      ...point,
      orders: orderCountsByDay.get(point.day) ?? 0,
    }));

    const buckets = allocatePaymentBuckets(
      payments,
      refunds,
      invoices,
      orders,
      range.from,
      range.to,
    );

    const expenseDaily = eachDay(range.from, range.to).map((day) => ({
      label: labelDay(day),
      revenue: roundMoney(
        expenses
          .filter((expense) => toDateKey(expense.date) === day)
          .reduce((sum, expense) => sum + expense.amount, 0),
      ),
      orders: 0,
    }));

    const months = monthKeys(range.from, range.to);
    const profitTrend = months.map((month) => {
      const monthPayments = payments.filter(
        (payment) =>
          payment.status === "successful" &&
          payment.paidAt.startsWith(month) &&
          inRange(payment.paidAt, range.from, range.to),
      );
      const monthRefunds = refunds.filter(
        (refund) =>
          refund.createdAt.startsWith(month) &&
          inRange(refund.createdAt, range.from, range.to),
      );
      const revenue = netCollectedRevenue(monthPayments, monthRefunds);
      const monthExpenses = expenses
        .filter((expense) => expense.date.startsWith(month))
        .reduce((sum, expense) => sum + expense.amount, 0);
      return {
        label: labelMonth(month),
        revenue: Math.max(0, roundMoney(revenue - monthExpenses)),
        orders: 0,
        recorded: revenue,
        expenses: roundMoney(monthExpenses),
      };
    });

    const rangedInvoices = invoices.filter((invoice) =>
      inRange(invoice.issueDate, range.from, range.to),
    );
    const invoiceStats = {
      paid: rangedInvoices.filter((invoice) => invoice.status === "paid"),
      unpaid: rangedInvoices.filter((invoice) => invoice.status === "unpaid"),
      partiallyPaid: rangedInvoices.filter(
        (invoice) => invoice.status === "partially-paid",
      ),
      overdue: rangedInvoices.filter((invoice) => invoice.status === "overdue"),
      draft: rangedInvoices.filter((invoice) => invoice.status === "draft"),
      cancelled: rangedInvoices.filter(
        (invoice) => invoice.status === "cancelled",
      ),
    };

    const rangedOrders = orders.filter((order) =>
      inRange(order.createdAt, range.from, range.to),
    );
    const completedOrders = rangedOrders.filter((order) =>
      ["completed", "served"].includes(order.status),
    );
    const cancelledOrders = rangedOrders.filter(
      (order) => order.status === "cancelled",
    );
    const avgOrderValue = completedOrders.length
      ? roundMoney(
          completedOrders.reduce((sum, order) => sum + order.total, 0) /
            completedOrders.length,
        )
      : 0;

    const itemMap = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();
    for (const order of completedOrders) {
      for (const item of order.items) {
        const key = item.menuItemId || item.name;
        const current = itemMap.get(key) ?? {
          name: item.name,
          quantity: 0,
          revenue: 0,
        };
        current.quantity += item.quantity;
        current.revenue = roundMoney(
          current.revenue + item.price * item.quantity,
        );
        itemMap.set(key, current);
      }
    }
    const popularItems = [...itemMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const statusCounts = Object.entries(
      rangedOrders.reduce<Record<string, number>>((acc, order) => {
        acc[order.status] = (acc[order.status] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([label, value]) => ({
      label,
      value,
      color: STATUS_COLORS[label] ?? "#64748b",
    }));

    return {
      recordedRevenue,
      invoiceTotals,
      outstandingBalance,
      outstanding,
      totalExpenses,
      netProfit,
      revenueSeries,
      buckets,
      expenses,
      expenseDaily,
      expenseByCategory: expenseByCategory(expenses),
      profitTrend,
      invoiceStats,
      rangedInvoices,
      rangedOrders,
      completedOrders,
      cancelledOrders,
      avgOrderValue,
      popularItems,
      statusCounts,
      rangedPayments,
      rangedRefunds,
    };
  }, [store, range.from, range.to]);

  if (!hydrated) return <LoadingState label="Loading reports..." />;

  const rangeLabel = `${formatDate(range.from)} – ${formatDate(range.to)}`;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader
          title="Financial reports"
          description={`Computed from live store data · ${rangeLabel}`}
        />
        <CardBody>
          <DateRangeControls
            preset={preset}
            customFrom={customFrom}
            customTo={customTo}
            onPreset={setPreset}
            onFrom={setCustomFrom}
            onTo={setCustomTo}
            currency={currency}
          />
        </CardBody>
      </Card>

      <Tabs
        tabs={[
          {
            id: "revenue",
            label: "Revenue",
            content: (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadCsv("revenue-report.csv", [
                        {
                          metric: "Recorded revenue (payments − refunds)",
                          amount: report.recordedRevenue,
                        },
                        {
                          metric: "Invoice grand totals (issued)",
                          amount: report.invoiceTotals,
                        },
                        {
                          metric: "Outstanding balances",
                          amount: report.outstandingBalance,
                        },
                        ...report.buckets.byMethod.map((row) => ({
                          metric: `Method · ${row.label}`,
                          amount: row.value,
                        })),
                        ...report.buckets.byType.map((row) => ({
                          metric: `Order type · ${row.label}`,
                          amount: row.value,
                        })),
                        ...report.revenueSeries.map((row) => ({
                          metric: `Day · ${row.label}`,
                          amount: row.revenue,
                        })),
                      ])
                    }
                  >
                    <Download className="h-4 w-4" />
                    Export revenue CSV
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <StatCard
                    label="Recorded revenue (payments − refunds)"
                    value={report.recordedRevenue}
                    icon={Wallet}
                    format="currency"
                    currency={currency}
                  />
                  <StatCard
                    label="Invoice totals (issued)"
                    value={report.invoiceTotals}
                    icon={FileText}
                    format="currency"
                    currency={currency}
                  />
                  <StatCard
                    label="Outstanding balances"
                    value={report.outstandingBalance}
                    icon={Receipt}
                    format="currency"
                    currency={currency}
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                  <Card className="xl:col-span-2">
                    <CardHeader
                      title="Recorded revenue trend"
                      description="Successful payments minus refunds by day"
                    />
                    <CardBody>
                      <RevenueChart
                        data={report.revenueSeries}
                        caption="Recorded revenue"
                        currency={currency}
                      />
                    </CardBody>
                  </Card>
                  <Card>
                    <CardHeader
                      title="By payment method"
                      description="Net collected by method"
                    />
                    <CardBody className="space-y-3">
                      {report.buckets.byMethod.length === 0 ? (
                        <p className="text-sm text-muted">No payments in range.</p>
                      ) : (
                        report.buckets.byMethod.map((row) => (
                          <SummaryRow
                            key={row.key}
                            label={row.label}
                            value={formatCurrency(row.value, currency)}
                          />
                        ))
                      )}
                    </CardBody>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader
                      title="By order type"
                      description="Payments joined to invoices → orders (manual if none)"
                    />
                    <CardBody className="space-y-4">
                      {report.buckets.byType.length === 0 ? (
                        <p className="text-sm text-muted">No typed revenue in range.</p>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {report.buckets.byType.map((row) => {
                              const max = Math.max(
                                ...report.buckets.byType.map((item) => item.value),
                                1,
                              );
                              const width = Math.max((row.value / max) * 100, 4);
                              return (
                                <div key={row.key} className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="capitalize text-navy">
                                      {row.label}
                                    </span>
                                    <span className="font-medium text-navy">
                                      {formatCurrency(row.value, currency)}
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full bg-slate-100">
                                    <div
                                      className="h-2 rounded-full"
                                      style={{
                                        width: `${width}%`,
                                        backgroundColor: row.color,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </CardBody>
                  </Card>
                  <Card>
                    <CardHeader
                      title="Revenue definitions"
                      description="How these figures are computed"
                    />
                    <CardBody className="space-y-3 text-sm text-muted">
                      <p>
                        <span className="font-medium text-navy">Recorded revenue</span>{" "}
                        = successful payments − refunds in the selected range.
                      </p>
                      <p>
                        <span className="font-medium text-navy">Invoice totals</span>{" "}
                        = sum of issued invoice grand totals (not cash collected).
                      </p>
                      <p>
                        <span className="font-medium text-navy">Outstanding</span>{" "}
                        = remaining balances on unpaid / partial / overdue invoices.
                      </p>
                    </CardBody>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            id: "expenses",
            label: "Expenses",
            content: (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadCsv(
                        "expense-report.csv",
                        report.expenses.map((expense) => ({
                          title: expense.title,
                          category: expense.category,
                          vendor: expense.vendor,
                          date: expense.date,
                          status: expense.status,
                          amount: expense.amount,
                        })),
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                    Export expenses CSV
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard
                    label="Total expenses"
                    value={report.totalExpenses}
                    icon={Wallet}
                    format="currency"
                    currency={currency}
                  />
                  <StatCard
                    label="Expense line items"
                    value={report.expenses.length}
                    icon={Receipt}
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                  <Card className="xl:col-span-2">
                    <CardHeader
                      title="Daily expense trend"
                      description="Spend by day in the selected range"
                    />
                    <CardBody>
                      <RevenueChart
                        data={report.expenseDaily}
                        caption="Expenses"
                        currency={currency}
                      />
                    </CardBody>
                  </Card>
                  <Card>
                    <CardHeader
                      title="By category"
                      description="Category totals for the range"
                    />
                    <CardBody className="space-y-3">
                      {report.expenseByCategory.length === 0 ? (
                        <p className="text-sm text-muted">No expenses in range.</p>
                      ) : (
                        report.expenseByCategory.map((row) => (
                          <SummaryRow
                            key={row.label}
                            label={row.label}
                            value={formatCurrency(row.value, currency)}
                          />
                        ))
                      )}
                    </CardBody>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            id: "profit",
            label: "Profit",
            content: (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadCsv("profit-report.csv", [
                        {
                          metric: "Recorded revenue",
                          amount: report.recordedRevenue,
                          recorded: report.recordedRevenue,
                          expenses: 0,
                        },
                        {
                          metric: "Total expenses",
                          amount: report.totalExpenses,
                          recorded: 0,
                          expenses: report.totalExpenses,
                        },
                        {
                          metric: "Estimated net profit",
                          amount: report.netProfit,
                          recorded: report.recordedRevenue,
                          expenses: report.totalExpenses,
                        },
                        ...report.profitTrend.map((row) => ({
                          metric: `Month · ${row.label}`,
                          amount: row.revenue,
                          recorded: row.recorded,
                          expenses: row.expenses,
                        })),
                      ])
                    }
                  >
                    <Download className="h-4 w-4" />
                    Export profit CSV
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    label="Recorded revenue"
                    value={report.recordedRevenue}
                    icon={TrendingUp}
                    format="currency"
                    currency={currency}
                  />
                  <StatCard
                    label="Total expenses"
                    value={report.totalExpenses}
                    icon={Wallet}
                    format="currency"
                    currency={currency}
                  />
                  <StatCard
                    label="Estimated net profit"
                    value={report.netProfit}
                    icon={Receipt}
                    format="currency"
                    currency={currency}
                  />
                </div>

                <Card>
                  <CardHeader
                    title="Monthly net profit trend"
                    description="Recorded revenue − expenses by month in range"
                  />
                  <CardBody>
                    <RevenueChart
                      data={report.profitTrend}
                      caption="Estimated net profit"
                      currency={currency}
                    />
                  </CardBody>
                </Card>
              </div>
            ),
          },
          {
            id: "invoices",
            label: "Invoices",
            content: (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadCsv(
                        "invoice-report.csv",
                        report.rangedInvoices.map((invoice) => ({
                          invoiceNumber: invoice.invoiceNumber,
                          customer: invoice.customerName,
                          status: invoice.status,
                          issueDate: invoice.issueDate,
                          dueDate: invoice.dueDate,
                          grandTotal: invoice.grandTotal,
                          amountPaid: invoice.amountPaid,
                          remainingBalance: invoice.remainingBalance,
                        })),
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                    Export invoices CSV
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <StatCard
                    label="Paid"
                    value={report.invoiceStats.paid.length}
                    icon={FileText}
                  />
                  <StatCard
                    label="Unpaid"
                    value={report.invoiceStats.unpaid.length}
                    icon={FileText}
                  />
                  <StatCard
                    label="Partially paid"
                    value={report.invoiceStats.partiallyPaid.length}
                    icon={FileText}
                  />
                  <StatCard
                    label="Overdue"
                    value={report.invoiceStats.overdue.length}
                    icon={FileText}
                  />
                  <StatCard
                    label="Outstanding balance"
                    value={report.outstandingBalance}
                    icon={Wallet}
                    format="currency"
                    currency={currency}
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader
                      title="Amounts by status"
                      description="Grand totals for invoices issued in range"
                    />
                    <CardBody className="space-y-3">
                      {(
                        [
                          ["Paid", report.invoiceStats.paid],
                          ["Unpaid", report.invoiceStats.unpaid],
                          ["Partially paid", report.invoiceStats.partiallyPaid],
                          ["Overdue", report.invoiceStats.overdue],
                        ] as const
                      ).map(([label, rows]) => (
                        <SummaryRow
                          key={label}
                          label={`${label} (${rows.length})`}
                          value={formatCurrency(
                            roundMoney(
                              rows.reduce((sum, row) => sum + row.grandTotal, 0),
                            ),
                            currency,
                          )}
                        />
                      ))}
                    </CardBody>
                  </Card>
                  <Card>
                    <CardHeader
                      title="Outstanding invoices"
                      description="Open balances across the ledger"
                    />
                    <CardBody className="space-y-3 p-0">
                      {report.outstanding.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-muted">
                          No outstanding balances.
                        </p>
                      ) : (
                        report.outstanding.slice(0, 8).map((invoice) => (
                          <div
                            key={invoice.id}
                            className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0"
                          >
                            <div>
                              <p className="font-medium text-navy">
                                {invoice.invoiceNumber}
                              </p>
                              <p className="text-xs text-muted">
                                {invoice.customerName} · due {formatDate(invoice.dueDate)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-navy">
                                {formatCurrency(invoice.remainingBalance, currency)}
                              </p>
                              <Badge tone={statusTone(invoice.status)}>
                                {invoice.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </CardBody>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            id: "orders",
            label: "Orders",
            content: (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadCsv("order-report.csv", [
                        ...report.rangedOrders.map((order) => ({
                          orderNumber: order.orderNumber,
                          customer: order.customerName,
                          status: order.status,
                          type: order.type,
                          total: order.total,
                          createdAt: order.createdAt,
                        })),
                        ...report.popularItems.map((item) => ({
                          orderNumber: `ITEM · ${item.name}`,
                          customer: "",
                          status: "popular",
                          type: "",
                          total: item.revenue,
                          createdAt: `qty ${item.quantity}`,
                        })),
                      ])
                    }
                  >
                    <Download className="h-4 w-4" />
                    Export orders CSV
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Total orders"
                    value={report.rangedOrders.length}
                    icon={ShoppingBag}
                  />
                  <StatCard
                    label="Completed / served"
                    value={report.completedOrders.length}
                    icon={ShoppingBag}
                  />
                  <StatCard
                    label="Cancelled"
                    value={report.cancelledOrders.length}
                    icon={ShoppingBag}
                  />
                  <StatCard
                    label="Avg order value"
                    value={report.avgOrderValue}
                    icon={TrendingUp}
                    format="currency"
                    currency={currency}
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                  <Card>
                    <CardHeader
                      title="Status mix"
                      description="Orders created in range"
                    />
                    <CardBody>
                      {report.statusCounts.length === 0 ? (
                        <p className="text-sm text-muted">No orders in range.</p>
                      ) : (
                        <OrderStatusChart data={report.statusCounts} />
                      )}
                    </CardBody>
                  </Card>
                  <Card className="xl:col-span-2">
                    <CardHeader
                      title="Popular menu items"
                      description="From completed/served order item snapshots"
                    />
                    <CardBody className="space-y-3 p-0">
                      {report.popularItems.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-muted">
                          No completed order items in range.
                        </p>
                      ) : (
                        report.popularItems.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0"
                          >
                            <div>
                              <p className="font-medium text-navy">{item.name}</p>
                              <p className="text-xs text-muted">
                                {item.quantity} sold
                              </p>
                            </div>
                            <p className="font-medium text-navy">
                              {formatCurrency(item.revenue, currency)}
                            </p>
                          </div>
                        ))
                      )}
                    </CardBody>
                  </Card>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
