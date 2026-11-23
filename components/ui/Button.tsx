import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "outlineInverse"
  | "ghost"
  | "ghostInverse"
  | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-[#1c3250]",
  secondary: "bg-orange text-white hover:bg-[#d67a35]",
  outline: "border border-border bg-white text-navy hover:bg-accent",
  outlineInverse:
    "border border-white/30 bg-transparent text-white hover:bg-white/10",
  ghost: "text-navy hover:bg-accent",
  ghostInverse: "text-white hover:bg-white/10",
  danger: "bg-danger text-white hover:bg-[#991b1b]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
