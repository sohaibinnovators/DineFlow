"use client";

import { useData } from "@/components/providers/DataProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/EmptyState";
import { restaurantInfo } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

function methodLabel(method: string) {
  if (method === "bank-transfer") return "Bank transfer";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

export default function AdminPaymentPrintPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { hydrated, store } = useData();
  const currency = store.billingSettings.currency;

  const payment = useMemo(
    () => store.payments.find((entry) => entry.id === id) ?? null,
    [id, store.payments],
  );

  const invoice = useMemo(
    () =>
      payment
        ? (store.invoices.find((entry) => entry.id === payment.invoiceId) ??
          null)
        : null,
    [payment, store.invoices],
  );

  if (!hydrated) return <LoadingState label="Loading receipt..." />;

  if (!payment) {
    return (
      <Card>
        <CardBody className="space-y-4">
          <p className="text-sm text-muted">Payment not found.</p>
          <Link href="/admin/payments" className="no-print">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back to payments
            </Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const dayHours = [...store.settings.hours]
    .sort((a, b) => a.day - b.day)
    .map((slot) => {
      const label = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][slot.day];
      if (slot.closed) return `${label}: Closed`;
      return `${label}: ${slot.open} – ${slot.close}`;
    });

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-fade-up">
      <div className="no-print flex flex-wrap gap-2">
        <Link href={`/admin/payments/${payment.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <article className="rounded-xl border border-border bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <header className="border-b border-border pb-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange">
            {restaurantInfo.productName}
          </p>
          <h1 className="mt-2 font-display text-3xl text-navy">
            {restaurantInfo.name}
          </h1>
          <p className="mt-1 text-sm text-muted">{restaurantInfo.tagline}</p>
          <div className="mt-4 space-y-1 text-sm text-muted">
            <p>{restaurantInfo.address}</p>
            <p>{restaurantInfo.city}</p>
            <p>
              {restaurantInfo.phone} · {restaurantInfo.email}
            </p>
            <p>
              Tax rate {(store.billingSettings.taxRate * 100).toFixed(0)}% ·{" "}
              {currency}
            </p>
          </div>
        </header>

        <div className="py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Payment receipt
              </p>
              <p className="mt-1 font-display text-2xl text-navy">
                {payment.receiptNumber}
              </p>
            </div>
            <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Invoice
              </dt>
              <dd className="mt-1 text-sm font-medium text-navy">
                {payment.invoiceNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Payment date
              </dt>
              <dd className="mt-1 text-sm text-navy">
                {formatDate(payment.paidAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Method
              </dt>
              <dd className="mt-1 text-sm text-navy">
                {methodLabel(payment.method)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Amount paid
              </dt>
              <dd className="mt-1 font-display text-xl text-navy">
                {formatCurrency(payment.amount, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Remaining balance
              </dt>
              <dd className="mt-1 text-sm font-medium text-navy">
                {formatCurrency(invoice?.remainingBalance ?? 0, currency)}
              </dd>
            </div>
            {invoice ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Customer
                </dt>
                <dd className="mt-1 text-sm text-navy">{invoice.customerName}</dd>
              </div>
            ) : null}
            {payment.notes ? (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Notes
                </dt>
                <dd className="mt-1 text-sm text-navy">{payment.notes}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <footer className="border-t border-border pt-6 text-xs text-muted">
          <p className="font-medium text-navy">Hours</p>
          <ul className="mt-2 space-y-0.5">
            {dayHours.length
              ? dayHours.map((line) => <li key={line}>{line}</li>)
              : restaurantInfo.hours.map((item) => (
                  <li key={item.day}>
                    {item.day}: {item.time}
                  </li>
                ))}
          </ul>
          <p className="mt-4">
            Thank you for dining with {restaurantInfo.name}. Powered by{" "}
            {restaurantInfo.productName}.
          </p>
        </footer>
      </article>
    </div>
  );
}
