"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { dayName, formatDisplayTime } from "@/lib/data/settings";
import type { BillingSettings, DayHours, DiscountType } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const EMPTY_BLOCK = {
  date: "2026-11-25",
  startTime: "12:00",
  endTime: "15:00",
  reason: "",
  tableId: "",
};

function SettingsEditor({
  initialDuration,
  initialBuffer,
  initialHours,
}: {
  initialDuration: number;
  initialBuffer: number;
  initialHours: DayHours[];
}) {
  const {
    store,
    updateSettings,
    addBlockedSlot,
    removeBlockedSlot,
    resetDemoData,
  } = useData();

  const [duration, setDuration] = useState(String(initialDuration));
  const [buffer, setBuffer] = useState(String(initialBuffer));
  const [hours, setHours] = useState<DayHours[]>(initialHours);
  const [bookingErrors, setBookingErrors] = useState<string[]>([]);
  const [hoursErrors, setHoursErrors] = useState<string[]>([]);
  const [bookingSaved, setBookingSaved] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);
  const [blockForm, setBlockForm] = useState(EMPTY_BLOCK);
  const [blockErrors, setBlockErrors] = useState<string[]>([]);
  const [resetOpen, setResetOpen] = useState(false);

  function saveBooking() {
    setBookingErrors([]);
    setBookingSaved(false);
    const result = updateSettings({
      ...store.settings,
      reservationDurationMinutes: Number(duration),
      bufferMinutes: Number(buffer),
    });
    if (!result.ok) {
      setBookingErrors(result.errors);
      return;
    }
    setBookingSaved(true);
    window.setTimeout(() => setBookingSaved(false), 2000);
  }

  function saveHours() {
    setHoursErrors([]);
    setHoursSaved(false);
    const result = updateSettings({
      ...store.settings,
      hours,
    });
    if (!result.ok) {
      setHoursErrors(result.errors);
      return;
    }
    setHoursSaved(true);
    window.setTimeout(() => setHoursSaved(false), 2000);
  }

  function patchHour(day: number, patch: Partial<DayHours>) {
    setHours((prev) =>
      prev.map((entry) =>
        entry.day === day ? { ...entry, ...patch } : entry,
      ),
    );
  }

  function submitBlock() {
    setBlockErrors([]);
    const result = addBlockedSlot({
      date: blockForm.date,
      startTime: blockForm.startTime,
      endTime: blockForm.endTime,
      reason: blockForm.reason,
      tableId: blockForm.tableId || undefined,
    });
    if (!result.ok) {
      setBlockErrors(result.errors);
      return;
    }
    setBlockForm(EMPTY_BLOCK);
  }

  const sortedHours = [...hours].sort((a, b) => a.day - b.day);

  return (
    <div className="space-y-6 animate-fade-up">
      <BillingSettingsEditor
        key={`billing-${store.billingSettings.nextInvoiceSequence}-${store.billingSettings.currency}`}
        initial={store.billingSettings}
      />

      <Card>
        <CardHeader
          title="Restaurant settings"
          description="Reservation timing, service hours, and blocked slots"
        />
        <CardBody>
          <Tabs
            tabs={[
              {
                id: "booking",
                label: "Booking",
                content: (
                  <div className="grid max-w-xl gap-4">
                    <Field label="Default reservation duration (minutes)">
                      <Select
                        value={duration}
                        onChange={(event) => setDuration(event.target.value)}
                      >
                        {[60, 75, 90, 120, 150].map((mins) => (
                          <option key={mins} value={mins}>
                            {mins} minutes
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Turn buffer between bookings (minutes)">
                      <Input
                        type="number"
                        min={0}
                        value={buffer}
                        onChange={(event) => setBuffer(event.target.value)}
                      />
                    </Field>
                    {bookingErrors.length ? (
                      <Alert>
                        <ul className="list-disc pl-4">
                          {bookingErrors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      </Alert>
                    ) : null}
                    <div className="flex items-center justify-end gap-3">
                      {bookingSaved ? (
                        <span className="text-sm font-medium text-success">
                          Saved
                        </span>
                      ) : null}
                      <Button type="button" onClick={saveBooking}>
                        Save booking settings
                      </Button>
                    </div>
                  </div>
                ),
              },
              {
                id: "hours",
                label: "Hours",
                content: (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {sortedHours.map((slot) => (
                        <div
                          key={slot.day}
                          className="grid gap-3 rounded-xl border border-border bg-white p-3 sm:grid-cols-[8rem_1fr_1fr_auto]"
                        >
                          <div className="flex items-center">
                            <p className="font-medium text-navy">
                              {dayName(slot.day)}
                            </p>
                          </div>
                          <Field label="Opens">
                            <Input
                              type="time"
                              value={slot.open}
                              disabled={slot.closed}
                              onChange={(event) =>
                                patchHour(slot.day, {
                                  open: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Closes">
                            <Input
                              type="time"
                              value={slot.close}
                              disabled={slot.closed}
                              onChange={(event) =>
                                patchHour(slot.day, {
                                  close: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <label className="flex items-end gap-2 pb-2 text-sm text-navy">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border"
                              checked={slot.closed}
                              onChange={(event) =>
                                patchHour(slot.day, {
                                  closed: event.target.checked,
                                })
                              }
                            />
                            Closed
                          </label>
                        </div>
                      ))}
                    </div>
                    {hoursErrors.length ? (
                      <Alert>
                        <ul className="list-disc pl-4">
                          {hoursErrors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      </Alert>
                    ) : null}
                    <div className="flex items-center justify-end gap-3">
                      {hoursSaved ? (
                        <span className="text-sm font-medium text-success">
                          Saved
                        </span>
                      ) : null}
                      <Button type="button" onClick={saveHours}>
                        Update hours
                      </Button>
                    </div>
                  </div>
                ),
              },
              {
                id: "blocked",
                label: "Blocked slots",
                content: (
                  <div className="space-y-6">
                    <div className="grid gap-3 rounded-xl border border-border bg-accent/30 p-4 sm:grid-cols-2">
                      <Field label="Date">
                        <Input
                          type="date"
                          value={blockForm.date}
                          onChange={(event) =>
                            setBlockForm({
                              ...blockForm,
                              date: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Table (optional)">
                        <Select
                          value={blockForm.tableId}
                          onChange={(event) =>
                            setBlockForm({
                              ...blockForm,
                              tableId: event.target.value,
                            })
                          }
                        >
                          <option value="">Entire restaurant</option>
                          {store.tables.map((table) => (
                            <option key={table.id} value={table.id}>
                              {table.number} · {table.section}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Start">
                        <Input
                          type="time"
                          value={blockForm.startTime}
                          onChange={(event) =>
                            setBlockForm({
                              ...blockForm,
                              startTime: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="End">
                        <Input
                          type="time"
                          value={blockForm.endTime}
                          onChange={(event) =>
                            setBlockForm({
                              ...blockForm,
                              endTime: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Reason" className="sm:col-span-2">
                        <Input
                          value={blockForm.reason}
                          onChange={(event) =>
                            setBlockForm({
                              ...blockForm,
                              reason: event.target.value,
                            })
                          }
                          placeholder="Private event, maintenance…"
                        />
                      </Field>
                      {blockErrors.length ? (
                        <Alert className="sm:col-span-2">
                          <ul className="list-disc pl-4">
                            {blockErrors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        </Alert>
                      ) : null}
                      <div className="flex justify-end sm:col-span-2">
                        <Button type="button" onClick={submitBlock}>
                          <Plus className="h-4 w-4" />
                          Add blocked slot
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {store.settings.blockedSlots.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                          No blocked dates or slots yet.
                        </p>
                      ) : (
                        store.settings.blockedSlots.map((slot) => {
                          const table = store.tables.find(
                            (item) => item.id === slot.tableId,
                          );
                          return (
                            <div
                              key={slot.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3"
                            >
                              <div>
                                <p className="font-medium text-navy">
                                  {formatDate(slot.date)} ·{" "}
                                  {formatDisplayTime(slot.startTime)}–
                                  {formatDisplayTime(slot.endTime)}
                                </p>
                                <p className="text-xs text-muted">
                                  {slot.reason || "No reason"}
                                  {table
                                    ? ` · Table ${table.number}`
                                    : " · All tables"}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBlockedSlot(slot.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Demo data"
          description="Explicit LocalStorage reset for portfolio demos only"
        />
        <CardBody className="space-y-3">
          <Alert tone="info">
            DineFlow stores fictional restaurant data in your browser. Resetting
            replaces all LocalStorage records with the seed demo dataset. This
            cannot be undone.
          </Alert>
          <Button variant="danger" onClick={() => setResetOpen(true)}>
            Reset demo data
          </Button>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        title="Reset all demo data?"
        description="This clears DineFlow LocalStorage and reloads the seed dataset. Orders, invoices, cart, and engagement history will be lost."
        confirmLabel="Reset demo data"
        danger
        onConfirm={() => {
          resetDemoData();
          setResetOpen(false);
        }}
        onClose={() => setResetOpen(false)}
      />
    </div>
  );
}

function BillingSettingsEditor({ initial }: { initial: BillingSettings }) {
  const { updateBillingSettings } = useData();
  const [currency, setCurrency] = useState(initial.currency);
  const [taxPercent, setTaxPercent] = useState(
    String(Math.round((initial.taxRate || 0) * 10000) / 100),
  );
  const [invoicePrefix, setInvoicePrefix] = useState(initial.invoicePrefix);
  const [nextSequence, setNextSequence] = useState(
    String(initial.nextInvoiceSequence),
  );
  const [defaultDueDays, setDefaultDueDays] = useState(
    String(initial.defaultDueDays),
  );
  const [discountType, setDiscountType] = useState<DiscountType>(
    initial.defaultDiscountType,
  );
  const [discountValue, setDiscountValue] = useState(
    String(initial.defaultDiscountValue),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  function saveBilling() {
    setErrors([]);
    setSaved(false);
    const tax = Number(taxPercent);
    const result = updateBillingSettings({
      currency: currency.trim() || "PKR",
      taxRate: Number.isFinite(tax) ? tax / 100 : 0,
      invoicePrefix: invoicePrefix.trim() || "INV-",
      nextInvoiceSequence: Number(nextSequence) || 1,
      defaultDueDays: Number(defaultDueDays) || 0,
      defaultDiscountType: discountType,
      defaultDiscountValue: Number(discountValue) || 0,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <CardHeader
        title="Billing settings"
        description="Defaults for invoices, tax, currency, and discounts"
      />
      <CardBody>
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <Field label="Default tax (%)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={taxPercent}
              onChange={(event) => setTaxPercent(event.target.value)}
            />
          </Field>
          <Field label="Currency">
            <Select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="AED">AED</option>
            </Select>
          </Field>
          <Field label="Invoice prefix">
            <Input
              value={invoicePrefix}
              onChange={(event) => setInvoicePrefix(event.target.value)}
              placeholder="INV-"
            />
          </Field>
          <Field label="Next invoice sequence">
            <Input
              type="number"
              min={1}
              value={nextSequence}
              onChange={(event) => setNextSequence(event.target.value)}
            />
          </Field>
          <Field label="Default due days">
            <Input
              type="number"
              min={0}
              value={defaultDueDays}
              onChange={(event) => setDefaultDueDays(event.target.value)}
            />
          </Field>
          <Field label="Default discount type">
            <Select
              value={discountType}
              onChange={(event) =>
                setDiscountType(event.target.value as DiscountType)
              }
            >
              <option value="fixed">Fixed amount</option>
              <option value="percentage">Percentage</option>
            </Select>
          </Field>
          <Field
            label={
              discountType === "percentage"
                ? "Default discount value (%)"
                : "Default discount value"
            }
            className="sm:col-span-2"
          >
            <Input
              type="number"
              min={0}
              step="0.01"
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
            />
          </Field>
          {errors.length ? (
            <Alert className="sm:col-span-2">
              <ul className="list-disc pl-4">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="flex items-center justify-end gap-3 sm:col-span-2">
            {saved ? (
              <span className="text-sm font-medium text-success">Saved</span>
            ) : null}
            <Button type="button" onClick={saveBilling}>
              Save billing settings
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function AdminSettingsPage() {
  const { hydrated, store } = useData();

  if (!hydrated) return <LoadingState label="Loading settings..." />;

  return (
    <SettingsEditor
      key={`${store.settings.reservationDurationMinutes}-${store.settings.bufferMinutes}-${store.settings.blockedSlots.length}`}
      initialDuration={store.settings.reservationDurationMinutes}
      initialBuffer={store.settings.bufferMinutes}
      initialHours={store.settings.hours}
    />
  );
}
