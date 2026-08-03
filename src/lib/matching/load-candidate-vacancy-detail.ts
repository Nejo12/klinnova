import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  buildCandidateVacancyDetail,
  type CandidateVacancyDetail,
} from "@/lib/matching/candidate-vacancy-detail";
import {
  MatchingInvariantError,
  mapCandidateMatchingInput,
  mapVacancyRowForMatcherEligibility,
  type CandidateLanguageRow,
  type CandidateProfileRow,
} from "@/lib/matching/map-database-records";
import { matchCandidateToVacancy } from "@/lib/matching/match-candidate-to-vacancy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const vacancyIdSchema = z.string().uuid();

const VACANCY_SELECT = `
  id,
  title,
  slug,
  city,
  job_category,
  employment_types,
  shift_requirements,
  german_requirement,
  available_from,
  published_at,
  expires_at,
  source,
  publication_state,
  companies (
    id,
    name,
    slug,
    source
  )
`;

export type LoadCandidateVacancyDetailResult =
  | { status: "unauthenticated" }
  | { status: "profile_missing" }
  | { status: "incomplete" }
  | { status: "unavailable" }
  | { status: "not_matching" }
  | { status: "ready"; detail: CandidateVacancyDetail }
  | { status: "failure"; reason: "load" | "invariant" };

export type CandidateVacancyDetailDataAccess = {
  getUserId: () => Promise<string | null>;
  loadCandidateProfile: (
    userId: string,
  ) => Promise<
    | { ok: true; profile: CandidateProfileRow }
    | { ok: false; reason: "missing" | "error" }
  >;
  loadCandidateLanguages: (
    userId: string,
  ) => Promise<{ ok: true; languages: CandidateLanguageRow[] } | { ok: false }>;
  loadVisibleVacancyById: (
    vacancyId: string,
  ) => Promise<
    { ok: true; vacancy: unknown } | { ok: false; reason: "missing" | "error" }
  >;
  loadVisibleLanguageRequirementsForVacancy: (
    vacancyId: string,
  ) => Promise<{ ok: true; requirements: unknown[] } | { ok: false }>;
};

export function createSupabaseCandidateVacancyDetailDataAccess(
  supabase: SupabaseClient<Database>,
): CandidateVacancyDetailDataAccess {
  return {
    async getUserId() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error !== null || user === null) {
        return null;
      }
      return user.id;
    },

    async loadCandidateProfile(userId) {
      const { data, error } = await supabase
        .from("candidate_profiles")
        .select(
          "city, german_comfort, job_categories, employment_types, shift_preferences, available_from, onboarding_completed_at",
        )
        .eq("id", userId)
        .maybeSingle();

      if (error !== null) {
        return { ok: false, reason: "error" };
      }
      if (data === null) {
        return { ok: false, reason: "missing" };
      }
      return { ok: true, profile: data };
    },

    async loadCandidateLanguages(userId) {
      const { data, error } = await supabase
        .from("candidate_languages")
        .select("language_code, proficiency")
        .eq("candidate_id", userId);

      if (error !== null) {
        return { ok: false };
      }
      return { ok: true, languages: data ?? [] };
    },

    async loadVisibleVacancyById(vacancyId) {
      const { data, error } = await supabase
        .from("vacancies")
        .select(VACANCY_SELECT)
        .eq("id", vacancyId)
        .maybeSingle();

      if (error !== null) {
        return { ok: false, reason: "error" };
      }
      if (data === null) {
        return { ok: false, reason: "missing" };
      }
      return { ok: true, vacancy: data };
    },

    async loadVisibleLanguageRequirementsForVacancy(vacancyId) {
      const { data, error } = await supabase
        .from("vacancy_language_requirements")
        .select("vacancy_id, language_code, min_proficiency")
        .eq("vacancy_id", vacancyId);

      if (error !== null) {
        return { ok: false };
      }
      return { ok: true, requirements: data ?? [] };
    },
  };
}

/**
 * Authenticated server loader for one candidate vacancy detail.
 * Candidate identity comes only from the verified session.
 * Incomplete onboarding stops before vacancy queries.
 * Matching uses the existing TypeScript matcher (no SQL matcher).
 */
export async function loadCandidateVacancyDetail(
  vacancyId: string,
  dataAccess?: CandidateVacancyDetailDataAccess,
): Promise<LoadCandidateVacancyDetailResult> {
  const parsedId = vacancyIdSchema.safeParse(vacancyId);
  if (!parsedId.success) {
    return { status: "unavailable" };
  }

  const access =
    dataAccess ??
    createSupabaseCandidateVacancyDetailDataAccess(
      await createServerSupabaseClient(),
    );

  const userId = await access.getUserId();
  if (userId === null) {
    return { status: "unauthenticated" };
  }

  const profileResult = await access.loadCandidateProfile(userId);
  if (!profileResult.ok) {
    return profileResult.reason === "missing"
      ? { status: "profile_missing" }
      : { status: "failure", reason: "load" };
  }

  const languagesResult = await access.loadCandidateLanguages(userId);
  if (!languagesResult.ok) {
    return { status: "failure", reason: "load" };
  }

  if (profileResult.profile.onboarding_completed_at === null) {
    return { status: "incomplete" };
  }

  const vacancyResult = await access.loadVisibleVacancyById(parsedId.data);
  if (!vacancyResult.ok) {
    return vacancyResult.reason === "missing"
      ? { status: "unavailable" }
      : { status: "failure", reason: "load" };
  }

  const requirementsResult =
    await access.loadVisibleLanguageRequirementsForVacancy(parsedId.data);
  if (!requirementsResult.ok) {
    return { status: "failure", reason: "load" };
  }

  try {
    const candidate = mapCandidateMatchingInput(
      profileResult.profile,
      languagesResult.languages,
    );
    const vacancy = mapVacancyRowForMatcherEligibility(
      vacancyResult.vacancy,
      requirementsResult.requirements,
    );

    const match = matchCandidateToVacancy(candidate, vacancy);
    if (match === null) {
      return { status: "not_matching" };
    }

    return {
      status: "ready",
      detail: buildCandidateVacancyDetail(match),
    };
  } catch (error) {
    if (error instanceof MatchingInvariantError) {
      return { status: "failure", reason: "invariant" };
    }
    return { status: "failure", reason: "load" };
  }
}
