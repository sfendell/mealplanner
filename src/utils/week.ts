import { DAY_NAMES } from "../constants";
import type { WeeklyPlanDay } from "../types";

const DAY_KEYS = Object.keys(DAY_NAMES);

/** Format a Date as YYYY-MM-DD in local time. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday of the week containing `date` (local). */
export function startOfWeekMonday(date = new Date()): Date {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  const day = result.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

/** Seven days starting today, in local time. */
export function upcomingWeekDays(reference = new Date()): WeeklyPlanDay[] {
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dayKey = DAY_KEYS[date.getDay()];
    return {
      date: toDateKey(date),
      day: dayKey,
      meal: "",
    };
  });
}

/** Seven days Mon–Sun for the current week. */
export function currentWeekDays(reference = new Date()): WeeklyPlanDay[] {
  const monday = startOfWeekMonday(reference);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dayKey = DAY_KEYS[date.getDay()];
    return {
      date: toDateKey(date),
      day: dayKey,
      meal: "",
    };
  });
}

export function dayLabel(dayKey: string): string {
  return dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
}

export function formatDisplayDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString();
}
