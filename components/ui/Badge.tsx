import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "orange"
  | "navy";

const tones: Record<Tone, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-success",
  warning: "bg-amber-50 text-warning",
  danger: "bg-red-50 text-danger",
  info: "bg-blue-50 text-info",
  orange: "bg-accent text-orange",
  navy: "bg-navy/10 text-navy",
};

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  const map: Record<string, Tone> = {
    pending: "warning",
    confirmed: "info",
    preparing: "orange",
    ready: "success",
    served: "navy",
    completed: "success",
    cancelled: "danger",
    seated: "orange",
    available: "success",
    occupied: "danger",
    reserved: "warning",
    cleaning: "info",
    active: "success",
    inactive: "default",
    "off-duty": "warning",
    "on-leave": "danger",
    paid: "success",
    unpaid: "warning",
    refunded: "info",
    successful: "success",
    failed: "danger",
    "no-show": "danger",
    scheduled: "info",
    "bank-transfer": "info",
    draft: "default",
    "partially-paid": "orange",
    overdue: "danger",
  };
  return map[status] ?? "default";
}
