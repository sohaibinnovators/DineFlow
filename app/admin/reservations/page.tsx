"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  getAvailableTables,
  getEffectiveCapacity,
  getReservationDuration,
  validateReservationSlot,
} from "@/lib/data/scheduling";
import {
  dayName,
  formatDisplayTime,
  minutesToTime,
  timeToMinutes,
} from "@/lib/data/settings";
import type {
  Reservation,
  ReservationStatus,
  RestaurantSettings,
} from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  UserCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

const PAGE_SIZE = 8;
const HISTORY_STATUSES: ReservationStatus[] = [
  "completed",
  "cancelled",
  "no-show",
];
const ACTIVE_FILTERS: Array<ReservationStatus | "all" | "history"> = [
  "all",
  "pending",
  "confirmed",
  "seated",
  "history",
  "completed",
  "cancelled",
  "no-show",
];

type ViewMode = "list" | "day" | "week" | "month";

type FormState = {
  guestName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: string;
  durationMinutes: string;
  tableId: string;
  notes: string;
  status: ReservationStatus;
};

const EMPTY_FORM: FormState = {
  guestName: "",
  email: "",
  phone: "",
  date: "2026-11-22",
  time: "19:00",
  partySize: "2",
  durationMinutes: "",
  tableId: "",
  notes: "",
  status: "pending",
};

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function addDays(key: string, amount: number) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

function startOfWeek(key: string) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() - date.getDay());
  return toDateKey(date);
}

