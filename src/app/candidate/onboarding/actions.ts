"use server";

import { redirect } from "next/navigation";

import { completeOnboardingResultSchema } from "@/lib/onboarding/completion";
import {
  ONBOARDING_COMPLETE_FAILURE,
  ONBOARDING_GENERIC_FAILURE,
  ONBOARDING_SESSION_EXPIRED,
} from "@/lib/onboarding/messages";
import {
  nextOnboardingGroup,
  onboardingGroupHref,
} from "@/lib/onboarding/navigation";
import {
  availabilityGroupSchema,
  categoriesGroupSchema,
  employmentGroupSchema,
  languagesGroupSaveSchema,
  locationGroupSchema,
  mapWorkAuthorisationToBoolean,
  workAuthorisationGroupSchema,
} from "@/lib/onboarding/schemas";
import { syncCandidateLanguages } from "@/lib/onboarding/sync-languages";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OnboardingActionState = {
  error: string | null;
  message: string | null;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formStringArray(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

async function requireAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    return { supabase, user: null as null };
  }

  return { supabase, user };
}

export async function saveLanguagesGroupAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const languageCodes = formStringArray(formData, "languageCode");
  const proficiencies = formStringArray(formData, "proficiency");
  const languages = languageCodes.map((languageCode, index) => ({
    languageCode,
    proficiency: proficiencies[index] ?? "",
  }));

  const parsed = languagesGroupSaveSchema.safeParse({
    germanComfort: formString(formData, "germanComfort"),
    languages,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? ONBOARDING_GENERIC_FAILURE,
      message: null,
    };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  if (user === null) {
    return { error: ONBOARDING_SESSION_EXPIRED, message: null };
  }

  const now = new Date().toISOString();
  const { error: profileError } = await supabase
    .from("candidate_profiles")
    .update({
      german_comfort: parsed.data.germanComfort,
      updated_at: now,
    })
    .eq("id", user.id);

  if (profileError !== null) {
    return { error: ONBOARDING_GENERIC_FAILURE, message: null };
  }

  const synced = await syncCandidateLanguages(
    supabase,
    user.id,
    parsed.data.languages,
  );
  if (!synced.ok) {
    return { error: ONBOARDING_GENERIC_FAILURE, message: null };
  }

  redirect(onboardingGroupHref(nextOnboardingGroup("languages")));
}

export async function saveWorkAuthorisationGroupAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const parsed = workAuthorisationGroupSchema.safeParse({
    workAuthorisationDeclared: formString(
      formData,
      "workAuthorisationDeclared",
    ),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? ONBOARDING_GENERIC_FAILURE,
      message: null,
    };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  if (user === null) {
    return { error: ONBOARDING_SESSION_EXPIRED, message: null };
  }

  const { error } = await supabase
    .from("candidate_profiles")
    .update({
      work_authorisation_declared: mapWorkAuthorisationToBoolean(
        parsed.data.workAuthorisationDeclared,
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error !== null) {
    return { error: ONBOARDING_GENERIC_FAILURE, message: null };
  }

  redirect(onboardingGroupHref(nextOnboardingGroup("work_authorisation")));
}

export async function saveLocationGroupAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const parsed = locationGroupSchema.safeParse({
    city: formString(formData, "city") || "Berlin",
    travelRadiusMinutes: formString(formData, "travelRadiusMinutes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? ONBOARDING_GENERIC_FAILURE,
      message: null,
    };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  if (user === null) {
    return { error: ONBOARDING_SESSION_EXPIRED, message: null };
  }

  const { error } = await supabase
    .from("candidate_profiles")
    .update({
      city: parsed.data.city,
      travel_radius_minutes: parsed.data.travelRadiusMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error !== null) {
    return { error: ONBOARDING_GENERIC_FAILURE, message: null };
  }

  redirect(onboardingGroupHref(nextOnboardingGroup("location")));
}

export async function saveCategoriesGroupAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const parsed = categoriesGroupSchema.safeParse({
    jobCategories: formStringArray(formData, "jobCategories"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? ONBOARDING_GENERIC_FAILURE,
      message: null,
    };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  if (user === null) {
    return { error: ONBOARDING_SESSION_EXPIRED, message: null };
  }

  const { error } = await supabase
    .from("candidate_profiles")
    .update({
      job_categories: parsed.data.jobCategories,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error !== null) {
    return { error: ONBOARDING_GENERIC_FAILURE, message: null };
  }

  redirect(onboardingGroupHref(nextOnboardingGroup("categories")));
}

export async function saveAvailabilityGroupAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const parsed = availabilityGroupSchema.safeParse({
    availableFrom: formString(formData, "availableFrom"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? ONBOARDING_GENERIC_FAILURE,
      message: null,
    };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  if (user === null) {
    return { error: ONBOARDING_SESSION_EXPIRED, message: null };
  }

  const { error } = await supabase
    .from("candidate_profiles")
    .update({
      available_from: parsed.data.availableFrom,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error !== null) {
    return { error: ONBOARDING_GENERIC_FAILURE, message: null };
  }

  redirect(onboardingGroupHref(nextOnboardingGroup("availability")));
}

export async function saveEmploymentGroupAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const parsed = employmentGroupSchema.safeParse({
    employmentTypes: formStringArray(formData, "employmentTypes"),
    shiftPreferences: formStringArray(formData, "shiftPreferences"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? ONBOARDING_GENERIC_FAILURE,
      message: null,
    };
  }

  const { supabase, user } = await requireAuthenticatedUser();
  if (user === null) {
    return { error: ONBOARDING_SESSION_EXPIRED, message: null };
  }

  const { error } = await supabase
    .from("candidate_profiles")
    .update({
      employment_types: parsed.data.employmentTypes,
      shift_preferences: parsed.data.shiftPreferences,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error !== null) {
    return { error: ONBOARDING_GENERIC_FAILURE, message: null };
  }

  redirect(onboardingGroupHref(nextOnboardingGroup("employment")));
}

/**
 * Authoritative completion: RPC validates persisted DB state under a profile
 * row lock, then sets protected timestamps. DB triggers own invalidation.
 */
export async function completeOnboardingAction(
  prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  void prev;
  void formData;
  const { supabase, user } = await requireAuthenticatedUser();
  if (user === null) {
    return { error: ONBOARDING_SESSION_EXPIRED, message: null };
  }

  const { data, error } = await supabase.rpc("complete_candidate_onboarding");
  if (error !== null || data === null) {
    return { error: ONBOARDING_COMPLETE_FAILURE, message: null };
  }

  const parsed = completeOnboardingResultSchema.safeParse(data);
  if (!parsed.success) {
    return { error: ONBOARDING_COMPLETE_FAILURE, message: null };
  }

  switch (parsed.data.status) {
    case "unauthenticated":
      return { error: ONBOARDING_SESSION_EXPIRED, message: null };
    case "missing_profile":
      return { error: ONBOARDING_COMPLETE_FAILURE, message: null };
    case "incomplete":
      redirect(onboardingGroupHref(parsed.data.first_incomplete_group));
    case "completed":
      redirect("/candidate");
    default: {
      const _exhaustive: never = parsed.data;
      return _exhaustive;
    }
  }
}
