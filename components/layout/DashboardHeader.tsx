"use client";

import { notifications } from "@/lib/mock-data";
import { formatRelativeTime } from "@/lib/utils";
import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Input";

export function DashboardHeader({
  title,
  onMenuClick,
  profileHref,
  profileName,
  profileRole,
}: {
  title: string;
  onMenuClick: () => void;
  profileHref: string;
  profileName: string;
  profileRole: string;
}) {
  const unread = notifications.filter((item) => !item.read).length;

  return (
    <header className="dashboard-header sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg border border-border p-2 text-navy lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-xl text-navy sm:text-2xl">{title}</h1>
            <p className="hidden text-xs text-muted sm:block">
              Manage smarter. Serve better.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Search dashboard..." className="w-64 pl-9" />
          </div>

          <Dropdown
            label={
              <span className="relative inline-flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
                {unread > 0 ? (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[10px] text-white">
                    {unread}
                  </span>
                ) : null}
              </span>
            }
          >
            {notifications.slice(0, 4).map((item) => (
              <DropdownItem key={item.id} className="flex-col items-start! gap-0.5">
                <span className="font-medium">{item.title}</span>
                <span className="text-xs text-muted">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </DropdownItem>
            ))}
            {profileHref.includes("/kitchen") ? null : (
              <Link
                href={`${profileHref.replace(/\/profile$/, "")}/notifications`}
                className="mt-1 block rounded-lg px-3 py-2 text-sm text-orange hover:bg-accent"
              >
                View all notifications
              </Link>
            )}
          </Dropdown>

          <Link
            href={profileHref}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 hover:bg-accent"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
              {profileName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium text-navy">
                {profileName}
              </span>
              <span className="block text-xs text-muted">{profileRole}</span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
