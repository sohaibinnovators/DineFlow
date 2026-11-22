"use client";

import { useData } from "@/components/providers/DataProvider";
import { MenuCard } from "@/components/public/MenuCard";
import { EmptyState, LoadingState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { averageRating } from "@/lib/data/engagement";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type SortKey = "popular" | "price-asc" | "price-desc" | "name";

export function MenuBrowser({
  initialCategorySlug = "all",
}: {
  initialCategorySlug?: string;
}) {
  const { hydrated, store } = useData();
  const currency = store.billingSettings?.currency ?? "PKR";
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState(initialCategorySlug);
  const [availability, setAvailability] = useState<"all" | "available" | "unavailable">(
    "all",
  );
  const [priceMax, setPriceMax] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");

  const categories = store.categories;
  const items = store.menuItems;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const max = priceMax ? Number(priceMax) : Infinity;
    const rows = items.filter((item) => {
      const matchesCategory =
        activeSlug === "all" || item.categorySlug === activeSlug;
      const matchesAvailability =
        availability === "all" ||
        (availability === "available" ? item.available : !item.available);
      const matchesPrice = item.price <= max;
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchesCategory && matchesAvailability && matchesPrice && matchesQuery;
    });

    rows.sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "name") return a.name.localeCompare(b.name);
      const score = (item: typeof a) =>
        (item.popular ? 4 : 0) +
        (item.featured ? 3 : 0) +
        averageRating(store.engagement?.reviews ?? [], item.id).average;
      return score(b) - score(a) || a.name.localeCompare(b.name);
    });
    return rows;
  }, [
    activeSlug,
    availability,
    items,
    priceMax,
    query,
    sort,
    store.engagement?.reviews,
  ]);

  if (!hydrated) return <LoadingState label="Loading menu..." />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveSlug("all")}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              activeSlug === "all"
                ? "bg-navy text-white"
                : "bg-white text-navy ring-1 ring-border hover:bg-accent",
            )}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveSlug(category.slug)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                activeSlug === category.slug
                  ? "bg-navy text-white"
                  : "bg-white text-navy ring-1 ring-border hover:bg-accent",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search dishes, tags…"
          />
          <Select
            value={availability}
            onChange={(event) =>
              setAvailability(
                event.target.value as "all" | "available" | "unavailable",
              )
            }
          >
            <option value="all">All availability</option>
            <option value="available">Available only</option>
            <option value="unavailable">Unavailable</option>
          </Select>
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
          >
            <option value="popular">Sort: Popularity</option>
            <option value="price-asc">Sort: Price low → high</option>
            <option value="price-desc">Sort: Price high → low</option>
            <option value="name">Sort: Name</option>
          </Select>
          <Select
            value={priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
          >
            <option value="">Any price</option>
            <option value="800">Under 800</option>
            <option value="1500">Under 1500</option>
            <option value="2500">Under 2500</option>
            <option value="4000">Under 4000</option>
          </Select>
        </div>
      </div>

      {activeSlug === "all" && !query && availability === "all" && !priceMax ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-xl text-navy">Featured</h2>
            <p className="mt-1 text-sm text-muted">Signature plates from the kitchen.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {items
                .filter((item) => item.featured && item.available)
                .slice(0, 4)
                .map((item) => (
                  <MenuCard key={item.id} item={item} currency={currency} />
                ))}
            </div>
          </section>
          <section>
            <h2 className="font-display text-xl text-navy">Popular</h2>
            <p className="mt-1 text-sm text-muted">What guests order most often.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {items
                .filter((item) => item.popular && item.available)
                .slice(0, 4)
                .map((item) => (
                  <MenuCard key={item.id} item={item} currency={currency} />
                ))}
            </div>
          </section>
        </div>
      ) : null}

      <div>
        <h2 className="font-display text-xl text-navy">
          {activeSlug === "all" ? "All dishes" : "Filtered results"}
        </h2>
        {filtered.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No dishes match"
              description="Try another category, price filter, or search term."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <MenuCard key={item.id} item={item} currency={currency} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
