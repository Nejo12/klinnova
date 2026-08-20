import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapReadinessChecklist,
  type ReadinessChecklistItem,
} from "@/lib/employer/vacancies/readiness";
import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";
import { bulkReadinessRpcResultSchema } from "@/lib/employer/vacancies/schemas";
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
  // Only `filledAt`/`expiredAt` are currently read (vacancy-list.tsx); the
  // paused/withdrawn consequence sentences are static, dateless text.
  // `pausedAt`/`withdrawnAt` are kept for symmetry across the four
  // lifecycle timestamps and possible future use, but are not read
  // anywhere yet.
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
 * Readiness is only meaningful — and only fetched — for rows still in
 * `draft`. P3.7-B uses one set-based readiness RPC for every draft row in
 * this list so employer home/vacancy-list rendering no longer performs one
 * readiness round trip per draft.
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
  const draftRowIds = rows
    .filter((row) => row.publication_state === "draft")
    .map((row) => row.id);
  const readinessByVacancyId = new Map<
    string,
    { ready: boolean; missing: string[] }
  >();

  if (draftRowIds.length > 0) {
    const readiness = await gate.supabase.rpc(
      "employer_vacancy_drafts_readiness",
      { p_vacancy_ids: draftRowIds },
    );

    if (readiness.error === null) {
      const parsed = bulkReadinessRpcResultSchema.safeParse(readiness.data);
      if (parsed.success) {
        for (const row of parsed.data) {
          readinessByVacancyId.set(row.vacancy_id, {
            ready: row.ready,
            missing: row.missing,
          });
        }
      }
    }
  }

  const drafts: EmployerDraftListItem[] = [];

  for (const row of rows) {
    let ready: boolean | null = null;
    let checklist: ReadinessChecklistItem[] = [];

    if (row.publication_state === "draft") {
      const readiness = readinessByVacancyId.get(row.id);
      if (readiness !== undefined) {
        ready = readiness.ready;
        checklist = mapReadinessChecklist(readiness.missing);
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
