"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { kitchenNav } from "@/lib/nav";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const titles: Record<string, string> = {
  "/kitchen": "Kitchen Board",
  "/kitchen/incoming": "Incoming",
  "/kitchen/preparing": "Preparing",
  "/kitchen/ready": "Ready",
  "/kitchen/completed": "Completed",
};

export function KitchenShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageTitle =
    titles[pathname] ??
    kitchenNav.find((item) => item.href === pathname)?.label ??
    "Kitchen";

  return (
    <DashboardShell
      title="Kitchen"
      subtitle="Expo Display"
      items={kitchenNav}
      pageTitle={pageTitle}
      profileHref="/kitchen"
      profileName="Elena Marquez"
      profileRole="Executive Chef"
    >
      {children}
    </DashboardShell>
  );
}
