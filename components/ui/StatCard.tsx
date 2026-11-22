import { cn, formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "./Card";

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  format = "number",
  currency = "PKR",
}: {
  label: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  format?: "number" | "currency";
  currency?: string;
}) {
  const positive = (change ?? 0) >= 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-2 font-display text-2xl text-navy">
            {format === "currency"
              ? formatCurrency(value, currency)
              : value.toLocaleString()}
          </p>
          {typeof change === "number" ? (
            <p
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                positive ? "text-success" : "text-danger",
              )}
            >
              {positive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {Math.abs(change)}% vs last week
            </p>
          ) : null}
        </div>
        <div className="rounded-lg bg-accent p-2.5 text-orange">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
