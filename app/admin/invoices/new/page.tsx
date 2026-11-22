"use client";

import { InvoiceForm } from "@/components/billing/InvoiceForm";
import {
  findInvoiceIdByNumber,
  nextExpectedInvoiceNumber,
} from "@/components/billing/invoiceHelpers";
import { useData } from "@/components/providers/DataProvider";
import { LoadingState } from "@/components/ui/EmptyState";
import type { InvoiceDraftInput } from "@/lib/types";
import { DEMO_NOW } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminNewInvoicePage() {
  const router = useRouter();
  const { hydrated, store, createInvoice } = useData();
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date(DEMO_NOW).toISOString().slice(0, 10);

  function handleSubmit(input: InvoiceDraftInput) {
    setSubmitting(true);
    const expected = nextExpectedInvoiceNumber(store.billingSettings);
    const result = createInvoice(input);
    if (!result.ok) {
      setErrors(result.errors);
      setSubmitting(false);
      return;
    }
    const id = findInvoiceIdByNumber(expected);
    if (id) {
      router.push(`/admin/invoices/${id}`);
      return;
    }
    setErrors(["Invoice created but detail page could not be resolved."]);
    setSubmitting(false);
  }

  if (!hydrated) return <LoadingState label="Loading invoice form..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl text-navy">Create invoice</h1>
        <p className="mt-1 text-sm text-muted">
          Draft a bill or issue it immediately as unpaid
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
        errors={errors}
        submitting={submitting}
        onCancel={() => router.push("/admin/invoices")}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
