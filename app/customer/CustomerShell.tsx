"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { customerNav } from "@/lib/nav";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const titles: Record<string, string> = {
  "/customer": "Overview",
  "/customer/orders": "My Orders",
  "/customer/reservations": "Reservations",
  "/customer/favorites": "Favorites",
  "/customer/loyalty": "Loyalty",
  "/customer/coupons": "Coupons",
  "/customer/reviews": "My Reviews",
  "/customer/notifications": "Notifications",
  "/customer/profile": "My Profile",
};

export function CustomerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageTitle = pathname.startsWith("/customer/orders/")
    ? "Order Details"
    : (titles[pathname] ??
      customerNav.find((item) => item.href === pathname)?.label ??
      "Guest");

  return (
    <DashboardShell
      title="Guest"
      subtitle="Demo session · cus-1"
      items={customerNav}
      pageTitle={pageTitle}
      profileHref="/customer/profile"
      profileName="Olivia Harper"
      profileRole="Demo guest"
    >
      {children}
    </DashboardShell>
  );
}
