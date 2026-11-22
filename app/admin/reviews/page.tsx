"use client";

import { useData } from "@/components/providers/DataProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { formatDate } from "@/lib/utils";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export default function AdminReviewsPage() {
  const { hydrated, store, setReviewVisibility, deleteReview } = useData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "visible" | "hidden">("all");
  const [rating, setRating] = useState<"all" | "1" | "2" | "3" | "4" | "5">(
    "all",
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.engagement.reviews.filter((review) => {
      const item = store.menuItems.find(
        (entry) => entry.id === review.menuItemId,
      );
      const matchesStatus = status === "all" || review.status === status;
      const matchesRating =
        rating === "all" || review.rating === Number(rating);
      const matchesQuery =
        !q ||
        review.customerName.toLowerCase().includes(q) ||
        review.comment.toLowerCase().includes(q) ||
        (item?.name.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesRating && matchesQuery;
    });
  }, [query, rating, status, store.engagement.reviews, store.menuItems]);

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: store.engagement.reviews.filter(
      (review) => review.rating === stars && review.status === "visible",
    ).length,
  }));

  if (!hydrated) return <LoadingState label="Loading reviews..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-4 sm:grid-cols-5">
        {distribution.map((row) => (
          <Card key={row.stars} className="p-4">
            <p className="text-sm text-muted">{row.stars}★</p>
            <p className="mt-1 font-display text-2xl text-navy">{row.count}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Menu reviews"
          description="Moderate guest feedback (demo)"
        />
        <CardBody>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row">
            <div className="flex-1">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search reviews..."
              />
            </div>
            <Select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "all" | "visible" | "hidden")
              }
              className="lg:w-40"
            >
              <option value="all">All status</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </Select>
            <Select
              value={rating}
              onChange={(event) =>
                setRating(
                  event.target.value as "all" | "1" | "2" | "3" | "4" | "5",
                )
              }
              className="lg:w-40"
            >
              <option value="all">All ratings</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={String(value)}>
                  {value} stars
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted">No reviews match filters.</p>
            ) : (
              reviews.map((review) => {
                const item = store.menuItems.find(
                  (entry) => entry.id === review.menuItemId,
                );
                return (
                  <div
                    key={review.id}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-navy">
                          {item?.name ?? review.menuItemId}
                        </p>
                        <p className="text-sm text-muted">
                          {review.customerName} · {formatDate(review.createdAt)}
                        </p>
                        <p className="mt-1 text-orange">
                          {"★".repeat(review.rating)}
                          {"☆".repeat(5 - review.rating)}
                        </p>
                        <p className="mt-2 text-sm">{review.comment}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          tone={
                            review.status === "visible" ? "success" : "default"
                          }
                        >
                          {review.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setReviewVisibility(
                              review.id,
                              review.status === "visible" ? "hidden" : "visible",
                            )
                          }
                        >
                          {review.status === "visible" ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(review.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete review?"
        description="This permanently removes the review."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteId) deleteReview(deleteId);
          setDeleteId(null);
        }}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
