"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { CustomerPreferences } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState } from "react";

export default function CustomerProfilePage() {
  const {
    hydrated,
    store,
    updateCustomer,
    updateCustomerPreferences,
    saveCustomerAddress,
    deleteCustomerAddress,
  } = useData();

  const demoId = store.engagement.demoCustomerId;
  const customer = store.customers.find((entry) => entry.id === demoId);
  const currency = store.billingSettings.currency;

  const [form, setForm] = useState({
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
  });
  const [prefs, setPrefs] = useState<CustomerPreferences>(
    customer?.preferences ?? {
      orderUpdates: true,
      reservationReminders: true,
      couponAlerts: true,
      loyaltyAlerts: true,
      marketing: false,
    },
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState("");
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({
    id: "",
    label: "Home",
    line1: "",
    city: "",
    notes: "",
    isDefault: true,
  });
  const [deleteAddressId, setDeleteAddressId] = useState<string | null>(null);

  if (!hydrated) return <LoadingState label="Loading profile..." />;
  if (!customer) {
    return (
      <ErrorState
        title="Demo customer missing"
        description="Seed data should include cus-1."
      />
    );
  }

  const orderCount = store.orders.filter(
    (order) => order.customerId === demoId,
  ).length;

  function saveProfile() {
    const result = updateCustomer(demoId, {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const prefResult = updateCustomerPreferences(demoId, prefs);
    if (!prefResult.ok) {
      setErrors(prefResult.errors);
      return;
    }
    setErrors([]);
    setSaved("Profile updated.");
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <Alert tone="info">
        Editing demo session profile <strong>{demoId}</strong> — not real
        authentication.
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
      {saved ? <Alert tone="success">{saved}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Orders</p>
          <p className="mt-2 font-display text-2xl text-navy">{orderCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Total spent</p>
          <p className="mt-2 font-display text-2xl text-navy">
            {formatCurrency(customer.totalSpent, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Loyalty</p>
          <p className="mt-2 font-display text-2xl capitalize text-navy">
            {customer.loyaltyPoints ?? 0} pts · {customer.loyaltyTier ?? "bronze"}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Profile details" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </Field>
          <Field label="Email">
            <Input
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
          </Field>
          <Field label="Primary address">
            <Input
              value={form.address}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, address: event.target.value }))
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <p className="text-sm text-muted">
              Member since {formatDate(customer.joinedAt)} ·{" "}
              {customer.favoriteDishIds.length} favorites
            </p>
            <Button className="mt-4" onClick={saveProfile}>
              Save profile
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Saved delivery addresses"
          action={
            <Button
              size="sm"
              onClick={() => {
                setAddressForm({
                  id: "",
                  label: "Home",
                  line1: customer.address,
                  city: "Seattle",
                  notes: "",
                  isDefault: true,
                });
                setAddressOpen(true);
              }}
            >
              Add address
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {(customer.savedAddresses ?? []).length === 0 ? (
            <p className="text-sm text-muted">No saved addresses yet.</p>
          ) : (
            (customer.savedAddresses ?? []).map((address) => (
              <div
                key={address.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-navy">{address.label}</p>
                    {address.isDefault ? (
                      <Badge tone="success">Default</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted">
                    {address.line1}
                    {address.city ? `, ${address.city}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddressForm({
                        id: address.id,
                        label: address.label,
                        line1: address.line1,
                        city: address.city,
                        notes: address.notes ?? "",
                        isDefault: Boolean(address.isDefault),
                      });
                      setAddressOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteAddressId(address.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Notification preferences" />
        <CardBody className="space-y-3">
          {(
            [
              ["orderUpdates", "Order status updates"],
              ["reservationReminders", "Reservation reminders"],
              ["couponAlerts", "Coupon alerts"],
              ["loyaltyAlerts", "Loyalty alerts"],
              ["marketing", "Marketing (demo)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(event) =>
                  setPrefs((prev) => ({
                    ...prev,
                    [key]: event.target.checked,
                  }))
                }
              />
              {label}
            </label>
          ))}
          <Button variant="outline" onClick={saveProfile}>
            Save preferences
          </Button>
        </CardBody>
      </Card>

      <Modal
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        title={addressForm.id ? "Edit address" : "Add address"}
      >
        <div className="space-y-4">
          <Field label="Label">
            <Input
              value={addressForm.label}
              onChange={(event) =>
                setAddressForm((prev) => ({
                  ...prev,
                  label: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Address line">
            <Textarea
              rows={2}
              value={addressForm.line1}
              onChange={(event) =>
                setAddressForm((prev) => ({
                  ...prev,
                  line1: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="City">
            <Input
              value={addressForm.city}
              onChange={(event) =>
                setAddressForm((prev) => ({
                  ...prev,
                  city: event.target.value,
                }))
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={addressForm.isDefault}
              onChange={(event) =>
                setAddressForm((prev) => ({
                  ...prev,
                  isDefault: event.target.checked,
                }))
              }
            />
            Default address
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddressOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const result = saveCustomerAddress(demoId, {
                  id: addressForm.id || undefined,
                  label: addressForm.label,
                  line1: addressForm.line1,
                  city: addressForm.city,
                  notes: addressForm.notes,
                  isDefault: addressForm.isDefault,
                });
                if (!result.ok) {
                  setErrors(result.errors);
                  return;
                }
                setAddressOpen(false);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteAddressId)}
        title="Delete address?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteAddressId) {
            deleteCustomerAddress(demoId, deleteAddressId);
          }
          setDeleteAddressId(null);
        }}
        onClose={() => setDeleteAddressId(null)}
      />
    </div>
  );
}
