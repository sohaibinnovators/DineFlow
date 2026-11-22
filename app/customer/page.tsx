"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import {
  deriveLoyaltyTier,
  lifetimeEarnedPoints,
  recommendMenuItems,
} from "@/lib/data/engagement";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import {
  Bell,
  Gift,
  Heart,
  ShoppingBag,
  Sparkles,
  Ticket,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

export default function CustomerOverviewPage() {
  const { hydrated, store } = useData();

  const demoId = store.engagement?.demoCustomerId ?? "cus-1";
  const currency = store.billingSettings?.currency || "PKR";
  const today = new Date().toISOString().slice(0, 10);

  const overview = useMemo(() => {
    const customer = store.customers.find((person) => person.id === demoId);
    if (!customer) return null;

    const engagement = store.engagement;
    const myOrders = store.orders
      .filter((order) => order.customerId === demoId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const usages = engagement.couponUsages.filter(
      (usage) => usage.customerId === demoId,
    );
    const availableCoupons = engagement.coupons.filter((coupon) => {
      if (!coupon.active) return false;
      if (coupon.startDate > today || coupon.expiryDate < today) return false;
      if (
        coupon.usageLimit != null &&
        coupon.usageCount >= coupon.usageLimit
      ) {
        return false;
      }
      if (coupon.perCustomerLimit != null) {
        const used = usages.filter(
          (usage) => usage.couponId === coupon.id,
        ).length;
        if (used >= coupon.perCustomerLimit) return false;
      }
      return true;
    });

    const notifications = engagement.customerNotifications.filter(
      (item) => item.customerId === demoId,
    );
    const unread = notifications.filter((item) => !item.read).length;

    const lifetime = lifetimeEarnedPoints(
      engagement.loyaltyTransactions,
      demoId,
    );
    const tier =
      customer.loyaltyTier ??
      deriveLoyaltyTier(lifetime, engagement.loyaltySettings);

    const recentOrderItemIds = myOrders
      .slice(0, 5)
      .flatMap((order) => order.items.map((item) => item.menuItemId));

    const recommendations = recommendMenuItems({
      menuItems: store.menuItems,
      favoriteIds: customer.favoriteDishIds,
      recentlyViewedIds: engagement.recentlyViewedIds,
      recentOrderItemIds,
      limit: 4,
    });

    return {
      customer,
      myOrders,
      availableCoupons,
      unread,
      notifications: notifications
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 4),
      points: customer.loyaltyPoints ?? 0,
      tier,
      recommendations,
    };
  }, [demoId, store, today]);

  if (!hydrated) return <LoadingState label="Loading dashboard..." />;

  if (!overview) {
    return (
      <ErrorState
        title="Customer not found"
        description="The demo guest profile could not be loaded from local storage."
      />
    );
  }

  const {
    customer,
    myOrders,
    availableCoupons,
    unread,
    notifications,
    points,
    tier,
    recommendations,
  } = overview;

  return (
    <div className="space-y-6 animate-fade-up">
      <Alert tone="info">
        Demo session for {customer.name} ({demoId}) — not real authentication.
        Changes save to local storage only.
      </Alert>

      <div className="rounded-xl border border-border bg-gradient-to-br from-navy to-[#1c3250] px-5 py-6 text-white sm:px-6">
        <p className="text-sm text-white/70">Welcome back</p>
        <h2 className="mt-1 font-display text-3xl">{customer.name}</h2>
        <p className="mt-2 max-w-xl text-sm text-white/75">
          Track loyalty, coupons, orders, and recommendations in this guest
          demo account.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/customer/orders">
            <Button variant="secondary" size="sm">
              View orders
            </Button>
          </Link>
          <Link href="/customer/loyalty">
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              Loyalty
            </Button>
          </Link>
          <Link href="/menu">
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              Browse menu
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Orders" value={myOrders.length} icon={ShoppingBag} />
        <StatCard label="Loyalty points" value={points} icon={Gift} />
        <Card className="border-border">
          <CardBody className="flex items-center gap-3 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-orange">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted">Loyalty tier</p>
              <p className="font-display text-xl capitalize text-navy">{tier}</p>
            </div>
          </CardBody>
        </Card>
        <StatCard
          label="Available coupons"
          value={availableCoupons.length}
          icon={Ticket}
        />
        <StatCard label="Unread alerts" value={unread} icon={Bell} />
        <StatCard
          label="Favorites"
          value={customer.favoriteDishIds.length}
          icon={Heart}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent orders"
            description="Latest tickets for this demo guest"
            action={
              <Link
                href="/customer/orders"
                className="text-sm font-medium text-orange hover:underline"
              >
                See all
              </Link>
            }
          />
          <CardBody className="space-y-3 p-0">
            {myOrders.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">No orders yet.</p>
            ) : (
              myOrders.slice(0, 4).map((order) => (
                <Link
                  key={order.id}
                  href={`/customer/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-0 hover:bg-slate-50/80"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-navy">
                      {order.orderNumber}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {formatCurrency(order.total, currency)} ·{" "}
                      {formatRelativeTime(order.createdAt)}
                    </p>
                  </div>
                  <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recommendations"
            description="Picked from favorites, views, and recent orders"
            action={
              <Link
                href="/menu"
                className="text-sm font-medium text-orange hover:underline"
              >
                Menu
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted">No recommendations yet.</p>
            ) : (
              recommendations.map((item) => (
                <Link
                  key={item.id}
                  href={`/menu/item/${item.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 hover:border-orange/40"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-navy">{item.name}</p>
                    <p className="text-sm text-muted">
                      {formatCurrency(item.price, currency)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Coupons ready to use"
            description={`${availableCoupons.length} valid for this guest`}
            action={
              <Link
                href="/customer/coupons"
                className="text-sm font-medium text-orange hover:underline"
              >
                All coupons
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {availableCoupons.length === 0 ? (
              <p className="text-sm text-muted">No active coupons right now.</p>
            ) : (
              availableCoupons.slice(0, 3).map((coupon) => (
                <div
                  key={coupon.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
                >
                  <div>
                    <p className="font-medium text-navy">{coupon.code}</p>
                    <p className="text-sm text-muted">{coupon.description}</p>
                  </div>
                  <Badge tone="orange">Active</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Notifications"
            description={`${unread} unread`}
            action={
              <Link
                href="/customer/notifications"
                className="text-sm font-medium text-orange hover:underline"
              >
                Inbox
              </Link>
            }
          />
          <CardBody className="space-y-3 p-0">
            {notifications.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">No notifications.</p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="border-b border-border/70 px-5 py-3 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-navy">{item.title}</p>
                      <p className="mt-1 text-sm text-muted">{item.message}</p>
                    </div>
                    {!item.read ? (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange" />
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
