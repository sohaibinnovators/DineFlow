import { Suspense, type ReactNode } from "react";
import { CustomerShell } from "./CustomerShell";

function ShellFallback() {
  return <div className="min-h-screen bg-background" />;
}

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <CustomerShell>{children}</CustomerShell>
    </Suspense>
  );
}
