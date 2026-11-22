"use client";

import { Select } from "@/components/ui/Input";
import type { OrderType } from "@/lib/types";

export type OrderTypeFilterValue = OrderType | "all";

const OPTIONS: Array<{ value: OrderTypeFilterValue; label: string }> = [
  { value: "all", label: "All order types" },
  { value: "dine-in", label: "Dine-in" },
  { value: "takeaway", label: "Takeaway" },
  { value: "delivery", label: "Delivery" },
];

export function OrderTypeFilter({
  value,
  onChange,
  className,
}: {
  value: OrderTypeFilterValue;
  onChange: (value: OrderTypeFilterValue) => void;
  className?: string;
}) {
  return (
    <Select
      value={value}
      onChange={(event) =>
        onChange(event.target.value as OrderTypeFilterValue)
      }
      className={className ?? "sm:w-48"}
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

export function matchesOrderType(
  orderType: OrderType,
  filter: OrderTypeFilterValue,
) {
  return filter === "all" || orderType === filter;
}
