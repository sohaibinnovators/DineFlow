"use client";

import { useData } from "@/components/providers/DataProvider";
import { MenuCard } from "@/components/public/MenuCard";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Input";
import {
  averageRating,
  recommendMenuItems,
} from "@/lib/data/engagement";
import { formatCurrency } from "@/lib/utils";
import { Clock, Heart, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export function FoodDetail({ id }: { id: string }) {
  const {
    hydrated,
    store,
    addToCart,
    toggleFavorite,
    trackMenuView,
  } = useData();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const item =
    store.menuItems.find((entry) => entry.id === id || entry.slug === id) ??
    null;

  useEffect(() => {
    if (!id) return;
    const resolved =
      store.menuItems.find((entry) => entry.id === id || entry.slug === id)?.id;
    if (resolved) trackMenuView(resolved);
    // Track once per dish visit; avoid re-running when store updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!hydrated) return <LoadingState label="Loading dish..." />;

  if (!item) {
    return (
      <ErrorState
        title="Dish not found"
        description="This menu item may have been removed from the live menu."
      />
    );
  }

  const currency = store.billingSettings.currency;
  const demoId = store.engagement.demoCustomerId;
  const customer = store.customers.find((entry) => entry.id === demoId);
  const favorited = customer?.favoriteDishIds.includes(item.id) ?? false;
  const rating = averageRating(store.engagement.reviews, item.id);
  const recipe = store.recipes.find((entry) => entry.menuItemId === item.id);
  const ingredients = (recipe?.ingredients ?? [])
    .map((ingredient) => {
      const inv = store.inventory.find(
        (entry) => entry.id === ingredient.inventoryItemId,
      );
      return inv
        ? `${inv.name} (${ingredient.quantityPerServing} ${inv.unit})`
        : null;
    })
    .filter(Boolean) as string[];

  const reviews = store.engagement.reviews.filter(
    (review) =>
      review.menuItemId === item.id && review.status === "visible",
  );

  const recentOrderItemIds = store.orders
    .filter((order) => order.customerId === demoId)
    .flatMap((order) => order.items.map((line) => line.menuItemId));

  const related = recommendMenuItems({
    menuItems: store.menuItems.filter((entry) => entry.id !== item.id),
    favoriteIds: customer?.favoriteDishIds ?? [],
    recentlyViewedIds: store.engagement.recentlyViewedIds,
    recentOrderItemIds,
    limit: 3,
  });

  function handleAdd() {
    const result = addToCart(item!.id, qty, notes || undefined);
    if (!result.ok) {
      setError(result.errors[0] ?? "Could not add to cart");
      setMessage("");
      return;
    }
    setError("");
    setMessage("Added to cart");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-orange uppercase">
            {item.categorySlug}
          </p>
          <h1 className="mt-2 font-display text-4xl text-navy">{item.name}</h1>
          <p className="mt-4 text-lg text-muted">{item.description}</p>
          <p className="mt-6 font-display text-3xl text-orange">
            {formatCurrency(item.price, currency)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={item.available ? "success" : "danger"}>
              {item.available ? "Available" : "Unavailable"}
            </Badge>
            {item.featured ? <Badge tone="orange">Featured</Badge> : null}
            {item.popular ? <Badge tone="navy">Popular</Badge> : null}
            {item.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
          {rating.count > 0 ? (
            <p className="mt-3 inline-flex items-center gap-1 text-sm text-muted">
              <Star className="h-4 w-4 fill-orange text-orange" />
              {rating.average.toFixed(1)} average · {rating.count} reviews
            </p>
          ) : null}
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
            <Clock className="h-4 w-4" />
            Prep time about {item.prepTimeMinutes} minutes
          </p>

          {ingredients.length > 0 ? (
            <div className="mt-6">
              <h2 className="font-display text-lg text-navy">Ingredients</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                {ingredients.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Field label="Quantity">
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(event) => setQty(Number(event.target.value) || 1)}
              />
            </Field>
            <Field label="Special instructions">
              <Textarea
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Allergies, spice level…"
              />
            </Field>
          </div>

          {error ? (
            <div className="mt-4">
              <Alert tone="danger">{error}</Alert>
            </div>
          ) : null}
          {message ? (
            <div className="mt-4">
              <Alert tone="success">{message}</Alert>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              size="lg"
              disabled={!item.available}
              onClick={handleAdd}
            >
              Add to cart
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => toggleFavorite(demoId, item.id)}
            >
              <Heart
                className={`h-4 w-4 ${favorited ? "fill-orange text-orange" : ""}`}
              />
              {favorited ? "Favorited" : "Favorite"}
            </Button>
            <Link href="/cart">
              <Button size="lg" variant="secondary">
                View cart
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted">
            Favorites sync to demo customer session ({demoId}).
          </p>
        </div>
      </div>

      {reviews.length > 0 ? (
        <section className="mt-14">
          <h2 className="font-display text-2xl text-navy">Guest reviews</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {reviews.slice(0, 6).map((review) => (
              <div
                key={review.id}
                className="rounded-xl border border-border bg-white p-4"
              >
                <p className="font-medium text-navy">{review.customerName}</p>
                <p className="mt-1 text-sm text-orange">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </p>
                <p className="mt-2 text-sm text-muted">{review.comment}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-14">
          <h2 className="font-display text-2xl text-navy">You may also like</h2>
          <p className="mt-1 text-sm text-muted">
            Deterministic suggestions from favorites, recent views, and popular
            dishes — not AI.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((entry) => (
              <MenuCard key={entry.id} item={entry} currency={currency} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
