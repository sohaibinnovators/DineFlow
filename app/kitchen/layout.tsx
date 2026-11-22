import { Suspense, type ReactNode } from "react";
import { KitchenShell } from "./KitchenShell";

function ShellFallback() {
  return <div className="min-h-screen bg-background" />;
}

export default function KitchenLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <KitchenShell>{children}</KitchenShell>
    </Suspense>
  );
}
