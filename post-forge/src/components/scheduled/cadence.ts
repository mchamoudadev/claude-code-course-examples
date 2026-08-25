/**
 * Dependency-free presentation helpers for the Scheduled screen (T14).
 *
 * Kept free of any server/`mongodb` import so both the client screen and the
 * form can share it. Types are pulled from the repo via `import type` only.
 */

import type { ScheduleCadence, SchedulePreset } from "@/lib/schedules-repo";

/** Preset picker options (order matches ascending frequency). */
export const PRESET_OPTIONS: { value: SchedulePreset; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

/** Trending-theme sources offered in the form (keys match `resolveScheduleTopic`). */
export const THEME_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "trending-tech", label: "Trending in tech" },
  { value: "trending-ai", label: "Trending in AI" },
  { value: "trending-science", label: "Trending in science" },
  { value: "trending-business", label: "Trending in business" },
  { value: "trending-culture", label: "Trending in culture" },
];

/** A compact, common set of IANA timezones for the form. */
export const TIMEZONE_OPTIONS: string[] = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Africa/Nairobi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

/** The viewer's timezone, falling back to UTC. */
export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const PRESET_LABELS: Record<SchedulePreset, string> = {
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function presetLabel(preset: SchedulePreset): string {
  return PRESET_LABELS[preset] ?? preset;
}

/** Human summary of a cadence (e.g. "Weekly" or "Weekly · 0 9 * * 1"). */
export function cadenceSummary(cadence: ScheduleCadence): string {
  const base = presetLabel(cadence.preset);
  return cadence.cron ? `${base} · ${cadence.cron}` : base;
}

/** Absolute date-time in a given timezone (e.g. "Jul 7, 2026, 9:00 AM"). */
export function formatWhen(iso: string, timezone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

/** Short relative phrase from now (e.g. "in 2 days", "due now", "3h ago"). */
export function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = d.getTime() - Date.now();
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);

  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (abs < min) return past ? "just now" : "due now";
  let value: number;
  let unit: string;
  if (abs < hour) {
    value = Math.round(abs / min);
    unit = "min";
  } else if (abs < day) {
    value = Math.round(abs / hour);
    unit = "h";
  } else {
    value = Math.round(abs / day);
    unit = value === 1 ? "day" : "days";
  }
  return past ? `${value}${sep(unit)}${unit} ago` : `in ${value}${sep(unit)}${unit}`;
}

function sep(unit: string): string {
  return unit === "day" || unit === "days" ? " " : "";
}
