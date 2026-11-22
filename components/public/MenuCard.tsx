"use client";

import { useData } from "@/components/providers/DataProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { averageRating } from "@/lib/data/engagement";
import type { MenuItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Heart, Plus, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function MenuCard({
  item,
  currency = "PKR",
}: {
  item: MenuItem;
  currency?: string;
}) {
  const { store, addToCart, toggleFavorite } = useData();
  const [message, setMessage] = useState("");
  const demoId = store.engagement?.demoCustomerId ?? "cus-1";
  const customer = store.customers.find((entry) => entry.id === demoId);
  const favorited = customer?.favoriteDishIds.includes(item.id) ?? false;
  const rating = averageRating(store.engagement?.reviews ?? [], item.id);

  function handleAdd(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!item.available) return;
    const result = addToCart(item.id, 1);
    setMessage(result.ok ? "Added to cart" : result.errors[0] ?? "Failed");
    window.setTimeout(() => setMessage(""), 1600);
  }

  function handleFavorite(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(demoId, item.id);
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/menu/item/${item.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            <Badge tone={item.available ? "success" : "danger"}>
              {item.available ? "Available" : "Unavailable"}
            </Badge>
            {item.featured ? <Badge tone="orange">Featured</Badge> : null}
            {item.popular ? <Badge tone="navy">Popular</Badge> : null}
          </div>
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg text-navy">{item.name}</h3>
            <p className="shrink-0 text-sm font-semibold text-orange">
              {formatCurrency(item.price, currency)}
            </p>
          </div>
          <p className="line-clamp-2 text-sm text-muted">{item.description}</p>
          {rating.count > 0 ? (
            <p className="inline-flex items-center gap-1 text-xs text-muted">
              <Star className="h-3.5 w-3.5 fill-orange text-orange" />
              {rating.average.toFixed(1)} · {rating.count} reviews
            </p>
          ) : null}
          {item.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} tone="orange">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <Button
          size="sm"
          disabled={!item.available}
          onClick={handleAdd}
          className="flex-1"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleFavorite}
          aria-label="Toggle favorite"
        >
          <Heart
            className={`h-4 w-4 ${favorited ? "fill-orange text-orange" : ""}`}
          />
        </Button>
      </div>
      {message ? (
        <p className="px-4 pb-3 text-xs text-success">{message}</p>
      ) : null}
    </div>
  );
}
