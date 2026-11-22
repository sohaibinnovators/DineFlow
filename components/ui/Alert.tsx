import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Alert({
  children,
  tone = "danger",
  className,
}: {
  children: ReactNode;
  tone?: "danger" | "success" | "info";
  className?: string;
}) {
  const tones = {
    danger: "border-red-200 bg-red-50 text-danger",
    success: "border-emerald-200 bg-emerald-50 text-success",
    info: "border-blue-200 bg-blue-50 text-info",
  };

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
