import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  employerProfileIdSchema,
  vacancyIdSchema,
  vacancyModerationStatusSchema,
} from "@/lib/internal/moderation/schemas";
import { requireActiveOperator } from "@/lib/internal/verification/operator-gate";
import type { Database } from "@/types/database";
import type { EmployerAuditEvent } from "@/lib/internal/moderation/load-employer-moderation";

export type VacancyModerationDetail = {
  vacancyId: string;
  title: string;
  employerProfileId: string;
  publicationState:
    "draft" | "published" | "paused" | "filled" | "expired" | "withdrawn";
  moderated: boolean;
  moderatedAt: string | null;
  moderatedReason: string | null;
  auditEvents: EmployerAuditEvent[];
};

export type LoadVacancyModerationResult =
  | { ok: true; vacancy: VacancyModerationDetail }
  | {
      ok: false;
      reason: "unauthenticated" | "not_operator" | "unavailable" | "failed";
    };

/**
 * Load one vacancy's moderation detail, scoped under an employer route.
 * The route's employerProfileId is validated separately by the caller and
 * cross-checked against the RPC's own `employer_profile_id` here — a
 * mismatch collapses to the identical "unavailable" result a nonexistent
 * vacancy would produce, never a redirect to the vacancy's real owner.
 */
export async function loadVacancyModeration(
  supabase: SupabaseClient<Database>,
  employerProfileId: string,
  vacancyId: string,
): Promise<LoadVacancyModerationResult> {
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return gate;
  }

  const employerIdParsed = employerProfileIdSchema.safeParse(employerProfileId);
  const vacancyIdParsed = vacancyIdSchema.safeParse(vacancyId);
  if (!employerIdParsed.success || !vacancyIdParsed.success) {
    return { ok: false, reason: "unavailable" };
  }

  const { data, error } = await gate.supabase.rpc(
    "get_vacancy_moderation_status",
    { p_vacancy_id: vacancyIdParsed.data },
  );

  if (error !== null) {
    return { ok: false, reason: "failed" };
  }

  const parsed = vacancyModerationStatusSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, reason: "failed" };
  }

  if (parsed.data.status === "forbidden") {
    return { ok: false, reason: "not_operator" };
  }
  if (parsed.data.status === "unavailable") {
    return { ok: false, reason: "unavailable" };
  }

  const row = parsed.data;

  if (row.employer_profile_id !== employerIdParsed.data) {
    return { ok: false, reason: "unavailable" };
  }

  return {
    ok: true,
    vacancy: {
      vacancyId: row.vacancy_id,
      title: row.title,
      employerProfileId: row.employer_profile_id,
      publicationState: row.publication_state,
      moderated: row.moderated,
      moderatedAt: row.moderated_at,
      moderatedReason: row.moderated_reason,
      auditEvents: row.audit_events.map((event) => ({
        eventType: event.event_type,
        occurredAt: event.occurred_at,
        reason: event.reason,
      })),
    },
  };
}
