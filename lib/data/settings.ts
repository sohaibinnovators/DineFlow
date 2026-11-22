import type { DayHours, RestaurantSettings } from "@/lib/types";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function defaultHours(): DayHours[] {
  return DAY_NAMES.map((_, day) => {
    if (day === 0) {
      return { day, open: "10:00", close: "21:00", closed: false };
    }
    if (day === 5 || day === 6) {
      return { day, open: "11:00", close: "23:30", closed: false };
    }
    return { day, open: "11:00", close: "22:00", closed: false };
  });
}

export function defaultSettings(): RestaurantSettings {
  return {
    reservationDurationMinutes: 90,
    bufferMinutes: 15,
    hours: defaultHours(),
    blockedSlots: [],
  };
}

export function dayName(day: number) {
  return DAY_NAMES[day] ?? `Day ${day}`;
}

/** Parse "HH:MM" or "H:MM AM/PM" into minutes from midnight. */
export function timeToMinutes(value: string): number {
  const trimmed = value.trim();
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hours = Number(ampm[1]) % 12;
    if (ampm[3].toUpperCase() === "PM") hours += 12;
    return hours * 60 + Number(ampm[2]);
  }
  const parts = trimmed.split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] ?? 0);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return NaN;
  return hours * 60 + minutes;
}

export function minutesToTime(total: number): string {
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDisplayTime(value: string): string {
  const mins = timeToMinutes(value);
  if (Number.isNaN(mins)) return value;
  const hours24 = Math.floor(mins / 60);
  const minutes = mins % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}
