import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  MatchingInvariantError,
  mapCandidateMatchingInput,
  mapVacancyRowForMatcherEligibility,
  type CandidateLanguageRow,
  type CandidateProfileRow,
} from "@/lib/matching/map-database-records";
import { matchCandidateToVacancy } from "@/lib/matching/match-candidate-to-vacancy";
import type {
  CandidateMatch,
  CandidateMatchingInput,
} from "@/lib/matching/types";
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

/** Profile row used for matching plus application preview fields. */
export type CandidateApplicationProfileRow = CandidateProfileRow & {
  display_name: string;
  work_authorisation_declared: boolean | null;
};

export type ResolveCandidateVacancyMatchResult =
  | { status: "unauthenticated" }
  | { status: "profile_missing" }
  | { status: "incomplete" }
  | { status: "unavailable" }
  | { status: "not_matching" }
  | {
      status: "ready";
      match: CandidateMatch;
      candidate: CandidateMatchingInput;
      displayName: string;
      workAuthorisationDeclared: boolean | null;
    }
  | { status: "failure"; reason: "load" | "invariant" };

export type CandidateVacancyMatchDataAccess = {
  getUserId: () => Promise<string | null>;
  loadCandidateProfile: (
    userId: string,
  ) => Promise<
    | { ok: true; profile: CandidateApplicationProfileRow }
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
  loadOwnedApplicationForVacancy: (
    vacancyId: string,
  ) => Promise<{ ok: true; application: unknown | null } | { ok: false }>;
};

export function createSupabaseCandidateVacancyMatchDataAccess(
  supabase: SupabaseClient<Database>,
): CandidateVacancyMatchDataAccess {
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
          "display_name, city, german_comfort, work_authorisation_declared, job_categories, employment_types, shift_preferences, available_from, onboarding_completed_at",
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

    async loadOwnedApplicationForVacancy(vacancyId) {
      const { data, error } = await supabase
        .from("applications")
        .select("id, vacancy_id, status, submitted_at")
        .eq("vacancy_id", vacancyId)
        .maybeSingle();

      if (error !== null) {
        return { ok: false };
      }
      return { ok: true, application: data };
    },
  };
}

/**
 * Shared server-only resolution: Auth session, completion, RLS-visible vacancy,
 * and the product TypeScript matcher. Does not call the submission RPC.
 */
export async function resolveCandidateVacancyMatch(
  vacancyId: string,
  dataAccess?: CandidateVacancyMatchDataAccess,
): Promise<ResolveCandidateVacancyMatchResult> {
  const parsedId = vacancyIdSchema.safeParse(vacancyId);
  if (!parsedId.success) {
    return { status: "unavailable" };
  }

  const access =
    dataAccess ??
    createSupabaseCandidateVacancyMatchDataAccess(
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
      match,
      candidate,
      displayName: profileResult.profile.display_name,
      workAuthorisationDeclared:
        profileResult.profile.work_authorisation_declared,
    };
  } catch (error) {
    if (error instanceof MatchingInvariantError) {
      return { status: "failure", reason: "invariant" };
    }
    return { status: "failure", reason: "load" };
  }
}
