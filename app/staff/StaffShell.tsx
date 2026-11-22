"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { staffNav } from "@/lib/nav";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const titles: Record<string, string> = {
  "/staff": "Overview",
  "/staff/orders": "Assigned Orders",
  "/staff/tables": "Table Status",
  "/staff/reservations": "Reservations",
  "/staff/customers": "Customers",
  "/staff/notifications": "Notifications",
  "/staff/profile": "Profile",
};

export function StaffShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageTitle =
    titles[pathname] ??
    staffNav.find((item) => item.href === pathname)?.label ??
    "Staff";

  return (
    <DashboardShell
      title="Staff"
      subtitle="Floor Service"
      items={staffNav}
      pageTitle={pageTitle}
      profileHref="/staff/profile"
      profileName="Daniel Ortiz"
      profileRole="Waiter"
    >
      {children}
    </DashboardShell>
  );
}
