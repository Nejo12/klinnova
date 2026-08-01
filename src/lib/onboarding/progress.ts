import {
  EMPLOYMENT_TYPE_CODES,
  GERMAN_COMFORT_CODES,
  JOB_CATEGORY_CODES,
  LANGUAGE_CODES,
  LANGUAGE_PROFICIENCY_CODES,
  ONBOARDING_GROUPS,
  type OnboardingGroupId,
  SHIFT_PREFERENCE_CODES,
  TRAVEL_TIME_MINUTES,
} from "@/lib/onboarding/allow-lists";
import { berlinTodayIso } from "@/lib/onboarding/schemas";

export type ProgressLanguage = {
  languageCode: string;
  proficiency: string;
};

export type ProgressProfile = {
  germanComfort: string | null;
  workAuthorisationDeclared: boolean | null;
  city: string | null;
  travelRadiusMinutes: number | null;
  jobCategories: string[];
  availableFrom: string | null;
  employmentTypes: string[];
  shiftPreferences: string[];
};

export type OnboardingProgress = {
  completeGroups: OnboardingGroupId[];
  incompleteGroups: OnboardingGroupId[];
  firstIncompleteGroup: OnboardingGroupId | null;
  completeCount: number;
  totalGroups: number;
  essentialsValid: boolean;
};

function isGermanComfort(value: string | null): boolean {
  return (
    value !== null &&
    (GERMAN_COMFORT_CODES as readonly string[]).includes(value)
  );
}

function isTravelTime(value: number | null): boolean {
  return (
    value !== null && (TRAVEL_TIME_MINUTES as readonly number[]).includes(value)
  );
}

function everyInAllowList(
  values: string[],
  allowList: readonly string[],
): boolean {
  return (
    values.length > 0 &&
    values.every((value) => allowList.includes(value)) &&
    new Set(values).size === values.length
  );
}

function languagesComplete(languages: readonly ProgressLanguage[]): boolean {
  if (languages.length === 0) {
    return false;
  }
  const codes = languages.map((language) => language.languageCode);
  if (new Set(codes).size !== codes.length) {
    return false;
  }
  return languages.every(
    (language) =>
      (LANGUAGE_CODES as readonly string[]).includes(language.languageCode) &&
      (LANGUAGE_PROFICIENCY_CODES as readonly string[]).includes(
        language.proficiency,
      ),
  );
}

function isAvailableFromValid(
  value: string | null,
  today = berlinTodayIso(),
): boolean {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  return value >= today;
}

export function isGroupComplete(
  group: OnboardingGroupId,
  profile: ProgressProfile,
  languages: readonly ProgressLanguage[],
  today = berlinTodayIso(),
): boolean {
  switch (group) {
    case "languages":
      return (
        isGermanComfort(profile.germanComfort) && languagesComplete(languages)
      );
    case "work_authorisation":
      // Completion requires an affirmative declaration (true).
      return profile.workAuthorisationDeclared === true;
    case "location":
      return (
        profile.city === "Berlin" && isTravelTime(profile.travelRadiusMinutes)
      );
    case "categories":
      return everyInAllowList(profile.jobCategories, JOB_CATEGORY_CODES);
    case "availability":
      return isAvailableFromValid(profile.availableFrom, today);
    case "employment":
      return (
        everyInAllowList(profile.employmentTypes, EMPLOYMENT_TYPE_CODES) &&
        everyInAllowList(profile.shiftPreferences, SHIFT_PREFERENCE_CODES)
      );
    default: {
      const _exhaustive: never = group;
      return _exhaustive;
    }
  }
}

/**
 * Derives onboarding progress from persisted profile + languages only.
 * Does not read or write `onboarding_completed_at`.
 */
export function computeOnboardingProgress(
  profile: ProgressProfile,
  languages: readonly ProgressLanguage[],
  today = berlinTodayIso(),
): OnboardingProgress {
  const completeGroups = ONBOARDING_GROUPS.filter((group) =>
    isGroupComplete(group, profile, languages, today),
  );
  const incompleteGroups = ONBOARDING_GROUPS.filter(
    (group) => !completeGroups.includes(group),
  );
  const essentialsValid = incompleteGroups.length === 0;

  return {
    completeGroups: [...completeGroups],
    incompleteGroups: [...incompleteGroups],
    firstIncompleteGroup: incompleteGroups[0] ?? null,
    completeCount: completeGroups.length,
    totalGroups: ONBOARDING_GROUPS.length,
    essentialsValid,
  };
}

export function resolveOnboardingGroupParam(
  value: string | null | undefined,
): OnboardingGroupId | "review" | null {
  if (value === "review") {
    return "review";
  }
  if (
    value !== null &&
    value !== undefined &&
    (ONBOARDING_GROUPS as readonly string[]).includes(value)
  ) {
    return value as OnboardingGroupId;
  }
  return null;
}
