"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { Tabs } from "@/components/ui/Tabs";
import type {
  StaffMember,
  StaffRole,
  StaffShift,
  StaffShiftInput,
} from "@/lib/types";
import { DEMO_NOW, formatDate } from "@/lib/utils";
import { CalendarDays, Pencil, Plus, UserX } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

const ROLES: StaffRole[] = ["manager", "waiter", "chef", "host", "cashier"];
const DEPARTMENTS = [
  "Front of House",
  "Kitchen",
  "Management",
  "Bar",
  "Support",
];
const STATUSES: StaffMember["status"][] = ["active", "off-duty", "on-leave"];

const EMPTY_STAFF = {
  name: "",
  email: "",
  phone: "",
  role: "waiter" as StaffRole,
  department: "Front of House",
  status: "active" as StaffMember["status"],
  shift: "Flexible",
};

const EMPTY_SHIFT = {
  staffId: "",
  date: new Date(DEMO_NOW).toISOString().slice(0, 10),
  startTime: "11:00",
  endTime: "19:00",
  role: "",
  notes: "",
};

function startOfWeek(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function availabilityLabel(
  member: StaffMember,
  shifts: StaffShift[],
  today: string,
) {
  if (member.status === "on-leave") return "On leave";
  if (member.status === "off-duty") return "Off duty";
  const todayShift = shifts.find(
    (shift) =>
      shift.staffId === member.id &&
      shift.date === today &&
      shift.status === "scheduled",
  );
  if (todayShift) {
    return `On shift ${todayShift.startTime}–${todayShift.endTime}`;
  }
  const upcoming = shifts
    .filter(
      (shift) =>
        shift.staffId === member.id &&
        shift.status === "scheduled" &&
        shift.date >= today,
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0];
  if (upcoming) return `Next ${upcoming.date} ${upcoming.startTime}`;
  return "Available";
}

export default function AdminStaffPage() {
  const {
    hydrated,
    store,
    addStaffMember,
    updateStaffMember,
    addStaffShift,
    updateStaffShift,
    cancelStaffShift,
  } = useData();

  const today = new Date(DEMO_NOW).toISOString().slice(0, 10);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<StaffRole | "all">("all");
  const [staffOpen, setStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF);
  const [staffErrors, setStaffErrors] = useState<string[]>([]);

  const [shiftView, setShiftView] = useState<"day" | "week">("day");
  const [shiftDate, setShiftDate] = useState(today);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<StaffShift | null>(null);
  const [shiftForm, setShiftForm] = useState(EMPTY_SHIFT);
  const [shiftErrors, setShiftErrors] = useState<string[]>([]);
  const [pageError, setPageError] = useState<string[]>([]);

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.staff.filter((member) => {
      const matchesRole = role === "all" || member.role === role;
      const matchesQuery =
        !q ||
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        (member.department ?? "").toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [query, role, store.staff]);

  const weekStart = startOfWeek(shiftDate);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const visibleShifts = useMemo(() => {
    const dates =
      shiftView === "day" ? new Set([shiftDate]) : new Set(weekDates);
    return store.shifts
      .filter((shift) => dates.has(shift.date))
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.startTime.localeCompare(b.startTime),
      );
  }, [shiftDate, shiftView, store.shifts, weekDates]);

  function openCreateStaff() {
    setEditingStaff(null);
    setStaffForm(EMPTY_STAFF);
    setStaffErrors([]);
    setStaffOpen(true);
  }

  function openEditStaff(member: StaffMember) {
    setEditingStaff(member);
    setStaffForm({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      department: member.department ?? "Front of House",
      status: member.status,
      shift: member.shift,
    });
    setStaffErrors([]);
    setStaffOpen(true);
  }

  function submitStaff() {
    const payload = {
      name: staffForm.name,
      email: staffForm.email,
      phone: staffForm.phone,
      role: staffForm.role,
      department: staffForm.department,
      status: staffForm.status,
      shift: staffForm.shift,
    };
    const result = editingStaff
      ? updateStaffMember(editingStaff.id, payload)
      : addStaffMember(payload);
    if (!result.ok) {
      setStaffErrors(result.errors);
      return;
    }
    setStaffOpen(false);
  }

  function openCreateShift(prefill?: Partial<typeof EMPTY_SHIFT>) {
    setEditingShift(null);
    setShiftForm({
      ...EMPTY_SHIFT,
      staffId: store.staff[0]?.id ?? "",
      date: shiftDate,
      ...prefill,
    });
    setShiftErrors([]);
    setShiftOpen(true);
  }

  function openEditShift(shift: StaffShift) {
    setEditingShift(shift);
    setShiftForm({
      staffId: shift.staffId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      role: shift.role ?? "",
      notes: shift.notes ?? "",
    });
    setShiftErrors([]);
    setShiftOpen(true);
  }

  function submitShift() {
    const payload: StaffShiftInput = {
      staffId: shiftForm.staffId,
      date: shiftForm.date,
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      role: shiftForm.role || undefined,
      notes: shiftForm.notes || undefined,
      status: "scheduled",
    };
    const result = editingShift
      ? updateStaffShift(editingShift.id, payload)
      : addStaffShift(payload);
    if (!result.ok) {
      setShiftErrors(result.errors);
      return;
    }
    setShiftOpen(false);
  }

  function handleCancelShift(id: string) {
    const result = cancelStaffShift(id);
    if (!result.ok) {
      setPageError(result.errors);
      return;
    }
    setPageError([]);
  }

  const staffColumns: Column<StaffMember>[] = [
    {
      key: "staff",
      header: "Team member",
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.avatar ? (
            <Image
              src={row.avatar}
              alt={row.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-medium text-orange">
              {row.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
          )}
          <div>
            <p className="font-medium text-navy">{row.name}</p>
            <p className="text-xs text-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => <span className="capitalize">{row.role}</span>,
    },
    {
      key: "department",
      header: "Department",
      render: (row) => row.department ?? "—",
    },
    {
      key: "availability",
      header: "Availability",
      render: (row) => availabilityLabel(row, store.shifts, today),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (row) => formatDate(row.joinedAt),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => openEditStaff(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const shiftColumns: Column<StaffShift>[] = [
    {
      key: "when",
      header: "When",
      render: (row) => (
        <div>
          <p className="font-medium text-navy">{formatDate(row.date)}</p>
          <p className="text-xs text-muted">
            {row.startTime} – {row.endTime}
          </p>
        </div>
      ),
    },
    {
      key: "staff",
      header: "Staff",
      render: (row) => {
        const member = store.staff.find((item) => item.id === row.staffId);
        return member?.name ?? row.staffId;
      },
    },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <span className="capitalize">{row.role ?? "—"}</span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (row) => row.notes || "—",
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
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.status === "scheduled" ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditShift(row)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelShift(row.id)}
              >
                <UserX className="h-4 w-4 text-danger" />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  if (!hydrated) return <LoadingState label="Loading staff..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      {pageError.length ? (
        <Alert>
          <ul className="list-disc pl-4">
            {pageError.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <Tabs
        tabs={[
          {
            id: "directory",
            label: "Directory",
            content: (
              <Card>
                <CardHeader
                  title="Staff directory"
                  description="Roles, departments, and live availability from shifts"
                  action={
                    <Button onClick={openCreateStaff}>
                      <Plus className="h-4 w-4" />
                      Add staff
                    </Button>
                  }
                />
                <CardBody>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="max-w-md flex-1">
                      <SearchInput
                        value={query}
                        onChange={setQuery}
                        placeholder="Search staff..."
                      />
                    </div>
                    <Select
                      value={role}
                      onChange={(event) =>
                        setRole(event.target.value as StaffRole | "all")
                      }
                      className="sm:w-44"
                    >
                      <option value="all">All roles</option>
                      {ROLES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <DataTable
                    columns={staffColumns}
                    rows={filteredStaff}
                    emptyTitle="No staff found"
                  />
                </CardBody>
              </Card>
            ),
          },
          {
            id: "shifts",
            label: "Shifts",
            content: (
              <Card>
                <CardHeader
                  title="Shift schedule"
                  description="Day and week views — overlapping shifts are blocked"
                  action={
                    <Button onClick={() => openCreateShift()}>
                      <Plus className="h-4 w-4" />
                      Add shift
                    </Button>
                  }
                />
                <CardBody className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Field label="Anchor date" className="sm:w-48">
                      <Input
                        type="date"
                        value={shiftDate}
                        onChange={(event) => setShiftDate(event.target.value)}
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={shiftView === "day" ? "primary" : "secondary"}
                        onClick={() => setShiftView("day")}
                      >
                        Day
                      </Button>
                      <Button
                        size="sm"
                        variant={shiftView === "week" ? "primary" : "secondary"}
                        onClick={() => setShiftView("week")}
                      >
                        Week
                      </Button>
                    </div>
                    <p className="flex items-center gap-2 text-sm text-muted sm:ml-auto">
                      <CalendarDays className="h-4 w-4" />
                      {shiftView === "day"
                        ? formatDate(shiftDate)
                        : `${formatDate(weekStart)} – ${formatDate(addDays(weekStart, 6))}`}
                    </p>
                  </div>

                  {shiftView === "week" ? (
                    <div className="grid gap-2 sm:grid-cols-7">
                      {weekDates.map((date) => {
                        const count = store.shifts.filter(
                          (shift) =>
                            shift.date === date && shift.status === "scheduled",
                        ).length;
                        return (
                          <button
                            key={date}
                            type="button"
                            onClick={() => {
                              setShiftDate(date);
                              setShiftView("day");
                            }}
                            className="rounded-lg border border-border bg-slate-50 px-2 py-3 text-left transition hover:border-orange"
                          >
                            <p className="text-xs text-muted">
                              {formatDate(date)}
                            </p>
                            <p className="mt-1 font-display text-lg text-navy">
                              {count}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <DataTable
                    columns={shiftColumns}
                    rows={visibleShifts}
                    emptyTitle="No shifts in this range"
                  />
                </CardBody>
              </Card>
            ),
          },
        ]}
      />

      <Modal
        open={staffOpen}
        onClose={() => setStaffOpen(false)}
        title={editingStaff ? "Edit staff member" : "Add staff member"}
      >
        <div className="space-y-4">
          {staffErrors.length ? (
            <Alert>
              <ul className="list-disc pl-4">
                {staffErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={staffForm.name}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={staffForm.email}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Phone">
              <Input
                value={staffForm.phone}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Role">
              <Select
                value={staffForm.role}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    role: event.target.value as StaffRole,
                  }))
                }
              >
                {ROLES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Department">
              <Select
                value={staffForm.department}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    department: event.target.value,
                  }))
                }
              >
                {DEPARTMENTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={staffForm.status}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    status: event.target.value as StaffMember["status"],
                  }))
                }
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Default shift label" className="sm:col-span-2">
              <Input
                value={staffForm.shift}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    shift: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStaffOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitStaff}>
              {editingStaff ? "Save changes" : "Add staff"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={shiftOpen}
        onClose={() => setShiftOpen(false)}
        title={editingShift ? "Edit shift" : "Add shift"}
      >
        <div className="space-y-4">
          {shiftErrors.length ? (
            <Alert>
              <ul className="list-disc pl-4">
                {shiftErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Staff" className="sm:col-span-2">
              <Select
                value={shiftForm.staffId}
                onChange={(event) =>
                  setShiftForm((current) => ({
                    ...current,
                    staffId: event.target.value,
                  }))
                }
              >
                {store.staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={shiftForm.date}
                onChange={(event) =>
                  setShiftForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Role on shift">
              <Input
                value={shiftForm.role}
                onChange={(event) =>
                  setShiftForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </Field>
            <Field label="Start">
              <Input
                type="time"
                value={shiftForm.startTime}
                onChange={(event) =>
                  setShiftForm((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="End">
              <Input
                type="time"
                value={shiftForm.endTime}
                onChange={(event) =>
                  setShiftForm((current) => ({
                    ...current,
                    endTime: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                value={shiftForm.notes}
                onChange={(event) =>
                  setShiftForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShiftOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitShift}>
              {editingShift ? "Save shift" : "Schedule shift"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
