"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/EmptyState";
import {
  deriveLoyaltyTier,
  lifetimeEarnedPoints,
} from "@/lib/data/engagement";
import { formatDateTime } from "@/lib/utils";
import { useState } from "react";

export default function CustomerLoyaltyPage() {
  const { hydrated, store, redeemLoyaltyReward } = useData();
  const demoId = store.engagement.demoCustomerId;
  const customer = store.customers.find((entry) => entry.id === demoId);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState("");

  if (!hydrated) return <LoadingState label="Loading loyalty..." />;
  if (!customer) {
    return <Alert>Demo customer not found.</Alert>;
  }

  const settings = store.engagement.loyaltySettings;
  const lifetime = lifetimeEarnedPoints(
    store.engagement.loyaltyTransactions,
    demoId,
  );
  const tier =
    customer.loyaltyTier ?? deriveLoyaltyTier(lifetime, settings);
  const txns = store.engagement.loyaltyTransactions.filter(
    (txn) => txn.customerId === demoId,
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <Alert tone="info">
        Demo loyalty account for session customer <strong>{demoId}</strong> —
        not real authentication.
      </Alert>

      {errors.length > 0 ? (
        <Alert tone="danger">
          <ul className="list-disc pl-4">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Points balance</p>
          <p className="mt-2 font-display text-3xl text-navy">
            {customer.loyaltyPoints ?? 0}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Tier</p>
          <p className="mt-2 font-display text-3xl capitalize text-navy">
            {tier}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Lifetime earned</p>
          <p className="mt-2 font-display text-3xl text-navy">{lifetime}</p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Redemption rules"
          description="How earning and redeeming works in this demo"
        />
        <CardBody className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted">Earn rate:</span>{" "}
            <span className="font-medium text-navy">
              {settings.pointsPerCurrency} pt per currency unit
            </span>
          </p>
          <p>
            <span className="text-muted">Minimum to redeem:</span>{" "}
            <span className="font-medium text-navy">
              {settings.minRedemptionPoints} points
            </span>
          </p>
          <p>
            <span className="text-muted">Tier thresholds:</span>{" "}
            <span className="font-medium text-navy">
              Silver {settings.silverThreshold} · Gold {settings.goldThreshold}{" "}
              · Platinum {settings.platinumThreshold}
            </span>
          </p>
          <p className="text-muted">
            Balance must reach the minimum before any reward can be redeemed.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Redeem rewards"
          description={`Minimum ${settings.minRedemptionPoints} points to redeem`}
        />
        <CardBody className="space-y-3">
          {store.engagement.loyaltyRewards
            .filter((reward) => reward.active)
            .map((reward) => (
              <div
                key={reward.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
              >
                <div>
                  <p className="font-medium text-navy">{reward.title}</p>
                  <p className="text-sm text-muted">{reward.description}</p>
                  <p className="mt-1 text-sm">{reward.pointsCost} points</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const result = redeemLoyaltyReward(demoId, reward.id);
                    if (!result.ok) {
                      setErrors(result.errors);
                      setSuccess("");
                      return;
                    }
                    setErrors([]);
                    setSuccess(`Redeemed “${reward.title}”.`);
                  }}
                >
                  Redeem
                </Button>
              </div>
            ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Points history" />
        <CardBody className="space-y-2">
          {txns.length === 0 ? (
            <p className="text-sm text-muted">
              No points yet. Complete an order to earn loyalty points.
            </p>
          ) : (
            txns.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium capitalize text-navy">{txn.type}</p>
                  <p className="text-muted">
                    {txn.note ?? "—"} · {formatDateTime(txn.createdAt)}
                  </p>
                </div>
                <Badge tone={txn.points >= 0 ? "success" : "warning"}>
                  {txn.points >= 0 ? "+" : ""}
                  {txn.points}
                </Badge>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
