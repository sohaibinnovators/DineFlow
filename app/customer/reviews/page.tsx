"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { useMemo, useState } from "react";

export default function CustomerReviewsPage() {
  const {
    hydrated,
    store,
    submitReview,
    updateReview,
    deleteReview,
  } = useData();
  const demoId = store.engagement.demoCustomerId;
  const [errors, setErrors] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    orderId: "",
    menuItemId: "",
    rating: "5",
    comment: "",
  });

  const myReviews = store.engagement.reviews.filter(
    (review) => review.customerId === demoId,
  );

  const eligible = useMemo(() => {
    const completed = store.orders.filter(
      (order) => order.customerId === demoId && order.status === "completed",
    );
    const options: Array<{
      orderId: string;
      orderNumber: string;
      menuItemId: string;
      name: string;
    }> = [];
    for (const order of completed) {
      for (const item of order.items) {
        const exists = store.engagement.reviews.some(
          (review) =>
            review.customerId === demoId &&
            review.orderId === order.id &&
            review.menuItemId === item.menuItemId,
        );
        if (!exists) {
          options.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            menuItemId: item.menuItemId,
            name: item.name,
          });
        }
      }
    }
    return options;
  }, [demoId, store.engagement.reviews, store.orders]);

  if (!hydrated) return <LoadingState label="Loading reviews..." />;

  function openCreate(option?: (typeof eligible)[number]) {
    setEditingId(null);
    setForm({
      orderId: option?.orderId ?? eligible[0]?.orderId ?? "",
      menuItemId: option?.menuItemId ?? eligible[0]?.menuItemId ?? "",
      rating: "5",
      comment: "",
    });
    setErrors([]);
    setOpen(true);
  }

  function save() {
    if (editingId) {
      const result = updateReview(editingId, {
        customerId: demoId,
        rating: Number(form.rating),
        comment: form.comment,
      });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
    } else {
      const result = submitReview({
        customerId: demoId,
        orderId: form.orderId,
        menuItemId: form.menuItemId,
        rating: Number(form.rating),
        comment: form.comment,
      });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
    }
    setOpen(false);
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <Alert tone="info">
        Reviews are limited to completed orders for demo customer{" "}
        <strong>{demoId}</strong>.
      </Alert>

      <Card>
        <CardHeader
          title="My reviews"
          action={
            <Button size="sm" disabled={!eligible.length} onClick={() => openCreate()}>
              Write review
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {myReviews.length === 0 ? (
            <p className="text-sm text-muted">You have not written any reviews yet.</p>
          ) : (
            myReviews.map((review) => {
              const item = store.menuItems.find(
                (entry) => entry.id === review.menuItemId,
              );
              return (
                <div
                  key={review.id}
                  className="rounded-lg border border-border p-4"
                >
                  <p className="font-medium text-navy">
                    {item?.name ?? review.menuItemId}
                  </p>
                  <p className="text-sm text-orange">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </p>
                  <p className="mt-2 text-sm">{review.comment}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(review.createdAt)} · {review.status}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(review.id);
                        setForm({
                          orderId: review.orderId,
                          menuItemId: review.menuItemId,
                          rating: String(review.rating),
                          comment: review.comment,
                        });
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(review.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Eligible to review" />
        <CardBody className="space-y-2">
          {eligible.length === 0 ? (
            <p className="text-sm text-muted">
              No completed order items awaiting a review.
            </p>
          ) : (
            eligible.slice(0, 8).map((option) => (
              <div
                key={`${option.orderId}-${option.menuItemId}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <span>
                  {option.name} · {option.orderNumber}
                </span>
                <Button size="sm" onClick={() => openCreate(option)}>
                  Review
                </Button>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit review" : "Write review"}
      >
        <div className="space-y-4">
          {errors.length > 0 ? (
            <Alert tone="danger">
              <ul className="list-disc pl-4">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {!editingId ? (
            <Field label="Dish / order">
              <Select
                value={`${form.orderId}::${form.menuItemId}`}
                onChange={(event) => {
                  const [orderId, menuItemId] = event.target.value.split("::");
                  setForm((prev) => ({ ...prev, orderId, menuItemId }));
                }}
              >
                {eligible.map((option) => (
                  <option
                    key={`${option.orderId}-${option.menuItemId}`}
                    value={`${option.orderId}::${option.menuItemId}`}
                  >
                    {option.name} ({option.orderNumber})
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Rating">
            <Input
              type="number"
              min={1}
              max={5}
              value={form.rating}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, rating: event.target.value }))
              }
            />
          </Field>
          <Field label="Comment">
            <Textarea
              rows={4}
              value={form.comment}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, comment: event.target.value }))
              }
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete review?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteId) deleteReview(deleteId, demoId);
          setDeleteId(null);
        }}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
