"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { adminNav } from "@/lib/nav";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const titles: Record<string, string> = {
  "/admin": "Overview",
  "/admin/engagement": "Engagement",
  "/admin/coupons": "Coupons",
  "/admin/reviews": "Reviews",
  "/admin/loyalty": "Loyalty",
  "/admin/billing": "Billing",
  "/admin/invoices": "Invoices",
  "/admin/payments": "Payments",
  "/admin/orders": "Orders",
  "/admin/menu": "Menu",
  "/admin/categories": "Categories",
  "/admin/recipes": "Recipes",
  "/admin/tables": "Tables",
  "/admin/reservations": "Reservations",
  "/admin/customers": "Customers",
  "/admin/staff": "Staff & Shifts",
  "/admin/inventory": "Inventory",
  "/admin/suppliers": "Suppliers",
  "/admin/expenses": "Expenses",
  "/admin/reports": "Reports",
  "/admin/notifications": "Notifications",
  "/admin/settings": "Settings",
  "/admin/profile": "Profile",
};

function resolveTitle(pathname: string) {
  if (pathname.startsWith("/admin/orders/")) return "Orders";
  if (pathname.startsWith("/admin/invoices/")) return "Invoices";
  if (pathname.startsWith("/admin/payments/")) return "Payments";
  return (
    titles[pathname] ??
    adminNav.find((item) => item.href === pathname)?.label ??
    "Admin"
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageTitle = resolveTitle(pathname);

  return (
    <DashboardShell
      title="Admin"
      subtitle="Restaurant Ops"
      items={adminNav}
      pageTitle={pageTitle}
      profileHref="/admin/profile"
      profileName="Priya Shah"
      profileRole="General Manager"
    >
      {children}
    </DashboardShell>
  );
}
