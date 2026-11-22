"use client";

import { useData } from "@/components/providers/DataProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { OrderStatusChart, RevenueChart } from "@/components/ui/Charts";
import { LoadingState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import {
  computeBillingStats,
  outstandingInvoices,
} from "@/lib/data/billing";
import { roundMoney } from "@/lib/data/calculations";
import { computeOpsStats } from "@/lib/data/ops-stats";
import type { RevenuePoint } from "@/lib/types";
import {
  DEMO_NOW,
  formatCurrency,
  formatDate,
  formatRelativeTime,
} from "@/lib/utils";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  FileText,
  Package,
  Receipt,
  ShoppingBag,
  Table2,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";

const statusColors: Record<string, string> = {
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
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function shiftDate(base: string, days: number) {
  const date = new Date(`${base}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function buildCollectedSeries(
  payments: { status: string; amount: number; paidAt: string }[],
  refunds: { amount: number; createdAt: string }[],
  orders: { createdAt: string }[],
  today: string,
  days = 7,
): RevenuePoint[] {
  const start = shiftDate(today, -(days - 1));
  const points: RevenuePoint[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const day = shiftDate(start, offset);
    const paid = payments
      .filter(
        (payment) =>
          payment.status === "successful" &&
          toDateKey(payment.paidAt) === day,
      )
      .reduce((sum, payment) => sum + payment.amount, 0);
    const refunded = refunds
      .filter((refund) => toDateKey(refund.createdAt) === day)
      .reduce((sum, refund) => sum + refund.amount, 0);
    const orderCount = orders.filter(
      (order) => toDateKey(order.createdAt) === day,
    ).length;

    points.push({
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(new Date(`${day}T12:00:00`)),
      revenue: Math.max(0, roundMoney(paid - refunded)),
      orders: orderCount,
    });
  }

  return points;
}

export default function AdminOverviewPage() {
  const { hydrated, store, stats } = useData();
  const today = toDateKey(DEMO_NOW);

  const billing = useMemo(
    () =>
      computeBillingStats({
        invoices: store.invoices,
        payments: store.payments,
        refunds: store.refunds,
        expenses: store.expenses,
        today,
      }),
    [store.invoices, store.payments, store.refunds, store.expenses, today],
  );

  const collectedSeries = useMemo(
    () =>
      buildCollectedSeries(
        store.payments,
        store.refunds,
        store.orders,
        today,
        7,
      ),
    [store.payments, store.refunds, store.orders, today],
  );

  if (!hydrated) return <LoadingState label="Loading dashboard..." />;

  const currency = store.billingSettings.currency || "PKR";
  const ops = computeOpsStats(store, today);

  const recentOrders = [...store.orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const recentPayments = [...store.payments]
    .filter((payment) => payment.status === "successful")
    .sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    )
    .slice(0, 5);

  const recentInvoices = [...store.invoices]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const outstanding = outstandingInvoices(store.invoices).slice(0, 6);

  const statusCounts = Object.entries(
    store.orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([label, value]) => ({
    label,
    value,
    color: statusColors[label] ?? "#64748b",
  }));

  const activity = recentOrders.slice(0, 5).map((order) => ({
    id: order.id,
    title: `Order ${order.orderNumber}`,
    description: `${order.customerName} · ${order.status} · ${formatCurrency(order.total, currency)}`,
    time: order.createdAt,
  }));

  const expenseByCategory = store.expenses.reduce<Record<string, number>>(
    (acc, expense) => {
      acc[expense.category] = roundMoney(
        (acc[expense.category] ?? 0) + expense.amount,
      );
      return acc;
    },
    {},
  );
  const topExpenseCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Collected revenue"
          value={billing.totalRevenue}
          icon={Wallet}
          format="currency"
          currency={currency}
        />
        <StatCard
          label="Order totals (ops)"
          value={stats.totalRevenue}
          icon={ShoppingBag}
          format="currency"
          currency={currency}
        />
        <StatCard
          label="Net profit (est.)"
          value={billing.netProfit}
          icon={TrendingUp}
          format="currency"
          currency={currency}
        />
        <StatCard
          label="Outstanding"
          value={billing.outstandingBalance}
          icon={Receipt}
          format="currency"
          currency={currency}
        />
        <StatCard
          label="Total expenses"
          value={billing.totalExpenses}
          icon={FileText}
          format="currency"
          currency={currency}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          icon={ShoppingBag}
        />
        <StatCard
          label="Active Reservations"
          value={stats.activeReservations}
          icon={CalendarDays}
        />
        <StatCard
          label="Customers"
          value={stats.totalCustomers}
          icon={Users}
        />
        <StatCard
          label="Menu Items"
          value={stats.menuItemCount}
          icon={UtensilsCrossed}
        />
        <StatCard
          label="Today's collected"
          value={billing.todayRevenue}
          icon={Wallet}
          format="currency"
          currency={currency}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Today's Reservations"
          value={ops.todaysReservations}
          icon={CalendarDays}
        />
        <StatCard
          label="Available Tables"
          value={ops.availableTables}
          icon={Table2}
        />
        <StatCard
          label="Occupied Tables"
          value={ops.occupiedTables}
          icon={Table2}
        />
        <StatCard
          label="Active kitchen"
          value={ops.activeKitchenOrders}
          icon={UtensilsCrossed}
        />
        <StatCard
          label="Delayed orders"
          value={ops.delayedOrders}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Collected revenue"
            description="Last 7 days · successful payments − refunds (relative to demo clock)"
          />
          <CardBody>
            <RevenueChart
              data={collectedSeries}
              caption="Collected revenue"
              currency={currency}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Order Status Overview"
            description="Live status distribution from LocalStorage orders"
          />
          <CardBody>
            <OrderStatusChart data={statusCounts} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Recent payments"
            description={`${billing.paidInvoices} paid invoices · today ${formatCurrency(billing.todayRevenue, currency)}`}
          />
          <CardBody className="space-y-3 p-0">
            {recentPayments.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">No payments recorded yet.</p>
            ) : (
              recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-navy">{payment.receiptNumber}</p>
                    <p className="text-xs text-muted">
                      {payment.invoiceNumber} · {payment.method.replace("-", " ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-navy">
                      {formatCurrency(payment.amount, currency)}
                    </p>
                    <p className="text-xs text-muted">
                      {formatRelativeTime(payment.paidAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Outstanding balances"
            description={`${billing.unpaidInvoices + billing.partiallyPaidInvoices} open invoices`}
          />
          <CardBody className="space-y-3 p-0">
            {outstanding.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">No outstanding balances.</p>
            ) : (
              outstanding.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-navy">{invoice.invoiceNumber}</p>
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

        <Card>
          <CardHeader
            title="Expense & profit"
            description="Ledger expenses vs collected revenue"
          />
          <CardBody className="space-y-3">
            <div className="rounded-lg border border-border bg-slate-50 px-3 py-3">
              <p className="text-sm text-muted">Estimated net profit</p>
              <p className="mt-1 font-display text-2xl text-navy">
                {formatCurrency(billing.netProfit, currency)}
              </p>
              <p className="mt-1 text-xs text-muted">
                Collected {formatCurrency(billing.totalRevenue, currency)} −
                expenses {formatCurrency(billing.totalExpenses, currency)}
              </p>
            </div>
            {topExpenseCategories.length === 0 ? (
              <p className="text-sm text-muted">No expenses recorded.</p>
            ) : (
              topExpenseCategories.map(([category, amount]) => (
                <div
                  key={category}
                  className="flex items-center justify-between gap-2 border-b border-border/70 pb-2 last:border-0"
                >
                  <p className="capitalize text-sm text-navy">{category}</p>
                  <p className="text-sm font-medium text-navy">
                    {formatCurrency(amount, currency)}
                  </p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Recent invoices"
            description={`${billing.totalInvoices} active invoices in ledger`}
          />
          <CardBody className="space-y-3 p-0">
            {recentInvoices.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">No invoices yet.</p>
            ) : (
              recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-navy">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-muted">
                      {invoice.customerName} · {formatDate(invoice.issueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-navy">
                      {formatCurrency(invoice.grandTotal, currency)}
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

        <Card>
          <CardHeader
            title="Today's reservations"
            description={`${ops.todaysReservations} booked for ${formatDate(today)}`}
          />
          <CardBody className="space-y-3 p-0">
            {ops.todaysReservationList.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">No reservations today.</p>
            ) : (
              ops.todaysReservationList.slice(0, 6).map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-navy">{reservation.guestName}</p>
                    <p className="text-sm text-muted">
                      {reservation.time} · party of {reservation.partySize}
                    </p>
                  </div>
                  <Badge tone={statusTone(reservation.status)}>
                    {reservation.status}
                  </Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Kitchen pressure"
            description="Active tickets and delayed plates"
          />
          <CardBody className="space-y-3">
            <div className="rounded-lg border border-border bg-slate-50 px-3 py-3">
              <p className="text-sm text-muted">Active kitchen orders</p>
              <p className="mt-1 font-display text-2xl text-navy">
                {ops.activeKitchenOrders}
              </p>
            </div>
            {ops.delayedOrderList.length === 0 ? (
              <p className="text-sm text-muted">No delayed tickets right now.</p>
            ) : (
              ops.delayedOrderList.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-2 border-b border-border/70 pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-navy">{order.orderNumber}</p>
                    <p className="text-xs text-muted capitalize">
                      {order.status} · {order.type.replace("-", " ")}
                    </p>
                  </div>
                  <Badge tone="danger">Delayed</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Stock alerts"
            description="Low and out-of-stock inventory"
          />
          <CardBody className="space-y-3 p-0">
            {[...ops.outOfStock, ...ops.lowStock].length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">Inventory looks healthy.</p>
            ) : (
              [...ops.outOfStock, ...ops.lowStock].slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-navy">{item.name}</p>
                    <p className="text-xs text-muted">
                      {item.quantity} {item.unit} · reorder {item.reorderLevel}
                    </p>
                  </div>
                  <Badge tone={item.quantity <= 0 ? "danger" : "warning"}>
                    {item.quantity <= 0 ? "Out" : "Low"}
                  </Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Recent Orders" description="Latest activity" />
          <CardBody className="space-y-3 p-0">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0"
              >
                <div>
                  <p className="font-medium text-navy">{order.orderNumber}</p>
                  <p className="text-sm text-muted">
                    {order.customerName} · {formatRelativeTime(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-navy">
                    {formatCurrency(order.total, currency)}
                  </p>
                  <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Popular Dishes" description="Featured / popular" />
          <CardBody className="space-y-3 p-0">
            {ops.popularDishes.map((dish) => (
              <div
                key={dish.id}
                className="flex items-center gap-3 border-b border-border/70 px-5 py-3 last:border-0"
              >
                <Image
                  src={dish.image}
                  alt={dish.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy">{dish.name}</p>
                  <p className="text-sm text-muted capitalize">
                    {dish.categorySlug}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-navy">
                  {formatCurrency(dish.price, currency)}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming shifts"
            description="Scheduled coverage from the staff roster"
          />
          <CardBody className="space-y-3 p-0">
            {ops.upcomingShifts.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">No upcoming shifts.</p>
            ) : (
              ops.upcomingShifts.map((shift) => {
                const member = store.staff.find(
                  (item) => item.id === shift.staffId,
                );
                return (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-navy">
                        {member?.name ?? shift.staffId}
                      </p>
                      <p className="text-sm text-muted">
                        {formatDate(shift.date)} · {shift.startTime}–
                        {shift.endTime}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs capitalize text-muted">
                      <Clock3 className="h-3.5 w-3.5" />
                      {shift.role ?? member?.role ?? "shift"}
                    </span>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent stock movements"
            description="Live inventory ledger"
          />
          <CardBody className="space-y-3 p-0">
            {ops.recentMovements.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">No stock movements yet.</p>
            ) : (
              ops.recentMovements.map((movement) => {
                const item = store.inventory.find(
                  (entry) => entry.id === movement.inventoryItemId,
                );
                return (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-navy">
                        {item?.name ?? movement.inventoryItemId}
                      </p>
                      <p className="text-xs text-muted">
                        {movement.type} · {movement.reason}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="inline-flex items-center gap-1 text-sm font-medium text-navy">
                        <Package className="h-3.5 w-3.5" />
                        {movement.direction === "out" ? "−" : "+"}
                        {movement.quantity}
                      </p>
                      <p className="text-xs text-muted">
                        {formatRelativeTime(movement.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent Activity" description="Derived from live orders" />
        <CardBody className="space-y-3">
          {activity.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 border-b border-border/70 pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-navy">{item.title}</p>
                <p className="text-sm text-muted">{item.description}</p>
              </div>
              <p className="shrink-0 text-xs text-muted">
                {formatRelativeTime(item.time)}
              </p>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
