"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default function CustomerCouponsPage() {
  const { hydrated, store } = useData();
  const demoId = store.engagement.demoCustomerId;
  const today = "2026-11-22";
  const currency = store.billingSettings.currency;

  if (!hydrated) return <LoadingState label="Loading coupons..." />;

  const available = store.engagement.coupons.filter((coupon) => {
    if (!coupon.active) return false;
    if (coupon.startDate > today || coupon.expiryDate < today) return false;
    if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
      return false;
    }
    if (coupon.perCustomerLimit != null) {
      const used = store.engagement.couponUsages.filter(
        (usage) =>
          usage.couponId === coupon.id && usage.customerId === demoId,
      ).length;
      if (used >= coupon.perCustomerLimit) return false;
    }
    return true;
  });

  const myUsage = store.engagement.couponUsages.filter(
    (usage) => usage.customerId === demoId,
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <Alert tone="info">
        Available demo coupons for session <strong>{demoId}</strong>. Apply at
        cart/checkout.
      </Alert>

      <Card>
        <CardHeader title="Available coupons" />
        <CardBody className="space-y-3">
          {available.length === 0 ? (
            <p className="text-sm text-muted">No coupons available right now.</p>
          ) : (
            available.map((coupon) => (
              <div
                key={coupon.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-xl text-navy">{coupon.code}</p>
                  <Badge tone="success">Active</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{coupon.description}</p>
                <p className="mt-2 text-sm">
                  {coupon.discountType === "percentage"
                    ? `${coupon.discountValue}% off`
                    : `${formatCurrency(coupon.discountValue, currency)} off`}
                  {coupon.minOrderAmount > 0
                    ? ` · min ${formatCurrency(coupon.minOrderAmount, currency)}`
                    : ""}
                </p>
                <p className="text-xs text-muted">
                  Valid {formatDate(coupon.startDate)} –{" "}
                  {formatDate(coupon.expiryDate)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Your uses:{" "}
                  {
                    store.engagement.couponUsages.filter(
                      (usage) =>
                        usage.couponId === coupon.id &&
                        usage.customerId === demoId,
                    ).length
                  }
                  {coupon.perCustomerLimit != null
                    ? ` / ${coupon.perCustomerLimit}`
                    : ""}
                </p>
              </div>
            ))
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/cart">
              <Button>Go to cart</Button>
            </Link>
            <Link href="/menu">
              <Button variant="outline">Browse menu</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Your coupon usage" />
        <CardBody className="space-y-2">
          {myUsage.length === 0 ? (
            <p className="text-sm text-muted">You have not used any coupons yet.</p>
          ) : (
            myUsage.map((usage) => (
              <div
                key={usage.id}
                className="flex justify-between rounded-lg border border-border p-3 text-sm"
              >
                <span>
                  {usage.couponCode} · {formatDate(usage.createdAt)}
                </span>
                <span>
                  -{formatCurrency(usage.discountAmount, currency)}
                </span>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
