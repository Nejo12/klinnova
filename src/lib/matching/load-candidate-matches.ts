import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

import { mapOwnedApplicationsByVacancyId } from "@/lib/applications/owned-application";
import {
  MatchingInvariantError,
  mapCandidateMatchingInput,
  mapVacanciesMatchingInput,
  type CandidateLanguageRow,
  type CandidateProfileRow,
} from "@/lib/matching/map-database-records";
import { matchCandidateToVacancies } from "@/lib/matching/match-candidate-to-vacancies";
import type { LoadCandidateMatchesResult } from "@/lib/matching/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type CandidateMatchesDataAccess = {
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
  loadVisibleVacancies: () => Promise<
    { ok: true; vacancies: unknown[] } | { ok: false }
  >;
  loadVisibleLanguageRequirements: () => Promise<
    { ok: true; requirements: unknown[] } | { ok: false }
  >;
  loadOwnedApplicationsForVacancies: (
    vacancyIds: readonly string[],
  ) => Promise<{ ok: true; applications: unknown[] } | { ok: false }>;
};

const VACANCY_SELECT = `
  id,
  title,
  slug,
  summary,
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

export function createSupabaseCandidateMatchesDataAccess(
  supabase: SupabaseClient<Database>,
): CandidateMatchesDataAccess {
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

    async loadVisibleVacancies() {
      const { data, error } = await supabase
        .from("vacancies")
        .select(VACANCY_SELECT);

      if (error !== null) {
        return { ok: false };
      }
      return { ok: true, vacancies: data ?? [] };
    },

    async loadVisibleLanguageRequirements() {
      const { data, error } = await supabase
        .from("vacancy_language_requirements")
        .select("vacancy_id, language_code, min_proficiency");

      if (error !== null) {
        return { ok: false };
      }
      return { ok: true, requirements: data ?? [] };
    },

    async loadOwnedApplicationsForVacancies(vacancyIds) {
      if (vacancyIds.length === 0) {
        return { ok: true, applications: [] };
      }

      const { data, error } = await supabase
        .from("applications")
        .select("id, vacancy_id, status, submitted_at")
        .in("vacancy_id", [...vacancyIds]);

      if (error !== null) {
        return { ok: false };
      }
      return { ok: true, applications: data ?? [] };
    },
  };
}

/**
 * Authenticated server loader for Slice 2 matches.
 * Candidate identity comes only from the verified session.
 * Incomplete onboarding stops before vacancy inventory queries.
 * Owned applications are loaded in one batched query after matching.
 */
export async function loadCandidateMatches(
  dataAccess?: CandidateMatchesDataAccess,
): Promise<LoadCandidateMatchesResult> {
  const access =
    dataAccess ??
    createSupabaseCandidateMatchesDataAccess(
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
    return { status: "onboarding_incomplete" };
  }

  const vacanciesResult = await access.loadVisibleVacancies();
  if (!vacanciesResult.ok) {
    return { status: "failure", reason: "load" };
  }

  const requirementsResult = await access.loadVisibleLanguageRequirements();
  if (!requirementsResult.ok) {
    return { status: "failure", reason: "load" };
  }

  try {
    const candidate = mapCandidateMatchingInput(
      profileResult.profile,
      languagesResult.languages,
    );
    const vacancies = mapVacanciesMatchingInput(
      vacanciesResult.vacancies,
      requirementsResult.requirements,
    );
    const matches = matchCandidateToVacancies(candidate, vacancies);
    const vacancyIds = matches.map((match) => match.vacancy.id);
    const applicationsResult =
      await access.loadOwnedApplicationsForVacancies(vacancyIds);
    if (!applicationsResult.ok) {
      return { status: "failure", reason: "load" };
    }

    const applicationsByVacancyId = mapOwnedApplicationsByVacancyId(
      applicationsResult.applications,
    );
    if (applicationsByVacancyId === null) {
      return { status: "failure", reason: "load" };
    }

    return {
      status: "success",
      matches,
      applicationsByVacancyId,
    };
  } catch (error) {
    if (error instanceof MatchingInvariantError) {
      return { status: "failure", reason: "invariant" };
    }
    return { status: "failure", reason: "load" };
  }
}
