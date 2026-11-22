import type { InvoiceStatus } from "@/lib/types";
import { formatInvoiceNumber } from "@/lib/data/billing";
import { loadStore } from "@/lib/data/store";
import type { BillingSettings } from "@/lib/types";

export function invoiceStatusTone(
  status: InvoiceStatus,
): "default" | "success" | "warning" | "danger" | "info" | "orange" | "navy" {
  const map: Record<InvoiceStatus, "default" | "success" | "warning" | "danger" | "info" | "orange" | "navy"> = {
    draft: "default",
    unpaid: "warning",
    "partially-paid": "orange",
    paid: "success",
    overdue: "danger",
    cancelled: "danger",
  };
  return map[status] ?? "default";
}

export function addDaysIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nextExpectedInvoiceNumber(settings: BillingSettings) {
  return formatInvoiceNumber(settings.invoicePrefix, settings.nextInvoiceSequence);
}

export function findInvoiceIdByNumber(invoiceNumber: string) {
  return loadStore().invoices.find((invoice) => invoice.invoiceNumber === invoiceNumber)
    ?.id;
}

export function findNewestInvoiceId(previousIds: Set<string>) {
  return loadStore().invoices.find((invoice) => !previousIds.has(invoice.id))?.id;
}

export function paymentMethodLabel(method: string) {
  if (method === "bank-transfer") return "Bank transfer";
  return method.charAt(0).toUpperCase() + method.slice(1);
}
