import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapOwnedApplicationsByVacancyId,
  type OwnedApplicationSummary,
} from "@/lib/applications/owned-application";
import { loadCandidateCompletionStatus } from "@/lib/onboarding/candidate-completion-status";
import { loadCurrentCandidateMatches } from "@/lib/matching/load-current-candidate-matches";
import type { PublicVacancy } from "@/lib/public-jobs/domain";
import type { Database } from "@/types/database";

export type LoadCurrentCandidateMatchesPageResult =
  | { status: "unauthenticated" }
  | { status: "profile_missing" }
  | { status: "incomplete" }
  | { status: "failure" }
  | {
      status: "success";
      vacancies: PublicVacancy[];
      applicationsByVacancyId: ReadonlyMap<string, OwnedApplicationSummary>;
    };

/**
 * Page-level composition for `/candidate/matches`. The existing narrow
 * completion guard (`loadCandidateCompletionStatus` — selects only
 * `onboarding_completed_at`, no matching-relevant column) decides whether
 * the candidate may proceed at all; the canonical list RPC
 * (`list_current_candidate_vacancy_matches`) is only ever called for a
 * `complete` candidate, so its own empty-array result can only mean "zero
 * current eligible matches" — never "incomplete" or "missing profile".
 */
export async function loadCurrentCandidateMatchesPage(
  supabase: SupabaseClient<Database>,
): Promise<LoadCurrentCandidateMatchesPageResult> {
  const completion = await loadCandidateCompletionStatus(supabase);
  if (completion.status !== "complete") {
    return completion;
  }

  const listResult = await loadCurrentCandidateMatches(supabase);
  if (!listResult.ok) {
    return { status: "failure" };
  }

  if (listResult.vacancies.length === 0) {
    return {
      status: "success",
      vacancies: [],
      applicationsByVacancyId: new Map(),
    };
  }

  const vacancyIds = listResult.vacancies.map((vacancy) => vacancy.vacancyId);
  const { data, error } = await supabase
    .from("applications")
    .select("id, vacancy_id, status, submitted_at")
    .in("vacancy_id", vacancyIds);
  if (error !== null) {
    return { status: "failure" };
  }

  const applicationsByVacancyId = mapOwnedApplicationsByVacancyId(data ?? []);
  if (applicationsByVacancyId === null) {
    return { status: "failure" };
  }

  return {
    status: "success",
    vacancies: listResult.vacancies,
    applicationsByVacancyId,
  };
}
