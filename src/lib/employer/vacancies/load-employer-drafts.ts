import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapReadinessChecklist,
  type ReadinessChecklistItem,
} from "@/lib/employer/vacancies/readiness";
import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";
import { readinessRpcResultSchema } from "@/lib/employer/vacancies/schemas";
import type { EmployerType } from "@/lib/employer/schemas";
import type { Database } from "@/types/database";

export type VacancyLifecycleState =
  "draft" | "published" | "paused" | "filled" | "expired" | "withdrawn";

export type EmployerDraftListItem = {
  id: string;
  title: string;
  jobCategory: string;
  publicLocality: string | null;
  employerType: EmployerType;
  companyName: string | null;
  publicationState: VacancyLifecycleState;
  expiresAt: string | null;
  isEffectivelyExpired: boolean;
  updatedAt: string;
  ready: boolean | null;
  checklist: ReadinessChecklistItem[];
  // Per-transition timestamps written by `_transition_employer_vacancy`
  // (supabase/migrations/20260805110000_verification_and_vacancy_publication.sql).
  // Real data sources for row consequence sentences — never derived/guessed.
  pausedAt: string | null;
  filledAt: string | null;
  withdrawnAt: string | null;
  expiredAt: string | null;
};

export type LoadEmployerDraftsResult =
  | { ok: true; drafts: EmployerDraftListItem[] }
  | {
      ok: false;
      reason: "unauthenticated" | "incomplete" | "failed";
      error: string;
    };

type EmployerClient = SupabaseClient<Database>;

/**
 * Load every owned employer vacancy (any lifecycle state) ordered by
 * updated_at DESC. Named for its PR 4.3 origin; PR 5.4 broadened the state
 * filter so the list also shows published/paused/filled/expired/withdrawn
 * rows, not only drafts.
 *
 * Readiness uses the per-draft RPC (PR 4.3) and is only meaningful — and
 * only fetched — for rows still in `draft`. There is no bulk readiness
 * interface yet; list pages call readiness once per draft row. Acceptable
 * for early employer draft counts; revisit if lists grow large.
 */
export async function loadEmployerDrafts(
  supabase: EmployerClient,
): Promise<LoadEmployerDraftsResult> {
  const gate = await requireCompletedEmployer(supabase);
  if (!gate.ok) {
    return gate;
  }

  const { data: rows, error } = await gate.supabase
    .from("vacancies")
    .select(
      "id, title, job_category, public_locality, updated_at, source, publication_state, expires_at, paused_at, filled_at, withdrawn_at, expired_at, employer_profile_id, company_id, companies(name)",
    )
    .eq("source", "employer")
    .eq("employer_profile_id", gate.userId)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true });

  if (error || rows === null) {
    return {
      ok: false,
      reason: "failed",
      error: "Could not load your vacancy drafts.",
    };
  }

  const now = Date.now();
  const drafts: EmployerDraftListItem[] = [];

  for (const row of rows) {
    let ready: boolean | null = null;
    let checklist: ReadinessChecklistItem[] = [];

    if (row.publication_state === "draft") {
      const readiness = await gate.supabase.rpc(
        "employer_vacancy_draft_readiness",
        { p_vacancy_id: row.id },
      );

      if (readiness.error === null) {
        const parsed = readinessRpcResultSchema.safeParse(readiness.data);
        if (parsed.success && parsed.data.status === "ok") {
          ready = parsed.data.ready;
          checklist = mapReadinessChecklist(parsed.data.missing);
        }
      }
    }

    const companyRelation = row.companies;
    const companyName =
      companyRelation !== null &&
      typeof companyRelation === "object" &&
      "name" in companyRelation &&
      typeof companyRelation.name === "string"
        ? companyRelation.name
        : (gate.profile.company?.name ?? null);

    const isEffectivelyExpired =
      row.publication_state === "published" &&
      row.expires_at !== null &&
      new Date(row.expires_at).getTime() <= now;

    drafts.push({
      id: row.id,
      title: row.title,
      jobCategory: row.job_category,
      publicLocality: row.public_locality,
      employerType: gate.profile.employerType,
      companyName:
        gate.profile.employerType === "organisation" ? companyName : null,
      publicationState: row.publication_state as VacancyLifecycleState,
      expiresAt: row.expires_at,
      isEffectivelyExpired,
      updatedAt: row.updated_at,
      ready,
      checklist,
      pausedAt: row.paused_at,
      filledAt: row.filled_at,
      withdrawnAt: row.withdrawn_at,
      expiredAt: row.expired_at,
    });
  }

  return { ok: true, drafts };
}
