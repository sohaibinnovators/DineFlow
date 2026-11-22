import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-slate-50 px-6 py-12 text-center">
      <h3 className="font-display text-lg text-navy">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-border bg-white px-6 py-16">
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange border-t-transparent" />
        {label}
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again or refresh the page.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <h3 className="font-display text-lg text-danger">{title}</h3>
      <p className="mt-2 text-sm text-danger/80">{description}</p>
    </div>
  );
}
