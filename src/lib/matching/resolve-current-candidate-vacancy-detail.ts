import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  mapOwnedApplicationSummary,
  type OwnedApplicationSummary,
} from "@/lib/applications/owned-application";
import {
  parseMissingRequirementCodes,
  type MissingRequirementCode,
} from "@/lib/matching/missing-requirement-codes";
import {
  mapPublicVacancy,
  mapPublicVacancyLanguage,
  type PublicVacancy,
  type PublicVacancyLanguage,
} from "@/lib/public-jobs/domain";
import {
  publicVacancyLanguageListSchema,
  publicVacancyRowSchema,
} from "@/lib/public-jobs/schemas";
import type { Database } from "@/types/database";

const vacancyIdSchema = z.string().uuid();

const candidateMatchRowSchema = z.object({
  status: z.enum(["unavailable", "incomplete", "eligible", "ineligible"]),
  eligible: z.boolean().nullable(),
  missing_requirements: z.unknown(),
});

export type LoadCurrentCandidateVacancyDetailResult =
  | { status: "unauthenticated" }
  | { status: "incomplete" }
  | { status: "unavailable" }
  | { status: "failure" }
  | {
      status: "ready";
      eligible: boolean;
      missingRequirements: MissingRequirementCode[];
      vacancy: PublicVacancy;
      languages: PublicVacancyLanguage[];
      application: OwnedApplicationSummary | null;
    };

/**
 * Canonical candidate detail loader (PR 5.5d). Two narrow contracts:
 * `resolve_current_candidate_vacancy_match` is authoritative for
 * eligibility; `get_effective_public_vacancy`/`get_effective_public_vacancy_languages`
 * (PR 5.5a, unchanged) are authoritative for rendered content. No direct
 * table read, no TypeScript matcher. Authentication is checked independently
 * via the Auth session (not a `candidate_profiles` read) so "not signed in"
 * can still redirect to login separately from "vacancy unavailable," even
 * though the RPC's own `status` collapses both to `'unavailable'`.
 */
export async function loadCurrentCandidateVacancyDetail(
  supabase: SupabaseClient<Database>,
  vacancyId: string,
): Promise<LoadCurrentCandidateVacancyDetailResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError !== null || user === null) {
    return { status: "unauthenticated" };
  }

  const parsedId = vacancyIdSchema.safeParse(vacancyId);
  if (!parsedId.success) {
    return { status: "unavailable" };
  }

  const { data: matchData, error: matchError } = await supabase.rpc(
    "resolve_current_candidate_vacancy_match",
    { p_vacancy_id: parsedId.data },
  );
  if (matchError !== null) {
    return { status: "failure" };
  }
  if (!Array.isArray(matchData) || matchData.length === 0) {
    return { status: "failure" };
  }
  const parsedMatch = candidateMatchRowSchema.safeParse(matchData[0]);
  if (!parsedMatch.success) {
    return { status: "failure" };
  }

  if (parsedMatch.data.status === "unavailable") {
    return { status: "unavailable" };
  }
  if (parsedMatch.data.status === "incomplete") {
    return { status: "incomplete" };
  }

  const eligible = parsedMatch.data.eligible;
  const missingRequirements = parseMissingRequirementCodes(
    parsedMatch.data.missing_requirements,
  );
  if (eligible === null || missingRequirements === null) {
    // Malformed eligibility payload for an eligible/ineligible status —
    // never turn this into an eligibility claim.
    return { status: "failure" };
  }

  const [publicResult, languagesResult] = await Promise.all([
    supabase.rpc("get_effective_public_vacancy", {
      p_vacancy_id: parsedId.data,
    }),
    supabase.rpc("get_effective_public_vacancy_languages", {
      p_vacancy_id: parsedId.data,
    }),
  ]);

  if (publicResult.error !== null || languagesResult.error !== null) {
    return { status: "failure" };
  }
  if (!Array.isArray(publicResult.data) || publicResult.data.length === 0) {
    // Inconsistent with the eligibility RPC's own effective-public gate
    // (e.g. a race between the two calls) — never claim eligibility for a
    // vacancy the public projection no longer confirms.
    return { status: "unavailable" };
  }
  const parsedVacancy = publicVacancyRowSchema.safeParse(publicResult.data[0]);
  if (!parsedVacancy.success) {
    return { status: "failure" };
  }
  const parsedLanguages = publicVacancyLanguageListSchema.safeParse(
    languagesResult.data,
  );
  if (!parsedLanguages.success) {
    return { status: "failure" };
  }

  const { data: applicationRow, error: applicationError } = await supabase
    .from("applications")
    .select("id, vacancy_id, status, submitted_at")
    .eq("vacancy_id", parsedId.data)
    .maybeSingle();
  if (applicationError !== null) {
    return { status: "failure" };
  }
  let application: OwnedApplicationSummary | null = null;
  if (applicationRow !== null) {
    application = mapOwnedApplicationSummary(applicationRow);
    if (application === null) {
      return { status: "failure" };
    }
  }

  return {
    status: "ready",
    eligible,
    missingRequirements,
    vacancy: mapPublicVacancy(parsedVacancy.data),
    languages: parsedLanguages.data.map(mapPublicVacancyLanguage),
    application,
  };
}
