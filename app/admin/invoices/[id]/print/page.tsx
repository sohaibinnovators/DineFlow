"use client";

import { paymentMethodLabel } from "@/components/billing/invoiceHelpers";
import { useData } from "@/components/providers/DataProvider";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/EmptyState";
import { restaurantInfo } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const { hydrated, store } = useData();
  const invoice = store.invoices.find((entry) => entry.id === params.id);
  const currency = store.billingSettings.currency;

  const payments = useMemo(
    () =>
      store.payments
        .filter((payment) => payment.invoiceId === params.id)
        .sort(
          (a, b) =>
            new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime(),
        ),
    [params.id, store.payments],
  );

  if (!hydrated) return <LoadingState label="Loading invoice..." />;

  if (!invoice) {
    return (
      <div className="space-y-4 p-6">
        <p>Invoice not found.</p>
        <Link href="/admin/invoices">Back</Link>
      </div>
    );
  }

  return (
    <div className="print-document mx-auto max-w-3xl space-y-6 bg-white p-6 text-navy animate-fade-up">
      <style>{`
        @media print {
          aside, header, nav, .no-print { display: none !important; }
          .print-document { padding: 0 !important; }
          body { background: white !important; }
        }
      `}</style>
      <div className="no-print flex gap-2">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print invoice
        </Button>
        <Link href={`/admin/invoices/${invoice.id}`}>
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <header className="border-b border-border pb-4">
        <p className="text-sm font-medium uppercase tracking-wide text-orange">
          {restaurantInfo.productName}
        </p>
        <h1 className="font-display text-3xl">{restaurantInfo.name}</h1>
        <p className="mt-2 text-sm text-muted">
          {restaurantInfo.address}
          <br />
          {restaurantInfo.city}
          <br />
          {restaurantInfo.phone} · {restaurantInfo.email}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl">Invoice</h2>
          <p className="mt-1 text-sm">
            <span className="text-muted">Number:</span> {invoice.invoiceNumber}
          </p>
          <p className="text-sm">
            <span className="text-muted">Status:</span> {invoice.status}
          </p>
          {invoice.orderNumber ? (
            <p className="text-sm">
              <span className="text-muted">Order:</span> {invoice.orderNumber}
            </p>
          ) : null}
        </div>
        <div className="text-sm sm:text-right">
          <p>
            <span className="text-muted">Issue date:</span>{" "}
            {formatDate(invoice.issueDate)}
          </p>
          <p>
            <span className="text-muted">Due date:</span>{" "}
            {formatDate(invoice.dueDate)}
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-border p-4 text-sm">
        <p className="font-medium">Bill to</p>
        <p className="mt-1">{invoice.customerName}</p>
        {invoice.customerEmail ? <p>{invoice.customerEmail}</p> : null}
        {invoice.customerPhone ? <p>{invoice.customerPhone}</p> : null}
      </section>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 font-medium">Qty</th>
            <th className="py-2 font-medium">Unit</th>
            <th className="py-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((line) => (
            <tr key={line.id} className="border-b border-border/70">
              <td className="py-2">{line.description}</td>
              <td className="py-2">{line.quantity}</td>
              <td className="py-2">
                {formatCurrency(line.unitPrice, currency)}
              </td>
              <td className="py-2 text-right">
                {formatCurrency(line.lineTotal, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(invoice.subtotal, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-{formatCurrency(invoice.discountAmount, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax ({(invoice.taxRate * 100).toFixed(2)}%)</span>
          <span>{formatCurrency(invoice.taxAmount, currency)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
          <span>Grand total</span>
          <span>{formatCurrency(invoice.grandTotal, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>Amount paid</span>
          <span>{formatCurrency(invoice.amountPaid, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>Remaining balance</span>
          <span>{formatCurrency(invoice.remainingBalance, currency)}</span>
        </div>
      </div>

      {payments.length > 0 ? (
        <section>
          <h3 className="font-display text-lg">Payment history</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {payments.map((payment) => (
              <li key={payment.id} className="flex justify-between gap-3">
                <span>
                  {payment.receiptNumber} · {formatDate(payment.paidAt)} ·{" "}
                  {paymentMethodLabel(payment.method)} · {payment.status}
                </span>
                <span>{formatCurrency(payment.amount, currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {invoice.notes ? (
        <section>
          <h3 className="font-display text-lg">Notes</h3>
          <p className="mt-1 text-sm text-muted">{invoice.notes}</p>
        </section>
      ) : null}

      <p className="text-xs text-muted">
        Generated by {restaurantInfo.productName} for {restaurantInfo.name}.
        Reservation windows: {store.settings.reservationDurationMinutes} min.
      </p>
    </div>
  );
}
