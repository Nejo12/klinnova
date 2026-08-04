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

export type EmployerDraftListItem = {
  id: string;
  title: string;
  jobCategory: string;
  publicLocality: string | null;
  employerType: EmployerType;
  companyName: string | null;
  updatedAt: string;
  ready: boolean | null;
  checklist: ReadinessChecklistItem[];
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
 * Load owned employer drafts ordered by updated_at DESC.
 *
 * Readiness uses the per-draft RPC (PR 4.3). There is no bulk readiness
 * interface yet; list pages call readiness once per draft. Acceptable for
 * early employer draft counts; revisit if lists grow large (no migration in PR 4.4).
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
      "id, title, job_category, public_locality, updated_at, source, publication_state, employer_profile_id, company_id, companies(name)",
    )
    .eq("source", "employer")
    .eq("publication_state", "draft")
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

  const drafts: EmployerDraftListItem[] = [];

  for (const row of rows) {
    const readiness = await gate.supabase.rpc(
      "employer_vacancy_draft_readiness",
      { p_vacancy_id: row.id },
    );

    let ready: boolean | null = null;
    let checklist: ReadinessChecklistItem[] = [];

    if (readiness.error === null) {
      const parsed = readinessRpcResultSchema.safeParse(readiness.data);
      if (parsed.success && parsed.data.status === "ok") {
        ready = parsed.data.ready;
        checklist = mapReadinessChecklist(parsed.data.missing);
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

    drafts.push({
      id: row.id,
      title: row.title,
      jobCategory: row.job_category,
      publicLocality: row.public_locality,
      employerType: gate.profile.employerType,
      companyName:
        gate.profile.employerType === "organisation" ? companyName : null,
      updatedAt: row.updated_at,
      ready,
      checklist,
    });
  }

  return { ok: true, drafts };
}
