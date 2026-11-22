"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState, LoadingState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Input";
import {
  calcCartTotals,
  cartSubtotal,
  validateCoupon,
} from "@/lib/data/engagement";
import { formatCurrency } from "@/lib/utils";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function CartPage() {
  const {
    hydrated,
    store,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    applyCartCoupon,
    removeCartCoupon,
  } = useData();
  const [couponInput, setCouponInput] = useState(store.cart.couponCode ?? "");
  const [errors, setErrors] = useState<string[]>([]);

  const currency = store.billingSettings.currency;
  const taxRate = store.billingSettings.taxRate;
  const demoId = store.engagement.demoCustomerId;

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

  if (!hydrated) return <LoadingState label="Loading cart..." />;

  if (!store.cart.items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          description="Browse the menu and add dishes to start an order."
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-navy">Your cart</h1>
          <p className="text-sm text-muted">
            Demo session ({demoId}) — prices snapshot when items were added.
          </p>
        </div>
        <Button variant="outline" onClick={() => clearCart()}>
          Clear cart
        </Button>
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

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader title="Items" description={`${store.cart.items.length} line(s)`} />
          <CardBody className="space-y-4">
            {store.cart.items.map((item) => (
              <div
                key={`${item.menuItemId}-${item.notes ?? ""}`}
                className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center"
              >
                <div className="relative h-20 w-28 overflow-hidden rounded-md bg-slate-100">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy">{item.name}</p>
                  <p className="text-sm text-muted">
                    {formatCurrency(item.unitPrice, currency)} each
                  </p>
                  {item.notes ? (
                    <p className="text-xs text-muted">Note: {item.notes}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateCartQuantity(
                        item.menuItemId,
                        item.quantity - 1,
                        item.notes,
                      )
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateCartQuantity(
                        item.menuItemId,
                        item.quantity + 1,
                        item.notes,
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFromCart(item.menuItemId, item.notes)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm font-semibold text-navy sm:w-24 sm:text-right">
                  {formatCurrency(item.unitPrice * item.quantity, currency)}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Coupon" description="Try WELCOME10 or FLAT300" />
            <CardBody className="space-y-3">
              <Field label="Code">
                <Input
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value)}
                  placeholder="Coupon code"
                />
              </Field>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    const result = applyCartCoupon(couponInput, demoId);
                    setErrors(result.ok ? [] : result.errors);
                  }}
                >
                  Apply
                </Button>
                {store.cart.couponCode ? (
                  <Button
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
            <CardHeader title="Summary" />
            <CardBody className="space-y-2 text-sm">
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
              <div className="flex justify-between border-t border-border pt-2 font-display text-lg text-navy">
                <span>Total</span>
                <span>{formatCurrency(totals.total, currency)}</span>
              </div>
              <Link href="/checkout" className="mt-3 block">
                <Button className="w-full">Checkout</Button>
              </Link>
              <Link href="/menu" className="block">
                <Button variant="outline" className="w-full">
                  Continue shopping
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
