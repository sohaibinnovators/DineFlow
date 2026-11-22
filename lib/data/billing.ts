import type {
  BillingSettings,
  DiscountType,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  PaymentRecord,
  RefundRecord,
} from "@/lib/types";
import { roundMoney } from "./calculations";

export function defaultBillingSettings(): BillingSettings {
  return {
    currency: "PKR",
    taxRate: 0.16,
    invoicePrefix: "INV-",
    nextInvoiceSequence: 1001,
    defaultDueDays: 7,
    defaultDiscountType: "fixed",
    defaultDiscountValue: 0,
  };
}

export function calcDiscountAmount(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number,
) {
  const safeValue = Math.max(0, Number(discountValue) || 0);
  if (discountType === "percentage") {
    const pct = Math.min(safeValue, 100);
    return roundMoney((subtotal * pct) / 100);
  }
  return roundMoney(Math.min(safeValue, subtotal));
}

export function buildLineItem(input: {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  menuItemId?: string;
}): InvoiceLineItem {
  const quantity = Math.max(0, Number(input.quantity) || 0);
  const unitPrice = Math.max(0, Number(input.unitPrice) || 0);
  return {
    id: input.id,
    description: input.description.trim(),
    quantity,
    unitPrice,
    lineTotal: roundMoney(quantity * unitPrice),
    menuItemId: input.menuItemId,
  };
}

export function calcInvoiceTotals(input: {
  lineItems: InvoiceLineItem[];
  discountType: DiscountType;
  discountValue: number;
  taxRate: number;
  amountPaid?: number;
}) {
  const subtotal = roundMoney(
    input.lineItems.reduce((sum, line) => sum + line.lineTotal, 0),
  );
  const discountAmount = calcDiscountAmount(
    subtotal,
    input.discountType,
    input.discountValue,
  );
  const taxable = roundMoney(Math.max(0, subtotal - discountAmount));
  const taxRate = Math.max(0, Number(input.taxRate) || 0);
  const taxAmount = roundMoney(taxable * taxRate);
  const grandTotal = roundMoney(taxable + taxAmount);
  const amountPaid = roundMoney(Math.max(0, input.amountPaid ?? 0));
  const remainingBalance = roundMoney(Math.max(0, grandTotal - amountPaid));
  return {
    subtotal,
    discountAmount,
    taxAmount,
    grandTotal,
    amountPaid,
    remainingBalance,
  };
}

export function deriveInvoiceStatus(input: {
  status: InvoiceStatus;
  remainingBalance: number;
  amountPaid: number;
  grandTotal: number;
  dueDate: string;
  today?: string;
}): InvoiceStatus {
  if (input.status === "draft" || input.status === "cancelled") {
    return input.status;
  }
  if (input.grandTotal <= 0 || input.remainingBalance <= 0) {
    return "paid";
  }
  if (input.amountPaid > 0 && input.remainingBalance > 0) {
    const today = input.today ?? new Date().toISOString().slice(0, 10);
    if (input.dueDate < today) return "overdue";
    return "partially-paid";
  }
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  if (input.dueDate < today) return "overdue";
  return "unpaid";
}

export function formatInvoiceNumber(prefix: string, sequence: number) {
  return `${prefix}${String(sequence).padStart(4, "0")}`;
}

export function netCollectedRevenue(
  payments: PaymentRecord[],
  refunds: RefundRecord[],
) {
  const successful = payments
    .filter((payment) => payment.status === "successful")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = refunds.reduce((sum, refund) => sum + refund.amount, 0);
  return roundMoney(Math.max(0, successful - refunded));
}

export function paymentsForInvoice(
  payments: PaymentRecord[],
  invoiceId: string,
) {
  return payments.filter(
    (payment) =>
      payment.invoiceId === invoiceId && payment.status === "successful",
  );
}

export function refundsForInvoice(refunds: RefundRecord[], invoiceId: string) {
  return refunds.filter((refund) => refund.invoiceId === invoiceId);
}

export function refundableAmount(
  payment: PaymentRecord,
  refunds: RefundRecord[],
) {
  if (payment.status === "failed") return 0;
  const already = refunds
    .filter((refund) => refund.paymentId === payment.id)
    .reduce((sum, refund) => sum + refund.amount, 0);
  return roundMoney(Math.max(0, payment.amount - already));
}

export function outstandingInvoices(invoices: Invoice[]) {
  return invoices.filter(
    (invoice) =>
      !["draft", "cancelled", "paid"].includes(invoice.status) &&
      invoice.remainingBalance > 0,
  );
}

export function computeBillingStats(input: {
  invoices: Invoice[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  expenses: { amount: number; date: string; status?: string }[];
  today?: string;
}) {
  const today = input.today ?? "2026-11-22";
  const monthPrefix = today.slice(0, 7);
  const collected = netCollectedRevenue(input.payments, input.refunds);

  const todaysPayments = input.payments.filter(
    (payment) =>
      payment.status === "successful" && payment.paidAt.slice(0, 10) === today,
  );
  const todaysRefunds = input.refunds.filter(
    (refund) => refund.createdAt.slice(0, 10) === today,
  );
  const todayRevenue = roundMoney(
    todaysPayments.reduce((sum, payment) => sum + payment.amount, 0) -
      todaysRefunds.reduce((sum, refund) => sum + refund.amount, 0),
  );

  const monthPayments = input.payments.filter(
    (payment) =>
      payment.status === "successful" && payment.paidAt.startsWith(monthPrefix),
  );
  const monthRefunds = input.refunds.filter((refund) =>
    refund.createdAt.startsWith(monthPrefix),
  );
  const monthlyRevenue = roundMoney(
    monthPayments.reduce((sum, payment) => sum + payment.amount, 0) -
      monthRefunds.reduce((sum, refund) => sum + refund.amount, 0),
  );

  const activeInvoices = input.invoices.filter(
    (invoice) => invoice.status !== "cancelled",
  );
  const paidInvoices = activeInvoices.filter(
    (invoice) => invoice.status === "paid",
  ).length;
  const unpaidInvoices = activeInvoices.filter(
    (invoice) => invoice.status === "unpaid" || invoice.status === "overdue",
  ).length;
  const partiallyPaidInvoices = activeInvoices.filter(
    (invoice) => invoice.status === "partially-paid",
  ).length;
  const outstandingBalance = roundMoney(
    outstandingInvoices(input.invoices).reduce(
      (sum, invoice) => sum + invoice.remainingBalance,
      0,
    ),
  );
  const totalExpenses = roundMoney(
    input.expenses.reduce((sum, expense) => sum + expense.amount, 0),
  );
  const netProfit = roundMoney(collected - totalExpenses);

  return {
    totalRevenue: collected,
    todayRevenue: Math.max(0, todayRevenue),
    monthlyRevenue: Math.max(0, monthlyRevenue),
    totalInvoices: activeInvoices.length,
    paidInvoices,
    unpaidInvoices,
    partiallyPaidInvoices,
    outstandingBalance,
    totalExpenses,
    netProfit,
  };
}

export function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}

export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (typeof window === "undefined") return;
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
