"use client";

import { useData } from "@/components/providers/DataProvider";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { getEffectiveCapacity } from "@/lib/data/scheduling";
import { isActiveOrderStatus } from "@/lib/data/validation";
import type { Table, TableStatus } from "@/lib/types";
import {
  cn,
  elapsedMinutesSince,
  formatRelativeTime,
} from "@/lib/utils";
import {
  Combine,
  Link2Off,
  MoveRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

const STATUSES: TableStatus[] = [
  "available",
  "occupied",
  "reserved",
  "cleaning",
];

const SECTION_ORDER = [
  "Indoor",
  "Main",
  "Main Dining",
  "Window",
  "Patio",
  "Private",
  "VIP",
  "Bar",
];

const statusStyles: Record<TableStatus, string> = {
  available: "border-emerald-300 bg-emerald-50 text-navy",
  occupied: "border-orange bg-orange/10 text-navy",
  reserved: "border-amber-300 bg-amber-50 text-navy",
  cleaning: "border-sky-300 bg-sky-50 text-navy",
};

const EMPTY_FORM = {
  number: "",
  capacity: "2",
  section: "Main",
  status: "available" as TableStatus,
  x: "",
  y: "",
};

export default function AdminTablesPage() {
  const {
    hydrated,
    store,
    addTable,
    updateTable,
    updateTableStatus,
    deleteTable,
    combineTables,
    separateTables,
    moveOrderToTable,
  } = useData();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Table | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [simpleDelete, setSimpleDelete] = useState<Table | null>(null);
  const [reassignDelete, setReassignDelete] = useState<Table | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [pageError, setPageError] = useState<string[]>([]);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveOrderId, setMoveOrderId] = useState("");
  const [moveTableId, setMoveTableId] = useState("");
  const [moveErrors, setMoveErrors] = useState<string[]>([]);
  const [actionErrors, setActionErrors] = useState<string[]>([]);

  const sections = useMemo(() => {
    const found = Array.from(
      new Set(store.tables.map((table) => table.section)),
    );
    return found.sort((a, b) => {
      const ai = SECTION_ORDER.indexOf(a);
      const bi = SECTION_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [store.tables]);

  const counts = useMemo(() => {
    return store.tables.reduce<Record<string, number>>((acc, table) => {
      acc[table.status] = (acc[table.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [store.tables]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.tables.filter((table) => {
      const matchesStatus =
        statusFilter === "all" || table.status === statusFilter;
      const matchesSection =
        sectionFilter === "all" || table.section === sectionFilter;
      const matchesQuery =
        !q ||
        table.number.toLowerCase().includes(q) ||
        table.section.toLowerCase().includes(q) ||
        (table.currentOrderId ?? "").toLowerCase().includes(q) ||
        (table.currentReservationId ?? "").toLowerCase().includes(q);
      return matchesStatus && matchesSection && matchesQuery;
    });
  }, [query, sectionFilter, statusFilter, store.tables]);

  const tablesBySection = useMemo(() => {
    const map = new Map<string, Table[]>();
    for (const section of sections) {
      const rows = filtered.filter((table) => table.section === section);
      if (rows.length) map.set(section, rows);
    }
    for (const table of filtered) {
      if (!map.has(table.section)) {
        map.set(table.section, filtered.filter((t) => t.section === table.section));
      }
    }
    return map;
  }, [filtered, sections]);

  const dineInOrders = useMemo(
    () =>
      store.orders.filter(
        (order) =>
          order.type === "dine-in" && isActiveOrderStatus(order.status),
      ),
    [store.orders],
  );

  const freeTargets = useMemo(
    () =>
      store.tables.filter(
        (table) =>
          !table.currentOrderId ||
          (moveOrderId && table.currentOrderId === moveOrderId),
      ),
    [moveOrderId, store.tables],
  );

  const reassignTargets = useMemo(
    () => store.tables.filter((table) => table.id !== reassignDelete?.id),
    [reassignDelete?.id, store.tables],
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      section: sections[0] ?? "Main",
    });
    setErrors([]);
    setOpen(true);
  }

  function openEdit(table: Table) {
    setEditing(table);
    setForm({
      number: table.number,
      capacity: String(table.capacity),
      section: table.section,
      status: table.status,
      x: table.x != null ? String(table.x) : "",
      y: table.y != null ? String(table.y) : "",
    });
    setErrors([]);
    setOpen(true);
  }

  function submit() {
    const payload = {
      number: form.number,
      capacity: Number(form.capacity),
      section: form.section,
      status: form.status,
      x: form.x === "" ? undefined : Number(form.x),
      y: form.y === "" ? undefined : Number(form.y),
    };
    const result = editing
      ? updateTable(editing.id, payload)
      : addTable(payload);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setOpen(false);
  }

  function activeReservationCount(tableId: string) {
    return store.reservations.filter(
      (reservation) =>
        reservation.tableId === tableId &&
        ["pending", "confirmed", "seated"].includes(reservation.status),
    ).length;
  }

  function hasActiveOrder(table: Table) {
    if (table.currentOrderId) return true;
    return store.orders.some(
      (order) =>
        order.tableId === table.id && isActiveOrderStatus(order.status),
    );
  }

  function openDelete(table: Table) {
    setPageError([]);
    setDeleteErrors([]);
    if (hasActiveOrder(table)) {
      setPageError(["Cannot delete a table with an active order."]);
      return;
    }
    if (activeReservationCount(table.id) > 0) {
      setReassignTo("");
      setReassignDelete(table);
      return;
    }
    setSimpleDelete(table);
  }

  function confirmReassignDelete() {
    if (!reassignDelete) return;
    const result = deleteTable(reassignDelete.id, {
      reassignReservationsTo: reassignTo || undefined,
    });
    if (!result.ok) {
      setDeleteErrors(result.errors);
      return;
    }
    setReassignDelete(null);
  }

  function handleCombine() {
    setActionErrors([]);
    const result = combineTables(selectedIds);
    if (!result.ok) {
      setActionErrors(result.errors);
      return;
    }
    setSelectedIds([]);
  }

  function handleSeparate(tableId: string) {
    setActionErrors([]);
    const result = separateTables(tableId);
    if (!result.ok) setActionErrors(result.errors);
  }

  function submitMove() {
    setMoveErrors([]);
    if (!moveOrderId || !moveTableId) {
      setMoveErrors(["Select both an order and a target table."]);
      return;
    }
    const result = moveOrderToTable(moveOrderId, moveTableId);
    if (!result.ok) {
      setMoveErrors(result.errors);
      return;
    }
    setMoveOpen(false);
    setMoveOrderId("");
    setMoveTableId("");
  }

  function orderLabel(orderId?: string) {
    if (!orderId) return null;
    const order = store.orders.find((item) => item.id === orderId);
    return order?.orderNumber ?? orderId;
  }

  function reservationLabel(reservationId?: string) {
    if (!reservationId) return null;
    const reservation = store.reservations.find(
      (item) => item.id === reservationId,
    );
    return reservation?.guestName
      ? `${reservation.guestName} (${reservation.id})`
      : reservationId;
  }

  function positionFor(table: Table, index: number, total: number) {
    if (table.x != null && table.y != null) {
      return {
        left: `${Math.min(88, Math.max(2, table.x))}%`,
        top: `${Math.min(78, Math.max(4, table.y))}%`,
      };
    }
    const cols = Math.max(2, Math.ceil(Math.sqrt(total)));
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      left: `${8 + col * (80 / cols)}%`,
      top: `${12 + row * 28}%`,
    };
  }

  if (!hydrated) return <LoadingState label="Loading tables..." />;

  return (
    <div className="space-y-6 animate-fade-up">
      {pageError.length || actionErrors.length ? (
        <Alert>
          <ul className="list-disc pl-4">
            {[...pageError, ...actionErrors].map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATUSES.map((status) => (
          <Card key={status} className="border-navy/10 p-4">
            <p className="text-sm capitalize text-muted">{status}</p>
            <p className="mt-1 font-display text-2xl text-navy">
              {counts[status] ?? 0}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Floor Plan"
          description="Live layout by section · select tables to combine"
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMoveErrors([]);
                  setMoveOpen(true);
                }}
              >
                <MoveRight className="h-4 w-4" />
                Assign / move order
              </Button>
              <Button
                variant="outline"
                disabled={selectedIds.length < 2}
                onClick={handleCombine}
              >
                <Combine className="h-4 w-4" />
                Combine ({selectedIds.length})
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add table
              </Button>
            </div>
          }
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search tables, orders, reservations..."
            />
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <Select
              value={sectionFilter}
              onChange={(event) => setSectionFilter(event.target.value)}
            >
              <option value="all">All sections</option>
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </Select>
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              No tables match your filters.
            </p>
          ) : (
            <div className="space-y-6">
              {[...tablesBySection.entries()].map(([section, tables]) => (
                <div key={section} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-lg text-navy">{section}</h3>
                    <p className="text-xs text-muted">
                      {tables.length} table{tables.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-navy/10 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.08),transparent_45%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_50%,#fff7ed_100%)]">
                    <div className="pointer-events-none absolute inset-4 rounded-xl border border-dashed border-navy/10" />
                    {tables.map((table, index) => {
                      const capacity = getEffectiveCapacity(
                        table,
                        store.tables,
                      );
                      const selected = selectedIds.includes(table.id);
                      const pos = positionFor(table, index, tables.length);
                      const occupiedMins = table.occupiedAt
                        ? elapsedMinutesSince(table.occupiedAt)
                        : null;
                      return (
                        <div
                          key={table.id}
                          className={cn(
                            "absolute w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 p-3 shadow-sm transition",
                            statusStyles[table.status],
                            selected && "ring-2 ring-orange ring-offset-2",
                            table.combineGroupId && "border-dashed",
                          )}
                          style={{ left: pos.left, top: pos.top }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              className="text-left"
                              onClick={() => toggleSelect(table.id)}
                              title="Select for combine"
                            >
                              <p className="font-display text-lg leading-none">
                                {table.number}
                              </p>
                              <p className="mt-1 text-[11px] text-muted">
                                {capacity} seats
                                {table.combineGroupId ? " · combined" : ""}
                              </p>
                            </button>
                            <Badge tone={statusTone(table.status)}>
                              {table.status}
                            </Badge>
                          </div>

                          {table.currentOrderId ? (
                            <p className="mt-2 truncate text-[11px] text-navy">
                              Order {orderLabel(table.currentOrderId)}
                            </p>
                          ) : null}
                          {table.currentReservationId ? (
                            <p className="mt-1 truncate text-[11px] text-muted">
                              Res {reservationLabel(table.currentReservationId)}
                            </p>
                          ) : null}
                          {table.occupiedAt ? (
                            <p className="mt-1 text-[11px] text-orange">
                              {occupiedMins != null
                                ? `${occupiedMins}m occupied`
                                : formatRelativeTime(table.occupiedAt)}
                            </p>
                          ) : null}

                          <div className="mt-2">
                            <Select
                              value={table.status}
                              onChange={(event) =>
                                updateTableStatus(
                                  table.id,
                                  event.target.value as TableStatus,
                                )
                              }
                              className="h-8 text-xs"
                            >
                              {STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </Select>
                          </div>

                          <div className="mt-2 flex justify-end gap-0.5">
                            {table.combineGroupId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Separate combined group"
                                onClick={() => handleSeparate(table.id)}
                              >
                                <Link2Off className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(table)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDelete(table)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-danger" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit table" : "Add table"}
      >
        <div className="space-y-4">
          <Field label="Number / name">
            <Input
              value={form.number}
              onChange={(event) =>
                setForm({ ...form, number: event.target.value })
              }
              placeholder="T-12"
            />
          </Field>
          <Field label="Capacity">
            <Input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(event) =>
                setForm({ ...form, capacity: event.target.value })
              }
            />
          </Field>
          <Field label="Section">
            <Input
              value={form.section}
              onChange={(event) =>
                setForm({ ...form, section: event.target.value })
              }
              placeholder="Main"
              list="table-sections"
            />
            <datalist id="table-sections">
              {SECTION_ORDER.map((section) => (
                <option key={section} value={section} />
              ))}
              {sections.map((section) => (
                <option key={`s-${section}`} value={section} />
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Floor X (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={form.x}
                onChange={(event) =>
                  setForm({ ...form, x: event.target.value })
                }
                placeholder="Auto"
              />
            </Field>
            <Field label="Floor Y (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={form.y}
                onChange={(event) =>
                  setForm({ ...form, y: event.target.value })
                }
                placeholder="Auto"
              />
            </Field>
          </div>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as TableStatus,
                })
              }
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
          {errors.length ? (
            <Alert>
              <ul className="list-disc pl-4">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>
              {editing ? "Save changes" : "Create table"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title="Assign / move dine-in order"
      >
        <div className="space-y-4">
          <Field label="Active dine-in order">
            <Select
              value={moveOrderId}
              onChange={(event) => setMoveOrderId(event.target.value)}
            >
              <option value="">Select order</option>
              {dineInOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} · {order.customerName}
                  {order.tableNumber ? ` · ${order.tableNumber}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target table">
            <Select
              value={moveTableId}
              onChange={(event) => setMoveTableId(event.target.value)}
            >
              <option value="">Select table</option>
              {freeTargets.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.number} · {table.section} ·{" "}
                  {getEffectiveCapacity(table, store.tables)} seats ·{" "}
                  {table.status}
                </option>
              ))}
            </Select>
          </Field>
          {moveErrors.length ? (
            <Alert>
              <ul className="list-disc pl-4">
                {moveErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMoveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitMove}>Move order</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(simpleDelete)}
        title="Delete table?"
        description={
          simpleDelete
            ? `Remove table ${simpleDelete.number} from the floor plan.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        onClose={() => setSimpleDelete(null)}
        onConfirm={() => {
          if (!simpleDelete) return;
          const result = deleteTable(simpleDelete.id);
          if (!result.ok) setPageError(result.errors);
          setSelectedIds((prev) =>
            prev.filter((id) => id !== simpleDelete.id),
          );
        }}
      />

      <Modal
        open={Boolean(reassignDelete)}
        onClose={() => setReassignDelete(null)}
        title="Delete table?"
      >
        {reassignDelete ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Table {reassignDelete.number} has{" "}
              {activeReservationCount(reassignDelete.id)} active reservation(s).
              Reassign them to another table before deleting.
            </p>
            <Field label="Reassign reservations to">
              <Select
                value={reassignTo}
                onChange={(event) => setReassignTo(event.target.value)}
              >
                <option value="">Select table</option>
                {reassignTargets.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.number} · {table.section}
                  </option>
                ))}
              </Select>
            </Field>
            {deleteErrors.length ? (
              <Alert>
                <ul className="list-disc pl-4">
                  {deleteErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReassignDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmReassignDelete}>
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
