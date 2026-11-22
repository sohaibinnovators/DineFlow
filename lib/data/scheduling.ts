import type {
  Reservation,
  RestaurantSettings,
  Table,
} from "@/lib/types";
import { isActiveReservationStatus } from "./validation";
import { timeToMinutes } from "./settings";

export interface ReservationWindow {
  date: string;
  startMinutes: number;
  endMinutes: number;
}

export function getReservationDuration(
  reservation: Pick<Reservation, "durationMinutes">,
  settings: RestaurantSettings,
) {
  return reservation.durationMinutes ?? settings.reservationDurationMinutes;
}

export function buildWindow(
  date: string,
  time: string,
  durationMinutes: number,
  bufferMinutes = 0,
): ReservationWindow | null {
  const start = timeToMinutes(time);
  if (Number.isNaN(start)) return null;
  return {
    date,
    startMinutes: start,
    endMinutes: start + durationMinutes + bufferMinutes,
  };
}

export function windowsOverlap(a: ReservationWindow, b: ReservationWindow) {
  if (a.date !== b.date) return false;
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export function getEffectiveCapacity(table: Table, tables: Table[]) {
  if (!table.combineGroupId) return table.capacity;
  return tables
    .filter((item) => item.combineGroupId === table.combineGroupId)
    .reduce((sum, item) => sum + item.capacity, 0);
}

export function getCombinedTableIds(table: Table, tables: Table[]) {
  if (!table.combineGroupId) return [table.id];
  return tables
    .filter((item) => item.combineGroupId === table.combineGroupId)
    .map((item) => item.id);
}

function isActiveForScheduling(status: string) {
  return isActiveReservationStatus(status);
}

export function validateReservationSlot(input: {
  date: string;
  time: string;
  partySize: number;
  tableId?: string;
  excludeReservationId?: string;
  durationMinutes?: number;
  settings: RestaurantSettings;
  reservations: Reservation[];
  tables: Table[];
  now?: Date;
}): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const {
    date,
    time,
    partySize,
    tableId,
    excludeReservationId,
    settings,
    reservations,
    tables,
  } = input;
  const now = input.now ?? new Date();
  const duration =
    input.durationMinutes ?? settings.reservationDurationMinutes;

  if (!date) errors.push("Date is required.");
  if (!time) errors.push("Time is required.");
  if (partySize < 1) errors.push("Guest count must be at least 1.");

  const startMinutes = timeToMinutes(time);
  if (Number.isNaN(startMinutes)) {
    errors.push("Time must be in HH:MM format.");
    return { ok: false, errors };
  }

  const proposedDate = new Date(`${date}T${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}:00`);
  if (!Number.isNaN(proposedDate.getTime()) && proposedDate.getTime() < now.getTime()) {
    errors.push("Cannot create reservations in the past.");
  }

  const day = proposedDate.getDay();
  const hours = settings.hours.find((entry) => entry.day === day);
  if (!hours || hours.closed) {
    errors.push("The restaurant is closed on the selected day.");
  } else {
    const open = timeToMinutes(hours.open);
    const close = timeToMinutes(hours.close);
    const end = startMinutes + duration;
    if (startMinutes < open || end > close) {
      errors.push(
        `Reservations must fit within operating hours (${hours.open}–${hours.close}).`,
      );
    }
  }

  for (const block of settings.blockedSlots) {
    if (block.date !== date) continue;
    if (block.tableId && tableId && block.tableId !== tableId) continue;
    if (block.tableId && !tableId) continue;
    const blockWindow = buildWindow(
      block.date,
      block.startTime,
      timeToMinutes(block.endTime) - timeToMinutes(block.startTime),
    );
    const proposed = buildWindow(date, time, duration);
    if (
      blockWindow &&
      proposed &&
      windowsOverlap(proposed, blockWindow) &&
      (!block.tableId || block.tableId === tableId)
    ) {
      errors.push(
        block.reason
          ? `Blocked: ${block.reason}`
          : "Selected time is blocked by management.",
      );
    }
  }

  if (!tableId) {
    return errors.length ? { ok: false, errors } : { ok: true };
  }

  const table = tables.find((item) => item.id === tableId);
  if (!table) {
    errors.push("Selected table was not found.");
    return { ok: false, errors };
  }

  const capacity = getEffectiveCapacity(table, tables);
  if (partySize > capacity) {
    errors.push(
      `Table ${table.number} seats ${capacity}, but party size is ${partySize}.`,
    );
  }

  const relatedIds = new Set(getCombinedTableIds(table, tables));
  const proposed = buildWindow(date, time, duration, settings.bufferMinutes);
  if (!proposed) {
    errors.push("Unable to compute reservation window.");
    return { ok: false, errors };
  }

  for (const reservation of reservations) {
    if (reservation.id === excludeReservationId) continue;
    if (!isActiveForScheduling(reservation.status)) continue;
    if (!reservation.tableId) continue;
    const other = tables.find((item) => item.id === reservation.tableId);
    if (!other) continue;
    const otherIds = getCombinedTableIds(other, tables);
    const sharesTable = otherIds.some((id) => relatedIds.has(id));
    if (!sharesTable) continue;

    const otherDuration = getReservationDuration(reservation, settings);
    const otherWindow = buildWindow(
      reservation.date,
      reservation.time,
      otherDuration,
      settings.bufferMinutes,
    );
    if (otherWindow && windowsOverlap(proposed, otherWindow)) {
      errors.push(
        `Table ${table.number} is already reserved around ${reservation.time} (${reservation.guestName}).`,
      );
      break;
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

export function getAvailableTables(input: {
  date: string;
  time: string;
  partySize: number;
  excludeReservationId?: string;
  durationMinutes?: number;
  settings: RestaurantSettings;
  reservations: Reservation[];
  tables: Table[];
  now?: Date;
}) {
  const seenGroups = new Set<string>();
  return input.tables.filter((table) => {
    if (table.combineGroupId) {
      if (seenGroups.has(table.combineGroupId)) return false;
      seenGroups.add(table.combineGroupId);
    }
    const result = validateReservationSlot({
      ...input,
      tableId: table.id,
    });
    return result.ok;
  });
}
