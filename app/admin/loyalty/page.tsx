"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import type { LoyaltyReward, LoyaltySettings } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const PAGE_SIZE = 8;

type RewardForm = {
  title: string;
  description: string;
  pointsCost: string;
  validUntil: string;
  active: boolean;
};

const EMPTY_REWARD: RewardForm = {
  title: "",
  description: "",
  pointsCost: "",
  validUntil: "",
  active: true,
};

function settingsToForm(settings: LoyaltySettings) {
  return {
    pointsPerCurrency: String(settings.pointsPerCurrency),
    minRedemptionPoints: String(settings.minRedemptionPoints),
    bronzeThreshold: String(settings.bronzeThreshold),
    silverThreshold: String(settings.silverThreshold),
    goldThreshold: String(settings.goldThreshold),
    platinumThreshold: String(settings.platinumThreshold),
  };
}

export default function AdminLoyaltyPage() {
  const {
    hydrated,
    store,
    updateLoyaltySettings,
    saveLoyaltyReward,
    deleteLoyaltyReward,
  } = useData();
  const currency = store.billingSettings.currency || "PKR";

  const [form, setForm] = useState(() =>
    settingsToForm(store.engagement.loyaltySettings),
  );
  const [settingsErrors, setSettingsErrors] = useState<string[]>([]);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LoyaltyReward | null>(null);
  const [rewardForm, setRewardForm] = useState<RewardForm>(EMPTY_REWARD);
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return store.engagement.loyaltyRewards;
    return store.engagement.loyaltyRewards.filter(
      (reward) =>
        reward.title.toLowerCase().includes(q) ||
        reward.description.toLowerCase().includes(q),
    );
  }, [query, store.engagement.loyaltyRewards]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function saveSettings() {
    setSettingsSaved(false);
    const result = updateLoyaltySettings({
      pointsPerCurrency: Number(form.pointsPerCurrency) || 0,
      minRedemptionPoints: Number(form.minRedemptionPoints) || 0,
      bronzeThreshold: Number(form.bronzeThreshold) || 0,
      silverThreshold: Number(form.silverThreshold) || 0,
      goldThreshold: Number(form.goldThreshold) || 0,
      platinumThreshold: Number(form.platinumThreshold) || 0,
    });
    if (!result.ok) {
      setSettingsErrors(result.errors);
      return;
    }
    setSettingsErrors([]);
    setSettingsSaved(true);
  }

  function openCreate() {
    setEditing(null);
    setRewardForm(EMPTY_REWARD);
    setErrors([]);
    setOpen(true);
  }

  function openEdit(reward: LoyaltyReward) {
    setEditing(reward);
    setRewardForm({
      title: reward.title,
      description: reward.description,
      pointsCost: String(reward.pointsCost),
      validUntil: reward.validUntil ?? "",
      active: reward.active,
    });
    setErrors([]);
    setOpen(true);
  }

  function submitReward() {
    const result = saveLoyaltyReward({
      id: editing?.id,
      title: rewardForm.title,
      description: rewardForm.description,
      pointsCost: Number(rewardForm.pointsCost),
      validUntil: rewardForm.validUntil || undefined,
      active: rewardForm.active,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setOpen(false);
  }

  const columns: Column<LoyaltyReward>[] = [
    {
      key: "title",
      header: "Reward",
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{row.title}</p>
          <p className="text-xs text-muted line-clamp-1">{row.description}</p>
        </div>
      ),
    },
    {
      key: "points",
      header: "Points cost",
      render: (row) => row.pointsCost.toLocaleString(),
    },
    {
      key: "valid",
      header: "Valid until",
      render: (row) =>
        row.validUntil ? formatDate(row.validUntil) : "No expiry",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={statusTone(row.active ? "active" : "inactive")}>
          {row.active ? "active" : "inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openEdit(row)}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setPageError([]);
              setDeleteId(row.id);
            }}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading loyalty..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      {pageError.length > 0 ? (
        <Alert tone="danger">
          <ul className="list-disc pl-4">
            {pageError.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Loyalty settings"
          description={`Points are earned from order totals in ${currency}`}
          action={
            <Button size="sm" onClick={saveSettings}>
              Save settings
            </Button>
          }
        />
        <CardBody className="space-y-4">
          {settingsErrors.length > 0 ? (
            <Alert tone="danger">
              <ul className="list-disc pl-4">
                {settingsErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {settingsSaved ? (
            <Alert tone="success">Loyalty settings saved.</Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={`Points per ${currency} 1`}>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.pointsPerCurrency}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    pointsPerCurrency: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Min redemption points">
              <Input
                type="number"
                min={0}
                value={form.minRedemptionPoints}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    minRedemptionPoints: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Bronze threshold">
              <Input
                type="number"
                min={0}
                value={form.bronzeThreshold}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    bronzeThreshold: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Silver threshold">
              <Input
                type="number"
                min={0}
                value={form.silverThreshold}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    silverThreshold: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Gold threshold">
              <Input
                type="number"
                min={0}
                value={form.goldThreshold}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    goldThreshold: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Platinum threshold">
              <Input
                type="number"
                min={0}
                value={form.platinumThreshold}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    platinumThreshold: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Rewards catalog"
          description="Redeemable rewards for loyalty points"
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add reward
            </Button>
          }
        />
        <CardBody>
          <div className="mb-4 max-w-md">
            <SearchInput
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="Search rewards..."
            />
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No rewards found"
          />
          <div className="mt-4">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
            />
          </div>
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit reward" : "Add reward"}
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
          <Field label="Title">
            <Input
              value={rewardForm.title}
              onChange={(event) =>
                setRewardForm((prev) => ({
                  ...prev,
                  title: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={rewardForm.description}
              onChange={(event) =>
                setRewardForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Points cost">
              <Input
                type="number"
                min={1}
                value={rewardForm.pointsCost}
                onChange={(event) =>
                  setRewardForm((prev) => ({
                    ...prev,
                    pointsCost: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Valid until (optional)">
              <Input
                type="date"
                value={rewardForm.validUntil}
                onChange={(event) =>
                  setRewardForm((prev) => ({
                    ...prev,
                    validUntil: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              checked={rewardForm.active}
              onChange={(event) =>
                setRewardForm((prev) => ({
                  ...prev,
                  active: event.target.checked,
                }))
              }
            />
            Active
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReward}>
              {editing ? "Save changes" : "Create reward"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete reward?"
        description="This removes the reward from the catalog. Past redemptions stay in history."
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          const result = deleteLoyaltyReward(deleteId);
          if (!result.ok) setPageError(result.errors);
        }}
      />
    </div>
  );
}
