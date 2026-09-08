import { z } from "zod";

import type { Locale } from "@/lib/i18n/locale";

/**
 * Matches `applications_status_chk` in
 * supabase/migrations/20260806140000_application_status_and_review_contract.sql.
 * The database's transition-matrix helper is the sole transition authority
 * (D-070) — this module only names the status vocabulary and its display
 * labels, reused everywhere a status is shown (list, detail, status
 * history, transition controls).
 */
export const APPLICATION_STATUS_CODES = [
  "submitted",
  "reviewing",
  "shortlisted",
  "accepted",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS_CODES)[number];

export const applicationStatusSchema = z.enum(APPLICATION_STATUS_CODES);

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  reviewing: "In review",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  rejected: "Rejected",
};

const APPLICATION_STATUS_LABELS_DE: Record<ApplicationStatus, string> = {
  submitted: "Eingegangen",
  reviewing: "In Prüfung",
  shortlisted: "Vorausgewählt",
  accepted: "Angenommen",
  rejected: "Abgelehnt",
};

export function applicationStatusLabel(
  status: ApplicationStatus,
  locale: Locale = "en",
): string {
  return locale === "de"
    ? APPLICATION_STATUS_LABELS_DE[status]
    : APPLICATION_STATUS_LABELS[status];
}

/**
 * Target-status -> action-verb label for the discrete status-action
 * buttons (distinct from `applicationStatusLabel`, which is a status ->
 * noun label). `submitted` never appears as a real transition target —
 * the database's transition-matrix helper never returns it — so its
 * entry here is dead code required only to satisfy the `Record`'s
 * exhaustiveness.
 */
const APPLICATION_ACTION_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Reset to submitted",
  reviewing: "Start reviewing",
  shortlisted: "Shortlist",
  accepted: "Accept",
  rejected: "Reject application",
};

const APPLICATION_ACTION_LABELS_DE: Record<ApplicationStatus, string> = {
  submitted: "Auf eingegangen zurücksetzen",
  reviewing: "Prüfung beginnen",
  shortlisted: "Vorauswählen",
  accepted: "Annehmen",
  rejected: "Bewerbung ablehnen",
};

export function employerApplicationActionLabel(
  status: ApplicationStatus,
  locale: Locale = "en",
): string {
  return locale === "de"
    ? APPLICATION_ACTION_LABELS_DE[status]
    : APPLICATION_ACTION_LABELS[status];
}

/**
 * Pending form of `employerApplicationActionLabel`, shown on the specific
 * status-transition button that was pressed while its request is in
 * flight (Task E / P3.6 — gray-and-silent regression fix). Scoped to just
 * the ordinary (non-terminal) transitions `ApplicationStatusActions`
 * renders as discrete buttons; `accepted`/`rejected` entries exist only
 * for the `Record`'s exhaustiveness (those two are never label-swapped
 * here — `StatusTransitionConfirmDialog` owns their pending copy) and are
 * set to "Recording…" for consistency with that dialog's own convention.
 */
const APPLICATION_ACTION_PENDING_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Resetting…",
  reviewing: "Starting review…",
  shortlisted: "Shortlisting…",
  accepted: "Recording…",
  rejected: "Recording…",
};

const APPLICATION_ACTION_PENDING_LABELS_DE: Record<ApplicationStatus, string> =
  {
    submitted: "Wird zurückgesetzt…",
    reviewing: "Prüfung wird begonnen…",
    shortlisted: "Wird vorausgewählt…",
    accepted: "Wird gespeichert…",
    rejected: "Wird gespeichert…",
  };

export function employerApplicationActionPendingLabel(
  status: ApplicationStatus,
  locale: Locale = "en",
): string {
  return locale === "de"
    ? APPLICATION_ACTION_PENDING_LABELS_DE[status]
    : APPLICATION_ACTION_PENDING_LABELS[status];
}

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUS_CODES as readonly string[]).includes(value);
}
