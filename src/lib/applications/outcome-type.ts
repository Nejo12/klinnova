import { z } from "zod";

/**
 * M5.1 Unit E. The outcome-type vocabulary belongs to the application
 * domain, not to employer or candidate UI specifically — both surfaces
 * import from here rather than each defining/duplicating their own copy
 * (unlike the pre-existing `applicationStatusLabel`, which is duplicated
 * across `src/lib/applications/status.ts` and
 * `src/lib/employer/applications/status.ts`; deliberately not repeated
 * here). Matches exactly the two types
 * `application_outcome_events_outcome_type_chk` allows in the database
 * (Unit D, D-M5-22) — no scheduling/invitation/offer/no-show state, and no
 * literal "Interview set" language anywhere in this module.
 */
export const OUTCOME_TYPE_CODES = ["interview_completed", "hired"] as const;

export type OutcomeType = (typeof OUTCOME_TYPE_CODES)[number];

export const outcomeTypeSchema = z.enum(OUTCOME_TYPE_CODES);

const OUTCOME_TYPE_LABELS: Record<OutcomeType, string> = {
  interview_completed: "Interview completed",
  hired: "Hired",
};

export function outcomeTypeLabel(outcomeType: OutcomeType): string {
  return OUTCOME_TYPE_LABELS[outcomeType];
}

/** Berlin calendar day as YYYY-MM-DD — re-exported so callers needing both
 * "today" and outcome-date logic use one import path. */
export { berlinTodayIso } from "@/lib/onboarding/schemas";

/**
 * Resolve a UTC instant at 12:00 Europe/Berlin (DST-aware) for a given
 * YYYY-MM-DD calendar date, without a timezone library. Probes noon UTC on
 * that date, reads the actual Europe/Berlin UTC offset for that instant via
 * `Intl.DateTimeFormat`'s `longOffset`, then reconstructs the timestamp
 * using that offset. Used only for *past* dates (see `computeOccurredAtIso`)
 * — never for "today", which uses the real current instant instead.
 */
export function berlinNoonIsoForDate(dateIso: string): string {
  const probe = new Date(`${dateIso}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    timeZoneName: "longOffset",
  }).formatToParts(probe);
  const offsetRaw =
    parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = /GMT([+-])(\d{2}):?(\d{2})?/.exec(offsetRaw);
  const sign = match?.[1] ?? "+";
  const hours = match?.[2] ?? "00";
  const minutes = match?.[3] ?? "00";
  return new Date(
    `${dateIso}T12:00:00${sign}${hours}:${minutes}`,
  ).toISOString();
}

export type OccurredAtConversionResult =
  { ok: true; occurredAtIso: string } | { ok: false; reason: "future_date" };

/**
 * Converts a plain YYYY-MM-DD date (from the record-outcome form's
 * date-only input) into the ISO instant sent to `record_application_outcome`.
 * Reviewed rule (not the original "noon UTC for every date" draft, which
 * could put "today" a few hours in the future and trip the RPC's 5-minute
 * future-skew window):
 *
 * - selected date === Berlin-today  -> the real current instant (`now`),
 *   never derived from the picked date;
 * - selected date  <  Berlin-today  -> 12:00 Europe/Berlin on that date;
 * - selected date  >  Berlin-today  -> rejected here, before the RPC is
 *   ever called. This is a UX nicety only — `record_application_outcome`'s
 *   own `invalid_occurred_at` check remains the authoritative boundary.
 */
export function computeOccurredAtIso(
  selectedDateIso: string,
  berlinTodayDateIso: string,
  now: Date,
): OccurredAtConversionResult {
  if (selectedDateIso === berlinTodayDateIso) {
    return { ok: true, occurredAtIso: now.toISOString() };
  }
  if (selectedDateIso > berlinTodayDateIso) {
    return { ok: false, reason: "future_date" };
  }
  return { ok: true, occurredAtIso: berlinNoonIsoForDate(selectedDateIso) };
}
