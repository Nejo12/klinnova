import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

import { ensureCandidateProfile } from "@/lib/auth/ensure-candidate-profile";
import {
  computeOnboardingProgress,
  type OnboardingProgress,
  type ProgressLanguage,
  type ProgressProfile,
} from "@/lib/onboarding/progress";
import type { Database } from "@/types/database";

export type CandidateLanguageRow = {
  id: string;
  languageCode: string;
  proficiency: string;
};

export type LoadedCandidateOnboarding = {
  displayName: string;
  profile: ProgressProfile & {
    onboardingCompletedAt: string | null;
    workAuthorisationDeclaredAt: string | null;
  };
  languages: CandidateLanguageRow[];
  progress: OnboardingProgress;
};

export type LoadCandidateResult =
  | { ok: true; data: LoadedCandidateOnboarding }
  | { ok: false; reason: "unauthenticated" | "profile" | "load" };

/**
 * Ensure profile exists, then load owner profile + languages for onboarding.
 */
export async function loadCandidateOnboarding(
  supabase: SupabaseClient<Database>,
): Promise<LoadCandidateResult> {
  const ensured = await ensureCandidateProfile(supabase);
  if (!ensured.ok) {
    return {
      ok: false,
      reason:
        ensured.reason === "unauthenticated" ? "unauthenticated" : "profile",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    return { ok: false, reason: "unauthenticated" };
  }

  const [profileResult, languagesResult] = await Promise.all([
    supabase
      .from("candidate_profiles")
      .select(
        "display_name, german_comfort, work_authorisation_declared, work_authorisation_declared_at, city, travel_radius_minutes, job_categories, available_from, employment_types, shift_preferences, onboarding_completed_at",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("candidate_languages")
      .select("id, language_code, proficiency")
      .eq("candidate_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (profileResult.error !== null || profileResult.data === null) {
    return { ok: false, reason: "load" };
  }
  if (languagesResult.error !== null) {
    return { ok: false, reason: "load" };
  }

  const row = profileResult.data;
  const profile: ProgressProfile & {
    onboardingCompletedAt: string | null;
    workAuthorisationDeclaredAt: string | null;
  } = {
    germanComfort: row.german_comfort,
    workAuthorisationDeclared: row.work_authorisation_declared,
    city: row.city,
    travelRadiusMinutes: row.travel_radius_minutes,
    jobCategories: row.job_categories,
    availableFrom: row.available_from,
    employmentTypes: row.employment_types,
    shiftPreferences: row.shift_preferences,
    onboardingCompletedAt: row.onboarding_completed_at,
    workAuthorisationDeclaredAt: row.work_authorisation_declared_at,
  };

  const languages: CandidateLanguageRow[] = (languagesResult.data ?? []).map(
    (language) => ({
      id: language.id,
      languageCode: language.language_code,
      proficiency: language.proficiency,
    }),
  );

  const progressLanguages: ProgressLanguage[] = languages.map((language) => ({
    languageCode: language.languageCode,
    proficiency: language.proficiency,
  }));

  return {
    ok: true,
    data: {
      displayName: row.display_name,
      profile,
      languages,
      progress: computeOnboardingProgress(profile, progressLanguages),
    },
  };
}
