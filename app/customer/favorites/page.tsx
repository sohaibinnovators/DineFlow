"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingState } from "@/components/ui/EmptyState";
import { MenuCard } from "@/components/public/MenuCard";
import { recommendMenuItems } from "@/lib/data/engagement";
import Link from "next/link";

export default function CustomerFavoritesPage() {
  const { hydrated, store, toggleFavorite } = useData();
  const demoId = store.engagement.demoCustomerId;
  const customer = store.customers.find((entry) => entry.id === demoId);
  const currency = store.billingSettings.currency;

  if (!hydrated) return <LoadingState label="Loading favorites..." />;

  const favorites = store.menuItems.filter((item) =>
    customer?.favoriteDishIds.includes(item.id),
  );

  const recentOrderItemIds = store.orders
    .filter((order) => order.customerId === demoId)
    .flatMap((order) => order.items.map((item) => item.menuItemId));

  const recommended = recommendMenuItems({
    menuItems: store.menuItems,
    favoriteIds: customer?.favoriteDishIds ?? [],
    recentlyViewedIds: store.engagement.recentlyViewedIds,
    recentOrderItemIds,
    limit: 3,
  }).filter((item) => !customer?.favoriteDishIds.includes(item.id));

  return (
    <div className="space-y-6 animate-fade-up">
      <Alert tone="info">
        Favorites for demo session <strong>{demoId}</strong>. Heart dishes on
        the public menu to update this list.
      </Alert>

      {favorites.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          description="Browse the menu and tap the heart icon on dishes you love."
          action={
            <Link href="/menu">
              <Button>Browse menu</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((item) => (
            <div key={item.id} className="space-y-2">
              <MenuCard item={item} currency={currency} />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => toggleFavorite(demoId, item.id)}
              >
                Remove favorite
              </Button>
            </div>
          ))}
        </div>
      )}

      {store.engagement.recentlyViewedIds.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-navy">Recently viewed</h2>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {store.engagement.recentlyViewedIds
              .map((id) => store.menuItems.find((item) => item.id === id))
              .filter(Boolean)
              .slice(0, 6)
              .map((item) =>
                item ? (
                  <MenuCard key={item.id} item={item} currency={currency} />
                ) : null,
              )}
          </div>
        </section>
      ) : null}

      {recommended.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-navy">Recommended for you</h2>
          <p className="text-sm text-muted">
            Simple deterministic picks from your favorites and recent orders.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {recommended.map((item) => (
              <MenuCard key={item.id} item={item} currency={currency} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
