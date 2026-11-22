import type { DineFlowStore } from "@/lib/types";
import { roundMoney } from "./calculations";
import { averageRating } from "./engagement";

export function computeEngagementStats(
  store: DineFlowStore,
  range?: { from: string; to: string },
) {
  const from = range?.from ?? "2000-01-01";
  const to = range?.to ?? "2100-12-31";
  const customers = store.customers;
  const orders = store.orders.filter((order) => {
    const day = order.createdAt.slice(0, 10);
    return day >= from && day <= to;
  });
  const completed = orders.filter((order) => order.status === "completed");

  const newCustomers = customers.filter(
    (customer) => customer.joinedAt >= from && customer.joinedAt <= to,
  ).length;
  const returning = customers.filter((customer) => customer.visits > 1).length;
  const aov = completed.length
    ? roundMoney(
        completed.reduce((sum, order) => sum + order.total, 0) /
          completed.length,
      )
    : 0;

  const pointsIssued = store.engagement.loyaltyTransactions
    .filter((txn) => txn.type === "earn")
    .reduce((sum, txn) => sum + txn.points, 0);
  const pointsRedeemed = store.engagement.loyaltyTransactions
    .filter((txn) => txn.type === "redeem")
    .reduce((sum, txn) => sum + Math.abs(txn.points), 0);

  const activeCoupons = store.engagement.coupons.filter(
    (coupon) => coupon.active,
  ).length;
  const couponUsage = store.engagement.couponUsages.length;

  const visibleReviews = store.engagement.reviews.filter(
    (review) => review.status === "visible",
  );
  const avgRating = visibleReviews.length
    ? roundMoney(
        visibleReviews.reduce((sum, review) => sum + review.rating, 0) /
          visibleReviews.length,
      )
    : 0;

  const favoriteCounts = new Map<string, number>();
  for (const customer of customers) {
    for (const id of customer.favoriteDishIds) {
      favoriteCounts.set(id, (favoriteCounts.get(id) ?? 0) + 1);
    }
  }
  const mostFavorited = [...favoriteCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      id,
      name: store.menuItems.find((item) => item.id === id)?.name ?? id,
      count,
    }));

  const reviewCounts = new Map<string, number>();
  for (const review of visibleReviews) {
    reviewCounts.set(
      review.menuItemId,
      (reviewCounts.get(review.menuItemId) ?? 0) + 1,
    );
  }
  const mostReviewed = [...reviewCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      id,
      name: store.menuItems.find((item) => item.id === id)?.name ?? id,
      count,
      average: averageRating(store.engagement.reviews, id).average,
    }));

  const retained =
    customers.length === 0
      ? 0
      : roundMoney((returning / customers.length) * 100);

  return {
    totalCustomers: customers.length,
    returningCustomers: returning,
    newCustomers,
    averageOrderValue: aov,
    pointsIssued,
    pointsRedeemed,
    activeCoupons,
    couponUsage,
    averageMenuRating: avgRating,
    mostFavorited,
    mostReviewed,
    retentionRate: retained,
  };
}
