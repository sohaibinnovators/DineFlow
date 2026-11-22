"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { orderTimelineStatuses } from "@/lib/data/engagement";
import type { Order, OrderStatus } from "@/lib/types";
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
} from "@/lib/utils";
import { ArrowLeft, Check, Star } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

function paymentLabel(method?: Order["checkoutPaymentMethod"]) {
  switch (method) {
    case "cash-on-delivery":
      return "Cash on delivery";
    case "cash-at-restaurant":
      return "Cash at restaurant";
    case "card-simulated":
      return "Card (simulated)";
    case "bank-transfer-demo":
      return "Bank transfer (demo)";
    default:
      return "Not specified";
  }
}

function timelineLabel(status: OrderStatus, type: Order["type"]) {
  if (type === "delivery" && status === "served") return "Out for delivery";
  return status.replace("-", " ");
}

export function OrderDetail({ id }: { id: string }) {
  const { hydrated, store, submitReview } = useData();
  const demoId = store.engagement?.demoCustomerId ?? "cus-1";
  const currency = store.billingSettings?.currency || "PKR";

  const [reviewItemId, setReviewItemId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState("");

  const order = useMemo(
    () =>
      store.orders.find(
        (entry) => entry.id === id && entry.customerId === demoId,
      ),
    [demoId, id, store.orders],
  );

  const reviews = store.engagement?.reviews ?? [];
  const reviewedItemIds = new Set(
    reviews
      .filter(
        (review) =>
          review.orderId === id && review.customerId === demoId,
      )
      .map((review) => review.menuItemId),
  );

  if (!hydrated) return <LoadingState label="Loading order..." />;

  if (!order) {
    return (
      <ErrorState
        title="Order not found"
        description="This order may have been removed or does not belong to the demo guest account."
      />
    );
  }

  const steps = orderTimelineStatuses(order.type);
  const historyStatuses = new Set(
    (order.statusHistory ?? []).map((entry) => entry.status),
  );
  historyStatuses.add(order.status);
  const currentIndex = Math.max(
    0,
    steps.findIndex((status) => status === order.status),
  );

  const reviewTarget = order.items.find(
    (item) => item.menuItemId === reviewItemId,
  );

  function onSubmitReview(event: FormEvent) {
    event.preventDefault();
    if (!reviewItemId) return;
    setSuccess("");
    const result = submitReview({
      customerId: demoId,
      menuItemId: reviewItemId,
      orderId: id,
      rating,
      comment,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setSuccess("Review submitted.");
    setReviewItemId(null);
    setComment("");
    setRating(5);
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <Alert tone="info">
        Demo session ({demoId}) — viewing guest order detail without real auth.
      </Alert>

      {success ? <Alert tone="success">{success}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/customer/orders">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </Button>
        </Link>
        <Badge tone={statusTone(order.status)}>{order.status}</Badge>
      </div>

      <Card>
        <CardHeader
          title={order.orderNumber}
          description={`${order.type.replace("-", " ")} · placed ${formatDateTime(order.createdAt)}`}
        />
        <CardBody className="space-y-6">
          <div>
            <h3 className="font-display text-lg text-navy">Status timeline</h3>
            <ol className="mt-4 space-y-3">
              {steps.map((status, index) => {
                const reached =
                  historyStatuses.has(status) || index <= currentIndex;
                const isCurrent = status === order.status;
                const stamp = order.statusHistory?.find(
                  (entry) => entry.status === status,
                )?.at;
                return (
                  <li key={status} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        reached
                          ? "border-orange bg-orange text-white"
                          : "border-border bg-white text-muted"
                      }`}
                    >
                      {reached ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`font-medium capitalize ${
                            reached ? "text-navy" : "text-muted"
                          }`}
                        >
                          {timelineLabel(status, order.type)}
                        </p>
                        {isCurrent ? (
                          <Badge tone="orange">Current</Badge>
                        ) : null}
                      </div>
                      {stamp ? (
                        <p className="text-xs text-muted">
                          {formatDateTime(stamp)}
                        </p>
                      ) : isCurrent ? (
                        <p className="text-xs text-muted">
                          Updated {formatRelativeTime(order.updatedAt)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-slate-50 px-4 py-3">
              <p className="text-xs text-muted">Guest</p>
              <p className="mt-1 font-medium text-navy">{order.customerName}</p>
            </div>
            <div className="rounded-lg border border-border bg-slate-50 px-4 py-3">
              <p className="text-xs text-muted">Table / type</p>
              <p className="mt-1 font-medium text-navy capitalize">
                {order.tableNumber ?? order.type}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-slate-50 px-4 py-3">
              <p className="text-xs text-muted">Payment method</p>
              <p className="mt-1 font-medium text-navy">
                {paymentLabel(order.checkoutPaymentMethod)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg text-navy">Items</h3>
            <ul className="mt-3 space-y-2">
              {order.items.map((item) => {
                const alreadyReviewed = reviewedItemIds.has(item.menuItemId);
                return (
                  <li
                    key={`${order.id}-${item.menuItemId}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-navy">
                        {item.quantity}× {item.name}
                      </p>
                      {item.notes ? (
                        <p className="text-xs text-orange">{item.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-navy">
                        {formatCurrency(item.price * item.quantity, currency)}
                      </span>
                      {order.status === "completed" ? (
                        alreadyReviewed ? (
                          <Badge tone="success">Reviewed</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReviewItemId(item.menuItemId);
                              setErrors([]);
                              setSuccess("");
                            }}
                          >
                            <Star className="h-3.5 w-3.5" />
                            Review
                          </Button>
                        )
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted">Subtotal</span>
              <span className="text-navy">
                {formatCurrency(order.subtotal, currency)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">
                Discount
                {order.couponCode ? ` (${order.couponCode})` : ""}
              </span>
              <span className="text-navy">
                −{formatCurrency(order.discount, currency)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Tax</span>
              <span className="text-navy">
                {formatCurrency(order.tax, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-medium text-navy">Order total</span>
              <span className="font-display text-2xl text-navy">
                {formatCurrency(order.total, currency)}
              </span>
            </div>
          </div>

          {order.estimatedMinutes ? (
            <p className="text-sm text-muted">
              Estimated prep time: {order.estimatedMinutes} minutes
              {order.prepStartedAt
                ? ` · started ${formatRelativeTime(order.prepStartedAt)}`
                : ""}
            </p>
          ) : null}

          {order.deliveryAddress ? (
            <p className="text-sm text-muted">
              Delivery address: {order.deliveryAddress}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Modal
        open={Boolean(reviewItemId)}
        onClose={() => setReviewItemId(null)}
        title="Write a review"
      >
        <form onSubmit={onSubmitReview} className="space-y-4">
          <p className="text-sm text-muted">
            Reviewing {reviewTarget?.name ?? "this dish"} from{" "}
            {order.orderNumber}.
          </p>
          <Field label="Rating">
            <Select
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} star{value === 1 ? "" : "s"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Comment">
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="How was it?"
            />
          </Field>
          {errors.length ? (
            <Alert>
              <ul className="list-disc pl-4">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewItemId(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="secondary">
              Submit review
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
