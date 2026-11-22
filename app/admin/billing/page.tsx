"use client";

import {
  paymentMethodLabel,
  invoiceStatusTone,
} from "@/components/billing/invoiceHelpers";
import { useData } from "@/components/providers/DataProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { OrderStatusChart, RevenueChart } from "@/components/ui/Charts";
import { LoadingState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import {
  computeBillingStats,
  netCollectedRevenue,
  outstandingInvoices,
} from "@/lib/data/billing";
import type { BillingPaymentMethod, RevenuePoint } from "@/lib/types";
import { DEMO_NOW, formatCurrency, formatDate } from "@/lib/utils";
import {
  Banknote,
  CircleDollarSign,
  FileText,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

const METHOD_COLORS: Record<BillingPaymentMethod, string> = {
  cash: "#14243a",
  "bank-transfer": "#1d4ed8",
  card: "#e58a45",
  other: "#64748b",
};

function dayKey(offset: number, todayMs: number) {
  const date = new Date(todayMs);
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}

export default function AdminBillingPage() {
  const { hydrated, store } = useData();

  const today = new Date(DEMO_NOW).toISOString().slice(0, 10);
  const currency = store.billingSettings.currency;
  const money = (amount: number) => formatCurrency(amount, currency);

  const stats = useMemo(
    () =>
      computeBillingStats({
        invoices: store.invoices,
        payments: store.payments,
        refunds: store.refunds,
        expenses: store.expenses,
        today,
      }),
    [store.expenses, store.invoices, store.payments, store.refunds, today],
  );

  const revenueSeries: RevenuePoint[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const key = dayKey(6 - index, DEMO_NOW);
      const paid = store.payments
        .filter(
          (payment) =>
            payment.status === "successful" &&
            payment.paidAt.slice(0, 10) === key,
        )
        .reduce((sum, payment) => sum + payment.amount, 0);
      const refunded = store.refunds
        .filter((refund) => refund.createdAt.slice(0, 10) === key)
        .reduce((sum, refund) => sum + refund.amount, 0);
      const label = new Date(`${key}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
      });
      return {
        label,
        revenue: Math.max(0, paid - refunded),
        orders: 0,
      };
    });
  }, [store.payments, store.refunds]);

  const methodBreakdown = useMemo(() => {
    const methods: BillingPaymentMethod[] = [
      "cash",
      "bank-transfer",
      "card",
      "other",
    ];
    return methods.map((method) => ({
      label: paymentMethodLabel(method),
      value: store.payments.filter(
        (payment) =>
          payment.status === "successful" && payment.method === method,
      ).length,
      color: METHOD_COLORS[method],
    }));
  }, [store.payments]);

  const recentInvoices = useMemo(
    () =>
      [...store.invoices]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5),
    [store.invoices],
  );

  const recentPayments = useMemo(
    () =>
      [...store.payments]
        .sort(
          (a, b) =>
            new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
        )
        .slice(0, 5),
    [store.payments],
  );

  const outstanding = useMemo(
    () =>
      outstandingInvoices(store.invoices)
        .sort((a, b) => b.remainingBalance - a.remainingBalance)
        .slice(0, 8),
    [store.invoices],
  );

  const monthPrefix = today.slice(0, 7);
  const monthRevenue = useMemo(() => {
    const payments = store.payments.filter(
      (payment) =>
        payment.status === "successful" &&
        payment.paidAt.startsWith(monthPrefix),
    );
    const refunds = store.refunds.filter((refund) =>
      refund.createdAt.startsWith(monthPrefix),
    );
    return netCollectedRevenue(payments, refunds);
  }, [monthPrefix, store.payments, store.refunds]);

  const monthExpenses = useMemo(
    () =>
      store.expenses
        .filter((expense) => expense.date.startsWith(monthPrefix))
        .reduce((sum, expense) => sum + expense.amount, 0),
    [monthPrefix, store.expenses],
  );

  const monthProfit = monthRevenue - monthExpenses;

  if (!hydrated) return <LoadingState label="Loading billing..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={stats.totalRevenue}
          icon={Wallet}
          format="currency"
          currency={currency}
        />
        <StatCard
          label="Today's Revenue"
          value={stats.todayRevenue}
          icon={TrendingUp}
          format="currency"
          currency={currency}
        />
        <StatCard
          label="Monthly Revenue"
          value={stats.monthlyRevenue}
          icon={CircleDollarSign}
          format="currency"
          currency={currency}
        />
        <StatCard
          label="Outstanding Balance"
          value={stats.outstandingBalance}
          icon={Banknote}
          format="currency"
          currency={currency}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Invoices"
          value={stats.totalInvoices}
          icon={FileText}
        />
        <StatCard label="Paid" value={stats.paidInvoices} icon={Receipt} />
        <StatCard label="Unpaid" value={stats.unpaidInvoices} icon={Receipt} />
        <StatCard
          label="Partially Paid"
          value={stats.partiallyPaidInvoices}
          icon={Receipt}
        />
        <StatCard
          label="Total Expenses"
          value={stats.totalExpenses}
          icon={Wallet}
          format="currency"
          currency={currency}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-muted">Net Profit</p>
          <p className="mt-2 font-display text-2xl text-navy">
            {money(stats.netProfit)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Collected revenue minus all expenses
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Monthly financial summary</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Revenue</dt>
              <dd className="font-medium text-navy">{money(monthRevenue)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Expenses</dt>
              <dd className="font-medium text-navy">{money(monthExpenses)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-2">
              <dt className="text-muted">Profit</dt>
              <dd className="font-display text-lg text-navy">
                {money(monthProfit)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Revenue overview"
            description="Last 7 days of successful payments minus refunds"
          />
          <CardBody>
            <RevenueChart data={revenueSeries} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Payment methods"
            description="Successful payments by method"
          />
          <CardBody>
            <OrderStatusChart data={methodBreakdown} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent invoices"
            description="Latest billing documents"
            action={
              <Link
                href="/admin/invoices"
                className="text-sm font-medium text-orange hover:underline"
              >
                View all
              </Link>
            }
          />
          <CardBody>
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-muted">No invoices yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentInvoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <Link
                        href={`/admin/invoices/${invoice.id}`}
                        className="font-medium text-navy hover:text-orange"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="text-xs text-muted">
                        {invoice.customerName} · {formatDate(invoice.issueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-navy">
                        {money(invoice.grandTotal)}
                      </p>
                      <Badge tone={invoiceStatusTone(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent payments"
            description="Latest collections"
            action={
              <Link
                href="/admin/payments"
                className="text-sm font-medium text-orange hover:underline"
              >
                View all
              </Link>
            }
          />
          <CardBody>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentPayments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-navy">
                        {payment.receiptNumber}
                      </p>
                      <p className="text-xs text-muted">
                        {payment.invoiceNumber} ·{" "}
                        {paymentMethodLabel(payment.method)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-navy">
                        {money(payment.amount)}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(payment.paidAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Outstanding invoices"
          description="Balances still due"
        />
        <CardBody>
          {outstanding.length === 0 ? (
            <p className="text-sm text-muted">No outstanding balances.</p>
          ) : (
            <ul className="divide-y divide-border">
              {outstanding.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <Link
                      href={`/admin/invoices/${invoice.id}`}
                      className="font-medium text-navy hover:text-orange"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <p className="text-xs text-muted">
                      {invoice.customerName} · Due {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={invoiceStatusTone(invoice.status)}>
                      {invoice.status}
                    </Badge>
                    <p className="font-medium text-navy">
                      {money(invoice.remainingBalance)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
