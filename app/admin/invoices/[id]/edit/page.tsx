"use client";

import { InvoiceForm } from "@/components/billing/InvoiceForm";
import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/EmptyState";
import type { InvoiceDraftInput } from "@/lib/types";
import { DEMO_NOW } from "@/lib/utils";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminEditInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrated, store, updateInvoice } = useData();
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const invoice = store.invoices.find((entry) => entry.id === params.id);
  const today = new Date(DEMO_NOW).toISOString().slice(0, 10);

  function handleSubmit(input: InvoiceDraftInput) {
    if (!invoice) return;
    setSubmitting(true);
    const result = updateInvoice(invoice.id, input);
    if (!result.ok) {
      setErrors(result.errors);
      setSubmitting(false);
      return;
    }
    router.push(`/admin/invoices/${invoice.id}`);
  }

  if (!hydrated) return <LoadingState label="Loading invoice..." />;

  if (!invoice) {
    return (
      <div className="space-y-4 animate-fade-up">
        <Alert>Invoice not found.</Alert>
        <Link href="/admin/invoices">
          <Button variant="outline">Back to invoices</Button>
        </Link>
      </div>
    );
  }

  if (invoice.status !== "draft") {
    return (
      <div className="space-y-4 animate-fade-up">
        <Alert>
          Only draft invoices can be edited. This invoice is{" "}
          <strong>{invoice.status}</strong>.
        </Alert>
        <Link href={`/admin/invoices/${invoice.id}`}>
          <Button variant="outline">View invoice</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl text-navy">
          Edit {invoice.invoiceNumber}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Update draft details, then save or issue
        </p>
      </div>
      <InvoiceForm
        customers={store.customers}
        orders={store.orders}
        currency={store.billingSettings.currency}
        defaults={{
          issueDate: today,
          dueDays: store.billingSettings.defaultDueDays,
          taxRate: store.billingSettings.taxRate,
          discountType: store.billingSettings.defaultDiscountType,
          discountValue: store.billingSettings.defaultDiscountValue,
        }}
        initialInvoice={invoice}
        errors={errors}
        submitting={submitting}
        onCancel={() => router.push(`/admin/invoices/${invoice.id}`)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
