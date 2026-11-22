"use client";

import { useData } from "@/components/providers/DataProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const PAYMENT_LABELS: Record<string, string> = {
  "cash-on-delivery": "Cash on delivery",
  "cash-at-restaurant": "Cash at restaurant",
  "card-simulated": "Card (simulated)",
  "bank-transfer-demo": "Bank transfer (demo)",
};

export function OrderConfirmationClient() {
  const searchParams = useSearchParams();
  const { hydrated, store } = useData();
  const id = searchParams.get("id");
  const token = searchParams.get("token");
  const currency = store.billingSettings.currency;

  if (!hydrated) return <LoadingState label="Loading confirmation..." />;

  const order =
    store.orders.find((entry) => (id ? entry.id === id : false)) ??
    store.orders.find((entry) =>
      token ? entry.submissionToken === token : false,
    ) ??
    null;

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Order not found"
          description="We could not match this confirmation link. Check My Orders if you already placed it."
        />
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/menu">
            <Button>Back to menu</Button>
          </Link>
          <Link href="/customer/orders">
            <Button variant="outline">My orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-wide text-orange uppercase">
          Confirmed
        </p>
        <h1 className="mt-2 font-display text-3xl text-navy sm:text-4xl">
          Thanks, {order.customerName}
        </h1>
        <p className="mt-2 text-muted">
          Order {order.orderNumber} was placed{" "}
          {formatDateTime(order.createdAt)}.
        </p>
      </div>

      <Card>
        <CardHeader
          title={order.orderNumber}
          description={`${order.type.replace("-", " ")} · ${
            PAYMENT_LABELS[order.checkoutPaymentMethod ?? ""] ??
            "Payment pending"
          }`}
          action={<Badge tone={statusTone(order.status)}>{order.status}</Badge>}
        />
        <CardBody className="space-y-5">
          <ul className="space-y-2">
            {order.items.map((item, index) => (
              <li
                key={`${order.id}-${item.menuItemId}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm"
              >
                <span className="text-navy">
                  {item.quantity}× {item.name}
                  {item.notes ? (
                    <span className="mt-0.5 block text-xs text-muted">
                      {item.notes}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-medium text-navy">
                  {formatCurrency(item.price * item.quantity, currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{formatCurrency(order.subtotal, currency)}</span>
            </div>
            {order.discount > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted">
                  Discount
                  {order.couponCode ? ` (${order.couponCode})` : ""}
                </span>
                <span>-{formatCurrency(order.discount, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted">Tax</span>
              <span>{formatCurrency(order.tax, currency)}</span>
            </div>
            <div className="flex justify-between pt-1 font-display text-lg text-navy">
              <span>Total</span>
              <span>{formatCurrency(order.total, currency)}</span>
            </div>
          </div>

          {order.deliveryAddress ? (
            <p className="text-sm text-muted">
              Deliver to: {order.deliveryAddress}
            </p>
          ) : null}
          {order.tableNumber ? (
            <p className="text-sm text-muted">Table {order.tableNumber}</p>
          ) : null}
          {order.orderNotes ? (
            <p className="text-sm text-muted">Notes: {order.orderNotes}</p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={`/customer/orders/${order.id}`}>
              <Button>Track order</Button>
            </Link>
            <Link href="/menu">
              <Button variant="outline">Order more</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
