import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { candidateVacancyMatchListSchema } from "@/lib/matching/candidate-vacancy-match-schemas";
import { mapPublicVacancy, type PublicVacancy } from "@/lib/public-jobs/domain";
import type { Database } from "@/types/database";

export type LoadCurrentCandidateMatchesResult =
  { ok: true; vacancies: PublicVacancy[] } | { ok: false };

/**
 * Canonical candidate discovery loader (PR 5.5d). Uses
 * `list_current_candidate_vacancy_matches()` only — no direct table read,
 * no TypeScript matcher, no separate candidate-profile fetch. Preserves the
 * RPC's own `published_at desc, vacancy_id asc` ordering exactly; never
 * re-sorted here (this intentionally drops the former client-side
 * `title asc` tie-break — the canonical RPC order is now authoritative).
 * Whole-response Zod validation: a malformed individual row fails the
 * complete result rather than being dropped, since this is authenticated
 * eligibility data, not an anonymous public listing.
 */
export async function loadCurrentCandidateMatches(
  supabase: SupabaseClient<Database>,
): Promise<LoadCurrentCandidateMatchesResult> {
  const { data, error } = await supabase.rpc(
    "list_current_candidate_vacancy_matches",
  );
  if (error !== null) {
    return { ok: false };
  }

  const parsed = candidateVacancyMatchListSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false };
  }

  return { ok: true, vacancies: parsed.data.map(mapPublicVacancy) };
}
