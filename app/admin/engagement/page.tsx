"use client";

import { useData } from "@/components/providers/DataProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { computeEngagementStats } from "@/lib/data/engagement-stats";
import { DEMO_NOW } from "@/lib/utils";
import {
  Gift,
  Percent,
  RefreshCcw,
  ShoppingBag,
  Star,
  Ticket,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

type RangePreset = "daily" | "weekly" | "monthly" | "custom";

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

export default function AdminEngagementPage() {
  const { hydrated, store } = useData();
  const currency = store.billingSettings.currency || "PKR";
  const today = demoToday();

  const [preset, setPreset] = useState<RangePreset>("monthly");
  const [customFrom, setCustomFrom] = useState(shiftDate(today, -29));
  const [customTo, setCustomTo] = useState(today);

  const range = useMemo(
    () => resolveRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const stats = useMemo(
    () => computeEngagementStats(store, range),
    [store, range],
  );

  if (!hydrated) return <LoadingState label="Loading engagement..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader
          title="Engagement overview"
          description="Customer retention, loyalty, coupons, and ratings"
          action={
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Range" className="min-w-[140px]">
                <Select
                  value={preset}
                  onChange={(event) =>
                    setPreset(event.target.value as RangePreset)
                  }
                >
                  <option value="daily">Today</option>
                  <option value="weekly">Last 7 days</option>
                  <option value="monthly">This month</option>
                  <option value="custom">Custom</option>
                </Select>
              </Field>
              {preset === "custom" ? (
                <>
                  <Field label="From" className="min-w-[150px]">
                    <Input
                      type="date"
                      value={customFrom}
                      onChange={(event) => setCustomFrom(event.target.value)}
                    />
                  </Field>
                  <Field label="To" className="min-w-[150px]">
                    <Input
                      type="date"
                      value={customTo}
                      onChange={(event) => setCustomTo(event.target.value)}
                    />
                  </Field>
                </>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreset("monthly");
                  setCustomFrom(shiftDate(today, -29));
                  setCustomTo(today);
                }}
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          }
        />
        <CardBody>
          <p className="text-sm text-muted">
            Showing {range.from} → {range.to}
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total customers"
          value={stats.totalCustomers}
          icon={Users}
        />
        <StatCard
          label="Returning customers"
          value={stats.returningCustomers}
          icon={RefreshCcw}
        />
        <StatCard
          label="New customers"
          value={stats.newCustomers}
          icon={UserPlus}
        />
        <StatCard
          label="Average order value"
          value={stats.averageOrderValue}
          icon={ShoppingBag}
          format="currency"
          currency={currency}
        />
        <StatCard
          label="Points issued"
          value={stats.pointsIssued}
          icon={Gift}
        />
        <StatCard
          label="Points redeemed"
          value={stats.pointsRedeemed}
          icon={Gift}
        />
        <StatCard
          label="Active coupons"
          value={stats.activeCoupons}
          icon={Ticket}
        />
        <StatCard
          label="Coupon usage"
          value={stats.couponUsage}
          icon={Percent}
        />
        <StatCard
          label="Avg menu rating"
          value={stats.averageMenuRating}
          icon={Star}
        />
        <StatCard
          label="Retention %"
          value={stats.retentionRate}
          icon={Users}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Most favorited"
            description="Dishes saved by customers"
          />
          <CardBody>
            {stats.mostFavorited.length === 0 ? (
              <p className="text-sm text-muted">No favorites yet.</p>
            ) : (
              <ul className="space-y-3">
                {stats.mostFavorited.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <span className="font-medium text-navy">{item.name}</span>
                    <span className="text-sm text-muted">{item.count} saves</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Most reviewed"
            description="Visible reviews by dish"
          />
          <CardBody>
            {stats.mostReviewed.length === 0 ? (
              <p className="text-sm text-muted">No reviews yet.</p>
            ) : (
              <ul className="space-y-3">
                {stats.mostReviewed.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-navy">{item.name}</p>
                      <p className="text-xs text-muted">
                        {item.count} review{item.count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm text-navy">
                      <Star className="h-3.5 w-3.5 text-orange" />
                      {item.average.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
