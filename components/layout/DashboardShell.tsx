"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { Sidebar, type NavItem } from "./Sidebar";

export function DashboardShell({
  title,
  subtitle,
  items,
  pageTitle,
  profileHref,
  profileName,
  profileRole,
  children,
}: {
  title: string;
  subtitle: string;
  items: NavItem[];
  pageTitle: string;
  profileHref: string;
  profileName: string;
  profileRole: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        title={title}
        subtitle={subtitle}
        items={items}
        open={open}
        onClose={() => setOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          title={pageTitle}
          onMenuClick={() => setOpen(true)}
          profileHref={profileHref}
          profileName={profileName}
          profileRole={profileRole}
        />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
