import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  employerModerationStatusSchema,
  employerProfileIdSchema,
  operatorVacancyListSchema,
} from "@/lib/internal/moderation/schemas";
import { requireActiveOperator } from "@/lib/internal/verification/operator-gate";
import type { Database } from "@/types/database";

export type EmployerAuditEvent = {
  eventType:
    | "employer_suspended"
    | "employer_unsuspended"
    | "vacancy_moderated"
    | "vacancy_restored"
    | "verification_approved"
    | "verification_rejected"
    | "verification_revoked";
  occurredAt: string;
  reason: string | null;
};

export type EmployerModerationDetail = {
  employerProfileId: string;
  employerType: "private" | "organisation";
  displayName: string | null;
  companyName: string | null;
  onboardingCompleted: boolean;
  verificationState:
    "unverified" | "pending" | "verified" | "rejected" | "revoked";
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  auditEvents: EmployerAuditEvent[];
};

export type OperatorVacancyRow = {
  vacancyId: string;
  title: string;
  publicationState:
    "draft" | "published" | "paused" | "filled" | "expired" | "withdrawn";
  moderated: boolean;
  moderatedAt: string | null;
  publishedAt: string | null;
};

export type LoadEmployerModerationResult =
  | {
      ok: true;
      employer: EmployerModerationDetail;
      vacancies: OperatorVacancyRow[];
    }
  | {
      ok: false;
      reason: "unauthenticated" | "not_operator" | "unavailable" | "failed";
    };

/**
 * Load one employer's moderation detail (identity + suspension state +
 * bounded audit history) plus their vacancy list, both via the PR 7.2
 * operator RPCs only. A malformed id, a nonexistent employer, and a
 * non-operator caller all collapse into the same result shapes the RPCs
 * themselves already return — this loader adds no new distinction.
 */
export async function loadEmployerModeration(
  supabase: SupabaseClient<Database>,
  employerProfileId: string,
  vacancyPage: { limit: number; offset: number },
): Promise<LoadEmployerModerationResult> {
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return gate;
  }

  const idParsed = employerProfileIdSchema.safeParse(employerProfileId);
  if (!idParsed.success) {
    return { ok: false, reason: "unavailable" };
  }

  const { data, error } = await gate.supabase.rpc(
    "get_employer_moderation_status",
    { p_employer_profile_id: idParsed.data },
  );

  if (error !== null) {
    return { ok: false, reason: "failed" };
  }

  const parsed = employerModerationStatusSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, reason: "failed" };
  }

  if (parsed.data.status === "forbidden") {
    return { ok: false, reason: "not_operator" };
  }
  if (parsed.data.status === "unavailable") {
    return { ok: false, reason: "unavailable" };
  }

  const { data: vacancyData, error: vacancyError } = await gate.supabase.rpc(
    "list_employer_vacancies_for_operator",
    {
      p_employer_profile_id: idParsed.data,
      p_limit: vacancyPage.limit,
      p_offset: vacancyPage.offset,
    },
  );

  if (vacancyError !== null) {
    return { ok: false, reason: "failed" };
  }

  const vacancyParsed = operatorVacancyListSchema.safeParse(vacancyData);
  if (!vacancyParsed.success) {
    return { ok: false, reason: "failed" };
  }

  const row = parsed.data;

  return {
    ok: true,
    employer: {
      employerProfileId: row.employer_profile_id,
      employerType: row.employer_type,
      displayName: row.display_name,
      companyName: row.company_name,
      onboardingCompleted: row.onboarding_completed,
      verificationState: row.verification_state,
      suspended: row.suspended,
      suspendedAt: row.suspended_at,
      suspendedReason: row.suspended_reason,
      auditEvents: row.audit_events.map((event) => ({
        eventType: event.event_type,
        occurredAt: event.occurred_at,
        reason: event.reason,
      })),
    },
    vacancies: vacancyParsed.data.map((vacancy) => ({
      vacancyId: vacancy.vacancy_id,
      title: vacancy.title,
      publicationState: vacancy.publication_state,
      moderated: vacancy.moderated,
      moderatedAt: vacancy.moderated_at,
      publishedAt: vacancy.published_at,
    })),
  };
}
