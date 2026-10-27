import type { AnnotationLabels } from "../types";

/** Small presentational formatters shared by the comment components. */

/** Up to two uppercase initials from a name, for an avatar monogram. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A date as "15 Apr 2026", or the raw string if it will not parse. A bare
 * "2026-04-15" is read as a calendar date, not UTC midnight, so it does not
 * slip a day west of Greenwich. Months are spelled out by hand to keep the
 * output identical in every browser locale.
 */
export function formatDate(value: string): string {
  const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const date = bare ? new Date(+bare[1], +bare[2] - 1, +bare[3]) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

type TimeUnits = Pick<AnnotationLabels, "timeNow" | "timeMinutes" | "timeHours" | "timeDays">;

/**
 * A short relative time — "nu", "5m", "3u", "2d" in Dutch, the units from the labels —
 * falling back to a date once a comment is older than a week, and to the raw string if it
 * will not parse.
 */
export function relativeTime(iso: string, units: TimeUnits): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 45) return units.timeNow;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}${units.timeMinutes}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}${units.timeHours}`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}${units.timeDays}`;
  return formatDate(iso);
}
