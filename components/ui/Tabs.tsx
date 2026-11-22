"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useState } from "react";

export function Tabs({
  tabs,
  defaultTab,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
  defaultTab?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition",
              active === tab.id
                ? "border-orange text-navy"
                : "border-transparent text-muted hover:text-navy",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">
        {tabs.find((tab) => tab.id === active)?.content}
      </div>
    </div>
  );
}
