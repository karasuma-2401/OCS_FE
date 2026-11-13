/**
 * Calendar utility functions for date normalization and formatting.
 */

/** Parse an ISO-like string into a Date, returning null on failure. */
export function calendarDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a Date as an ISO date string `YYYY-MM-DD`. */
export function calendarISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Human-readable display: `dd/mm/yyyy` or `dd/mm/yyyy hh:mm`. */
export function calendarDisplay(
  value: string,
  withTime = false,
): string {
  if (!value) return "";
  const date = calendarDate(value);
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  if (!withTime) return `${d}/${m}/${y}`;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${d}/${m}/${y} ${hh}:${mm}`;
}

/** Parse `dd/mm/yyyy` (or `dd/mm/yyyy hh:mm`) back to ISO string. */
export function calendarInputValue(
  text: string,
  withTime = false,
): string {
  if (!text) return "";
  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/,
  );
  if (!match) return "";
  const [, dd, mm, yyyy, hh, min] = match;
  const d = Number(dd);
  const m = Number(mm);
  if (m < 1 || m > 12 || d < 1 || d > 31) return "";
  const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  if (!withTime) return iso;
  if (hh === undefined) return iso;
  return `${iso}T${hh.padStart(2, "0")}:${min}`;
}