function buildTimeSlots(
  date: string,
  settings: RestaurantSettings,
  durationMinutes: number,
) {
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

function statusActions(status: ReservationStatus): ReservationStatus[] {
  switch (status) {
    case "pending":
      return ["confirmed", "cancelled", "no-show"];
    case "confirmed":
      return ["seated", "cancelled", "no-show"];
    case "seated":
      return ["completed", "cancelled"];
    default:
      return [];
  }
}

function actionLabel(status: ReservationStatus) {
  if (status === "seated") return "Seat";
  if (status === "no-show") return "No-show";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminReservationsPage() {
  const {
    hydrated,
    store,
    addReservation,
    updateReservation,
    updateReservationStatus,
    cancelReservation,
  } = useData();

  const [view, setView] = useState<ViewMode>("list");
  const [focusDate, setFocusDate] = useState("2026-11-22");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ReservationStatus | "all" | "history">(
    "all",
  );
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string[]>([]);

  const defaultDuration = store.settings.reservationDurationMinutes;

  const formDuration = Number(form.durationMinutes) || defaultDuration;

  const timeSlots = useMemo(
    () => buildTimeSlots(form.date, store.settings, formDuration),
    [form.date, formDuration, store.settings],
  );

  const availableTables = useMemo(() => {
    if (!form.date || !form.time || Number(form.partySize) < 1) return [];
    return getAvailableTables({
      date: form.date,
      time: form.time,
      partySize: Number(form.partySize),
      durationMinutes: formDuration,
      excludeReservationId: editing?.id,
      settings: store.settings,
      reservations: store.reservations,
      tables: store.tables,
    });
  }, [
    editing?.id,
    form.date,
    form.partySize,
    form.time,
    formDuration,
    store.reservations,
    store.settings,
    store.tables,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.reservations
      .filter((reservation) => {
        const matchesStatus =
          status === "all"
            ? true
            : status === "history"
              ? HISTORY_STATUSES.includes(reservation.status)
              : reservation.status === status;
        const matchesDate = !dateFilter || reservation.date === dateFilter;
        const matchesQuery =
          !q ||
          reservation.guestName.toLowerCase().includes(q) ||
          reservation.email.toLowerCase().includes(q) ||
          reservation.phone.includes(q);
        return matchesStatus && matchesDate && matchesQuery;
      })
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [dateFilter, query, status, store.reservations]);

  const activeList = useMemo(
    () =>
      filtered.filter((row) => !HISTORY_STATUSES.includes(row.status)),
    [filtered],
  );

  const historyList = useMemo(
    () =>
      filtered.filter((row) => HISTORY_STATUSES.includes(row.status)),
    [filtered],
  );

  const listRows =
    status === "history" || HISTORY_STATUSES.includes(status as ReservationStatus)
      ? filtered
      : activeList;

  const totalPages = Math.max(1, Math.ceil(listRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = listRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const dayReservations = useMemo(
    () =>
      store.reservations
        .filter((row) => row.date === focusDate)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [focusDate, store.reservations],
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(focusDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [focusDate]);

  const monthCells = useMemo(() => {
    const focus = parseDateKey(focusDate);
    const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(
      focus.getFullYear(),
      focus.getMonth() + 1,
      0,
    ).getDate();
    const cells: Array<{ key: string; inMonth: boolean }> = [];
    for (let i = 0; i < startPad; i += 1) {
      cells.push({
        key: toDateKey(new Date(focus.getFullYear(), focus.getMonth(), i - startPad + 1)),
        inMonth: false,
      });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        key: toDateKey(new Date(focus.getFullYear(), focus.getMonth(), day)),
        inMonth: true,
      });
    }
    while (cells.length % 7 !== 0) {
      const last = parseDateKey(cells[cells.length - 1]!.key);
      last.setDate(last.getDate() + 1);
      cells.push({ key: toDateKey(last), inMonth: false });
    }
    return cells;
  }, [focusDate]);

  function tableLabel(tableId?: string) {
    if (!tableId) return "Unassigned";
    const table = store.tables.find((item) => item.id === tableId);
    return table ? `${table.number} · ${table.section}` : "Unknown";
  }

  function openCreate(overrides?: Partial<FormState>) {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      durationMinutes: String(defaultDuration),
      date: overrides?.date ?? focusDate,
      time: overrides?.time ?? "19:00",
      ...overrides,
    });
    setErrors([]);
    setOpen(true);
  }

  function openEdit(reservation: Reservation) {
    setEditing(reservation);
    setForm({
      guestName: reservation.guestName,
      email: reservation.email,
      phone: reservation.phone,
      date: reservation.date,
      time: reservation.time,
      partySize: String(reservation.partySize),
      durationMinutes: String(
        reservation.durationMinutes ?? defaultDuration,
      ),
      tableId: reservation.tableId ?? "",
      notes: reservation.notes ?? "",
      status: reservation.status,
    });
    setErrors([]);
    setOpen(true);
  }

  function patchForm(patch: Partial<FormState>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      const duration =
        Number(next.durationMinutes) || defaultDuration;
      const party = Number(next.partySize) || 1;
      if (next.date && next.time && party >= 1) {
        const stillOk = getAvailableTables({
          date: next.date,
          time: next.time,
          partySize: party,
          durationMinutes: duration,
          excludeReservationId: editing?.id,
          settings: store.settings,
          reservations: store.reservations,
          tables: store.tables,
        }).some((table) => table.id === next.tableId);
        if (!stillOk) next.tableId = "";
      } else {
        next.tableId = "";
      }
      return next;
    });
  }

  function submit() {
    if (!form.tableId) {
      setErrors(["Select an available table for this reservation."]);
      return;
    }
    const slot = validateReservationSlot({
      date: form.date,
      time: form.time,
      partySize: Number(form.partySize),
      tableId: form.tableId,
      durationMinutes: formDuration,
      excludeReservationId: editing?.id,
      settings: store.settings,
      reservations: store.reservations,
      tables: store.tables,
    });
    if (!slot.ok) {
      setErrors(slot.errors);
      return;
    }
    const payload = {
      guestName: form.guestName,
      email: form.email,
      phone: form.phone,
      date: form.date,
      time: form.time,
      partySize: Number(form.partySize),
      durationMinutes: formDuration,
      tableId: form.tableId,
      notes: form.notes || undefined,
      status: form.status,
    };
    const result = editing
      ? updateReservation(editing.id, payload)
      : addReservation(payload);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setOpen(false);
  }

  function applyStatus(id: string, next: ReservationStatus) {
    setActionError([]);
    const result = updateReservationStatus(id, next);
    if (!result.ok) setActionError(result.errors);
  }

  const columns: Column<Reservation>[] = [
    {
      key: "guest",
      header: "Guest",
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{row.guestName}</p>
          <p className="text-xs text-muted">{row.email || row.phone}</p>
        </div>
      ),
    },
    {
      key: "when",
      header: "Date & time",
      render: (row) => (
        <div>
          <p className="text-navy">{formatDate(row.date)}</p>
          <p className="text-xs text-muted">{formatDisplayTime(row.time)}</p>
        </div>
      ),
    },
    {
      key: "party",
      header: "Party",
      render: (row) => (
        <span>
          {row.partySize} ·{" "}
          {getReservationDuration(row, store.settings)}m
        </span>
      ),
    },
    {
      key: "table",
      header: "Table",
      render: (row) => tableLabel(row.tableId),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[1%]",
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {statusActions(row.status).map((next) => (
            <Button
              key={next}
              variant={next === "cancelled" || next === "no-show" ? "ghost" : "outline"}
              size="sm"
              onClick={() => {
                if (next === "cancelled") setCancelId(row.id);
                else applyStatus(row.id, next);
              }}
            >
              {next === "confirmed" ? (
                <Check className="h-3.5 w-3.5" />
              ) : null}
              {next === "seated" ? (
                <UserCheck className="h-3.5 w-3.5" />
              ) : null}
              {actionLabel(next)}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading reservations..." />;

  const monthLabel = parseDateKey(focusDate).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader
          title="Reservations"
          description="Schedule, seat, and reschedule bookings with live table availability"
          action={
            <Button onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              New reservation
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-accent/40 p-1">
            {(
              [
                ["list", "List"],
                ["day", "Day"],
                ["week", "Week"],
                ["month", "Month"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition",
                  view === id
                    ? "bg-navy text-white shadow-sm"
                    : "text-muted hover:text-navy",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {actionError.length ? (
            <Alert>
              <ul className="list-disc pl-4">
                {actionError.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {view === "list" ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <SearchInput
                  value={query}
                  onChange={(value) => {
                    setQuery(value);
                    setPage(1);
                  }}
                  placeholder="Search by guest, email, or phone..."
                />
                <Select
                  value={status}
                  onChange={(event) => {
                    setStatus(
                      event.target.value as ReservationStatus | "all" | "history",
                    );
                    setPage(1);
                  }}
                >
                  {ACTIVE_FILTERS.map((item) => (
                    <option key={item} value={item}>
                      {item === "all"
                        ? "All active + upcoming"
                        : item === "history"
                          ? "History (completed / cancelled / no-show)"
                          : item}
                    </option>
                  ))}
                </Select>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => {
                    setDateFilter(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by date"
                />
              </div>
              <DataTable
                columns={columns}
                rows={rows}
                emptyTitle="No reservations found"
              />
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onChange={setPage}
              />
            </>
          ) : null}

          {view === "day" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFocusDate(addDays(focusDate, -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <p className="min-w-[12rem] text-center font-medium text-navy">
                    {formatDate(focusDate)} · {dayName(parseDateKey(focusDate).getDay())}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFocusDate(addDays(focusDate, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCreate({ date: focusDate })}
                >
                  <Plus className="h-4 w-4" />
                  Book this day
                </Button>
              </div>
              {dayReservations.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
                  No reservations on this day.
                </p>
              ) : (
                <ul className="space-y-2">
                  {dayReservations.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-navy">
                          {formatDisplayTime(row.time)} · {row.guestName}
                        </p>
                        <p className="text-xs text-muted">
                          {row.partySize} guests · {tableLabel(row.tableId)} ·{" "}
                          {getReservationDuration(row, store.settings)}m
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(row)}
                        >
                          Reschedule
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {view === "week" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFocusDate(addDays(focusDate, -7))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev week
                </Button>
                <p className="text-sm font-medium text-navy">
                  Week of {formatDate(weekDays[0]!)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFocusDate(addDays(focusDate, 7))}
                >
                  Next week
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-7">
                {weekDays.map((day) => {
                  const items = store.reservations
                    .filter((row) => row.date === day)
                    .sort((a, b) => a.time.localeCompare(b.time));
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setFocusDate(day);
                        setView("day");
                      }}
                      className={cn(
                        "min-h-[9rem] rounded-xl border border-border bg-white p-3 text-left transition hover:border-orange/50",
                        day === focusDate && "ring-2 ring-orange/40",
                      )}
                    >
                      <p className="text-xs font-semibold text-muted uppercase">
                        {dayName(parseDateKey(day).getDay()).slice(0, 3)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-navy">
                        {parseDateKey(day).getDate()}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {items.slice(0, 3).map((row) => (
                          <li
                            key={row.id}
                            className="truncate rounded bg-accent px-1.5 py-0.5 text-[11px] text-navy"
                          >
                            {formatDisplayTime(row.time)} {row.guestName}
                          </li>
                        ))}
                        {items.length > 3 ? (
                          <li className="text-[11px] text-muted">
                            +{items.length - 3} more
                          </li>
                        ) : null}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {view === "month" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = parseDateKey(focusDate);
                    d.setMonth(d.getMonth() - 1);
                    setFocusDate(toDateKey(d));
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="inline-flex items-center gap-2 font-medium text-navy">
                  <CalendarDays className="h-4 w-4 text-orange" />
                  {monthLabel}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = parseDateKey(focusDate);
                    d.setMonth(d.getMonth() + 1);
                    setFocusDate(toDateKey(d));
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted uppercase">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (label) => (
                    <div key={label}>{label}</div>
                  ),
                )}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {monthCells.map((cell) => {
                  const count = store.reservations.filter(
                    (row) => row.date === cell.key,
                  ).length;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => {
                        setFocusDate(cell.key);
                        setView("day");
                      }}
                      className={cn(
                        "min-h-[4.5rem] rounded-xl border border-border p-2 text-left transition hover:border-orange/40",
                        cell.inMonth ? "bg-white" : "bg-slate-50 text-muted",
                        cell.key === focusDate && "ring-2 ring-orange/40",
                      )}
                    >
                      <p className="text-sm font-medium">
                        {parseDateKey(cell.key).getDate()}
                      </p>
                      {count > 0 ? (
                        <p className="mt-2 text-[11px] font-medium text-orange">
                          {count} booking{count === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {view === "list" &&
      status !== "history" &&
      !HISTORY_STATUSES.includes(status as ReservationStatus) ? (
        <Card>
          <CardHeader
            title="History"
            description="Completed, cancelled, and no-show reservations"
          />
          <CardBody>
            {historyList.length === 0 ? (
              <p className="text-sm text-muted">No history matches the current filters.</p>
            ) : (
              <ul className="divide-y divide-border">
                {historyList.slice(0, 8).map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-medium text-navy">{row.guestName}</p>
                      <p className="text-xs text-muted">
                        {formatDate(row.date)} · {formatDisplayTime(row.time)} ·{" "}
                        {tableLabel(row.tableId)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(row)}
                      >
                        View
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit / reschedule" : "New reservation"}
        className="max-w-xl"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Guest name" className="sm:col-span-2">
            <Input
              value={form.guestName}
              onChange={(event) =>
                patchForm({ guestName: event.target.value })
              }
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => patchForm({ email: event.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(event) => patchForm({ phone: event.target.value })}
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={form.date}
              onChange={(event) => patchForm({ date: event.target.value })}
            />
          </Field>
          <Field label="Time">
            <Select
              value={form.time}
              onChange={(event) => patchForm({ time: event.target.value })}
            >
              <option value="">Select time</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {formatDisplayTime(slot)}
                </option>
              ))}
              {form.time && !timeSlots.includes(form.time) ? (
                <option value={form.time}>
                  {formatDisplayTime(form.time)} (current)
                </option>
              ) : null}
            </Select>
          </Field>
          <Field label="Party size">
            <Input
              type="number"
              min={1}
              value={form.partySize}
              onChange={(event) =>
                patchForm({ partySize: event.target.value })
              }
            />
          </Field>
          <Field label="Duration (minutes)">
            <Select
              value={form.durationMinutes || String(defaultDuration)}
              onChange={(event) =>
                patchForm({ durationMinutes: event.target.value })
              }
            >
              {[60, 90, 120, 150].map((mins) => (
                <option key={mins} value={mins}>
                  {mins} minutes
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Table" className="sm:col-span-2">
            <Select
              value={form.tableId}
              onChange={(event) => patchForm({ tableId: event.target.value })}
            >
              <option value="">Select an available table</option>
              {availableTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.number} · {table.section} (seats{" "}
                  {getEffectiveCapacity(table, store.tables)})
                </option>
              ))}
            </Select>
            {form.date && form.time && availableTables.length === 0 ? (
              <p className="mt-1 text-xs text-danger">
                No tables available for this party size, time, and duration.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                Only conflict-free tables within hours and capacity are listed.
              </p>
            )}
          </Field>
          <Field label="Status" className="sm:col-span-2">
            <Select
              value={form.status}
              onChange={(event) =>
                patchForm({
                  status: event.target.value as ReservationStatus,
                })
              }
            >
              {(
                [
                  "pending",
                  "confirmed",
                  "seated",
                  "completed",
                  "cancelled",
                  "no-show",
                ] as ReservationStatus[]
              ).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              value={form.notes}
              onChange={(event) => patchForm({ notes: event.target.value })}
            />
          </Field>
        </div>
        {errors.length ? (
          <Alert className="mt-3">
            <ul className="list-disc pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={submit}>
            {editing ? "Save changes" : "Create reservation"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelId)}
        title="Cancel reservation?"
        description="The booking will be marked cancelled. The assigned table becomes available again."
        confirmLabel="Cancel reservation"
        danger
        onClose={() => setCancelId(null)}
        onConfirm={() => {
          if (cancelId) cancelReservation(cancelId);
        }}
      />
    </div>
  );
}
