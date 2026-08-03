import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

import { buildApplicationPreview } from "@/lib/applications/application-preview";
import type { ApplicationPreview } from "@/lib/applications/application-preview";
import {
  buildCandidateVacancyDetail,
  type CandidateVacancyDetail,
} from "@/lib/matching/candidate-vacancy-detail";
import {
  createSupabaseCandidateVacancyMatchDataAccess,
  resolveCandidateVacancyMatch,
  type CandidateVacancyMatchDataAccess,
} from "@/lib/matching/resolve-candidate-vacancy-match";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type LoadCandidateVacancyDetailResult =
  | { status: "unauthenticated" }
  | { status: "profile_missing" }
  | { status: "incomplete" }
  | { status: "unavailable" }
  | { status: "not_matching" }
  | {
      status: "ready";
      detail: CandidateVacancyDetail;
      preview: ApplicationPreview;
    }
  | { status: "failure"; reason: "load" | "invariant" };

/** Alias retained for existing loader tests. */
export type CandidateVacancyDetailDataAccess = CandidateVacancyMatchDataAccess;

export function createSupabaseCandidateVacancyDetailDataAccess(
  supabase: SupabaseClient<Database>,
): CandidateVacancyMatchDataAccess {
  return createSupabaseCandidateVacancyMatchDataAccess(supabase);
}

/**
 * Authenticated server loader for one candidate vacancy detail + application preview.
 * Candidate identity comes only from the verified session.
 * Incomplete onboarding stops before vacancy queries.
 * Matching uses the existing TypeScript matcher (no SQL matcher).
 */
export async function loadCandidateVacancyDetail(
  vacancyId: string,
  dataAccess?: CandidateVacancyMatchDataAccess,
): Promise<LoadCandidateVacancyDetailResult> {
  const access =
    dataAccess ??
    createSupabaseCandidateVacancyMatchDataAccess(
      await createServerSupabaseClient(),
    );

  const resolved = await resolveCandidateVacancyMatch(vacancyId, access);

  if (resolved.status !== "ready") {
    return resolved;
  }

  return {
    status: "ready",
    detail: buildCandidateVacancyDetail(resolved.match),
    preview: buildApplicationPreview({
      match: resolved.match,
      candidate: resolved.candidate,
      displayName: resolved.displayName,
      workAuthorisationDeclared: resolved.workAuthorisationDeclared,
    }),
  };
}
