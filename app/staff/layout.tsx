import { Suspense, type ReactNode } from "react";
import { StaffShell } from "./StaffShell";

function ShellFallback() {
  return <div className="min-h-screen bg-background" />;
}

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <StaffShell>{children}</StaffShell>
    </Suspense>
  );
}
