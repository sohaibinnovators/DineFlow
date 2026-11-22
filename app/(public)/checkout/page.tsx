"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState, LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import {
  calcCartTotals,
  cartSubtotal,
  validateCoupon,
} from "@/lib/data/engagement";
import { loadStore } from "@/lib/data/store";
import type {
  CheckoutPaymentMethod,
  OrderType,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";

const PAYMENT_OPTIONS: Array<{ value: CheckoutPaymentMethod; label: string }> = [
  { value: "cash-at-restaurant", label: "Cash at restaurant" },
  { value: "cash-on-delivery", label: "Cash on delivery" },
  { value: "card-simulated", label: "Card (simulated)" },
  { value: "bank-transfer-demo", label: "Bank transfer (demo)" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const {
    hydrated,
    store,
    checkoutCart,
    applyCartCoupon,
    removeCartCoupon,
  } = useData();

  const demoId = store.engagement.demoCustomerId;
  const demoCustomer = store.customers.find((c) => c.id === demoId);

  const submissionTokenRef = useRef("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [type, setType] = useState<OrderType>("takeaway");
  const [tableId, setTableId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] =
    useState<CheckoutPaymentMethod>("cash-at-restaurant");
  const [couponInput, setCouponInput] = useState("");

  const displayName = customerName || demoCustomer?.name || "";
  const displayEmail = customerEmail || demoCustomer?.email || "";
  const displayPhone = customerPhone || demoCustomer?.phone || "";
  const displayAddress = deliveryAddress || demoCustomer?.address || "";
  const displayCoupon = couponInput || store.cart.couponCode || "";

  const currency = store.billingSettings.currency;
  const taxRate = store.billingSettings.taxRate;

  const availableTables = store.tables.filter(
    (table) => table.status === "available",
  );

  const discount = useMemo(() => {
    if (!store.cart.couponCode) return 0;
    const coupon = store.engagement.coupons.find(
      (entry) =>
        entry.code.toUpperCase() === store.cart.couponCode?.toUpperCase(),
    );
    const subtotal = cartSubtotal(store.cart.items);
    const lineItems = store.cart.items.map((item) => {
      const menu = store.menuItems.find((entry) => entry.id === item.menuItemId);
      return {
        menuItemId: item.menuItemId,
        lineTotal: item.unitPrice * item.quantity,
        categoryId: menu?.categoryId,
      };
    });
    const result = validateCoupon({
      coupon,
      code: store.cart.couponCode,
      subtotal,
      today: "2026-11-22",
      customerId: demoId,
      usages: store.engagement.couponUsages,
      lineItems,
    });
    return result.ok ? result.discount : 0;
  }, [demoId, store.cart, store.engagement, store.menuItems]);

  const totals = calcCartTotals({
    items: store.cart.items,
    discount,
    taxRate,
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrors([]);

    if (!submissionTokenRef.current) {
      submissionTokenRef.current = `tok-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    const name = displayName.trim();
    const email = displayEmail.trim();
    const phone = displayPhone.trim();
    const address = displayAddress.trim();
    const couponCode = displayCoupon.trim() || undefined;
    const previousIds = new Set(store.orders.map((order) => order.id));

    if (couponCode && couponCode !== store.cart.couponCode) {
      const couponResult = applyCartCoupon(couponCode, demoId);
      if (!couponResult.ok) {
        setErrors(couponResult.errors);
        setSubmitting(false);
        return;
      }
    }

    const result = checkoutCart({
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      customerId: demoId,
      type,
      tableId: type === "dine-in" ? tableId || undefined : undefined,
      deliveryAddress: type === "delivery" ? address || undefined : undefined,
      orderNotes: orderNotes.trim() || undefined,
      couponCode: couponCode || store.cart.couponCode,
      checkoutPaymentMethod,
      submissionToken: submissionTokenRef.current,
    });

    if (!result.ok) {
      setErrors(result.errors);
      setSubmitting(false);
      return;
    }

    const token = submissionTokenRef.current;
    const fresh = loadStore();
    const order =
      fresh.orders.find((entry) => entry.submissionToken === token) ??
      fresh.orders.find((entry) => !previousIds.has(entry.id));

    if (order) {
      router.push(`/order-confirmation?id=${order.id}`);
      return;
    }

    router.push("/customer/orders");
  }

  if (!hydrated) return <LoadingState label="Loading checkout..." />;

  if (!store.cart.items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Nothing to checkout"
          description="Add dishes to your cart before placing an order."
          action={
            <Link href="/menu">
              <Button>Browse menu</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-display text-3xl text-navy">Checkout</h1>
        <p className="mt-1 text-sm text-muted">
          Demo session ({demoId}) — no real payment is processed.
        </p>
      </div>

      {errors.length > 0 ? (
        <Alert tone="danger">
          <ul className="list-disc pl-4">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]"
      >
        <Card>
          <CardHeader
            title="Guest details"
            description="Prefills from the demo customer when available."
          />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <Input
                value={displayName}
                onChange={(event) => setCustomerName(event.target.value)}
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={displayEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                required
              />
            </Field>
            <Field label="Phone">
              <Input
                value={displayPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                required
              />
            </Field>
            <Field label="Order type">
              <Select
                value={type}
                onChange={(event) => setType(event.target.value as OrderType)}
              >
                <option value="dine-in">Dine-in</option>
                <option value="takeaway">Takeaway</option>
                <option value="delivery">Delivery</option>
              </Select>
            </Field>
            <Field label="Payment method">
              <Select
                value={checkoutPaymentMethod}
                onChange={(event) =>
                  setCheckoutPaymentMethod(
                    event.target.value as CheckoutPaymentMethod,
                  )
                }
              >
                {PAYMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            {type === "dine-in" ? (
              <Field label="Table" className="sm:col-span-2">
                <Select
                  value={tableId}
                  onChange={(event) => setTableId(event.target.value)}
                  required
                >
                  <option value="">Select an available table</option>
                  {availableTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      Table {table.number} · {table.section} · seats{" "}
                      {table.capacity}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {type === "delivery" ? (
              <Field label="Delivery address" className="sm:col-span-2">
                <Textarea
                  value={displayAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  required
                />
              </Field>
            ) : null}

            <Field label="Order notes" className="sm:col-span-2">
              <Textarea
                value={orderNotes}
                onChange={(event) => setOrderNotes(event.target.value)}
                placeholder="Gate code, allergens, timing…"
                className="min-h-20"
              />
            </Field>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Coupon" description="Optional" />
            <CardBody className="space-y-3">
              <Field label="Code">
                <Input
                  value={displayCoupon}
                  onChange={(event) => setCouponInput(event.target.value)}
                  placeholder="WELCOME10"
                />
              </Field>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => {
                    const result = applyCartCoupon(displayCoupon, demoId);
                    setErrors(result.ok ? [] : result.errors);
                  }}
                >
                  Apply
                </Button>
                {store.cart.couponCode ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      removeCartCoupon();
                      setCouponInput("");
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              {store.cart.couponCode ? (
                <p className="text-sm text-success">
                  Applied: {store.cart.couponCode}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Order summary" />
            <CardBody className="space-y-3 text-sm">
              <ul className="space-y-2">
                {store.cart.items.map((item) => (
                  <li
                    key={`${item.menuItemId}-${item.notes ?? ""}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="text-muted">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="shrink-0 text-navy">
                      {formatCurrency(
                        item.unitPrice * item.quantity,
                        currency,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1 border-t border-border pt-3">
                <div className="flex justify-between">
                  <span className="text-muted">Subtotal</span>
                  <span>{formatCurrency(totals.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Discount</span>
                  <span>-{formatCurrency(totals.discount, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">
                    Tax ({(taxRate * 100).toFixed(0)}%)
                  </span>
                  <span>{formatCurrency(totals.tax, currency)}</span>
                </div>
                <div className="flex justify-between pt-1 font-display text-lg text-navy">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total, currency)}</span>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitting}
              >
                {submitting ? "Placing order…" : "Place order"}
              </Button>
              <Link href="/cart" className="block">
                <Button type="button" variant="outline" className="w-full">
                  Back to cart
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </form>
    </div>
  );
}
