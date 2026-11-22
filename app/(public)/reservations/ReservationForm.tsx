"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  getAvailableTables,
  getEffectiveCapacity,
  validateReservationSlot,
} from "@/lib/data/scheduling";
import {
  formatDisplayTime,
  minutesToTime,
  timeToMinutes,
} from "@/lib/data/settings";
import type { RestaurantSettings } from "@/lib/types";
import { FormEvent, useMemo, useState } from "react";

type FormState = {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: string;
  tableId: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initial: FormState = {
  name: "",
  email: "",
  phone: "",
  date: "",
  time: "",
  partySize: "2",
  tableId: "",
  notes: "",
};

function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function buildTimeSlots(
  date: string,
  settings: RestaurantSettings,
  durationMinutes: number,
) {
  if (!date) return [];
  const day = parseDateKey(date).getDay();
  const hours = settings.hours.find((entry) => entry.day === day);
  if (!hours || hours.closed) return [];
  const open = timeToMinutes(hours.open);
  const close = timeToMinutes(hours.close);
  if (Number.isNaN(open) || Number.isNaN(close)) return [];
  const slots: string[] = [];
  for (let mins = open; mins + durationMinutes <= close; mins += 30) {
    slots.push(minutesToTime(mins));
  }
  return slots;
}

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) errors.name = "Name is required.";
  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email.";
  }
  if (!values.phone.trim()) {
    errors.phone = "Phone is required.";
  } else if (values.phone.replace(/\D/g, "").length < 7) {
    errors.phone = "Enter a valid phone number.";
  }
  if (!values.date) errors.date = "Date is required.";
  if (!values.time) errors.time = "Time is required.";
  const size = Number(values.partySize);
  if (!size || size < 1 || size > 12) {
    errors.partySize = "Party size must be between 1 and 12.";
  }
  if (!values.tableId) {
    errors.tableId = "Select an available table.";
  }
  return errors;
}

export function ReservationForm() {
  const { store, addReservation } = useData();
  const [values, setValues] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [successOpen, setSuccessOpen] = useState(false);

  const duration = store.settings.reservationDurationMinutes;

  const timeSlots = useMemo(
    () => buildTimeSlots(values.date, store.settings, duration),
    [duration, store.settings, values.date],
  );

  const availableTables = useMemo(() => {
    if (!values.date || !values.time || Number(values.partySize) < 1) {
      return [];
    }
    return getAvailableTables({
      date: values.date,
      time: values.time,
      partySize: Number(values.partySize),
      durationMinutes: duration,
      settings: store.settings,
      reservations: store.reservations,
      tables: store.tables,
    });
  }, [
    duration,
    store.reservations,
    store.settings,
    store.tables,
    values.date,
    values.partySize,
    values.time,
  ]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "date" || key === "time" || key === "partySize") {
        const date = key === "date" ? String(value) : next.date;
        const time = key === "time" ? String(value) : next.time;
        const partySize =
          key === "partySize" ? Number(value) : Number(next.partySize);
        if (date && time && partySize >= 1) {
          const stillOk = getAvailableTables({
            date,
            time,
            partySize,
            durationMinutes: duration,
            settings: store.settings,
            reservations: store.reservations,
            tables: store.tables,
          }).some((table) => table.id === next.tableId);
          if (!stillOk) next.tableId = "";
        } else {
          next.tableId = "";
        }
        if (key === "date") next.time = "";
      }
      return next;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setSubmitErrors([]);
    if (Object.keys(nextErrors).length > 0) return;

    const slot = validateReservationSlot({
      date: values.date,
      time: values.time,
      partySize: Number(values.partySize),
      tableId: values.tableId,
      durationMinutes: duration,
      settings: store.settings,
      reservations: store.reservations,
      tables: store.tables,
    });
    if (!slot.ok) {
      setSubmitErrors(slot.errors);
      return;
    }

    const result = addReservation({
      guestName: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      date: values.date,
      time: values.time,
      partySize: Number(values.partySize),
      tableId: values.tableId,
      durationMinutes: duration,
      notes: values.notes.trim() || undefined,
      status: "pending",
    });

    if (!result.ok) {
      setSubmitErrors(result.errors);
      return;
    }

    setSuccessOpen(true);
  }

  function closeSuccess() {
    setSuccessOpen(false);
    setValues(initial);
    setErrors({});
    setSubmitErrors([]);
  }

  const selectedTable = store.tables.find(
    (table) => table.id === values.tableId,
  );

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-xl border border-border bg-white p-6 shadow-sm"
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" error={errors.name}>
            <Input
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Olivia Harper"
              autoComplete="name"
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <Input
              type="tel"
              value={values.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="(206) 555-0100"
              autoComplete="tel"
            />
          </Field>
          <Field label="Party size" error={errors.partySize}>
            <Select
              value={values.partySize}
              onChange={(e) => update("partySize", e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "guest" : "guests"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date" error={errors.date}>
            <Input
              type="date"
              value={values.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </Field>
          <Field label="Time" error={errors.time}>
            <Select
              value={values.time}
              onChange={(e) => update("time", e.target.value)}
              disabled={!values.date}
            >
              <option value="">Select a time</option>
              {timeSlots.map((time) => (
                <option key={time} value={time}>
                  {formatDisplayTime(time)}
                </option>
              ))}
            </Select>
            {values.date && timeSlots.length === 0 ? (
              <p className="mt-1 text-xs text-danger">
                Closed or no open slots on this day.
              </p>
            ) : null}
          </Field>
          <Field label="Table" error={errors.tableId} className="sm:col-span-2">
            <Select
              value={values.tableId}
              onChange={(e) => update("tableId", e.target.value)}
              disabled={!values.date || !values.time}
            >
              <option value="">
                {!values.date || !values.time
                  ? "Choose date and time first"
                  : "Select an available table"}
              </option>
              {availableTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.number} · {table.section} (seats{" "}
                  {getEffectiveCapacity(table, store.tables)})
                </option>
              ))}
            </Select>
            {values.date &&
            values.time &&
            availableTables.length === 0 ? (
              <p className="mt-1 text-xs text-danger">
                No tables available for this party size and time.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                Availability respects capacity, conflicts, hours, and blocked
                slots.
              </p>
            )}
          </Field>
        </div>
        <Field label="Notes (optional)">
          <Textarea
            value={values.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Allergies, celebration, seating preference…"
          />
        </Field>
        {submitErrors.length ? (
          <Alert>
            <ul className="list-disc pl-4">
              {submitErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        <Button type="submit" variant="secondary" size="lg" className="w-full sm:w-auto">
          Request reservation
        </Button>
        <p className="text-xs text-muted">
          Your request is saved locally and appears as pending for the host team.
        </p>
      </form>

      <Modal
        open={successOpen}
        onClose={closeSuccess}
        title="Reservation requested"
      >
        <p className="text-sm text-muted">
          Thanks, {values.name || "guest"}. We&apos;ve recorded your request
          for {values.partySize} on {values.date} at{" "}
          {formatDisplayTime(values.time)}
          {selectedTable ? ` · Table ${selectedTable.number}` : ""}. A host will
          confirm shortly.
        </p>
        <div className="mt-5">
          <Button variant="primary" onClick={closeSuccess}>
            Done
          </Button>
        </div>
      </Modal>
    </>
  );
}
