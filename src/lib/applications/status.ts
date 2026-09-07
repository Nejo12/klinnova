import { z } from "zod";

import type { Locale } from "@/lib/i18n/locale";

/**
 * Matches `applications_status_chk` in
 * supabase/migrations/20260806140000_application_status_and_review_contract.sql.
 * The database's transition-matrix helper is the sole transition authority
 * (D-070) — this module only names the status vocabulary and its display
 * labels, shared by both the candidate and employer application surfaces so
 * the five-status vocabulary cannot drift between them.
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
  submitted: "Eingereicht",
  reviewing: "In Prüfung",
  shortlisted: "In engerer Auswahl",
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

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUS_CODES as readonly string[]).includes(value);
}
