import { Suspense, type ReactNode } from "react";
import { AdminShell } from "./AdminShell";

function ShellFallback() {
  return <div className="min-h-screen bg-background" />;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
