import {
  EMPLOYMENT_TYPE_OPTIONS,
  GERMAN_COMFORT_OPTIONS,
  JOB_CATEGORY_OPTIONS,
  ONBOARDING_GROUP_LABELS,
  SHIFT_PREFERENCE_OPTIONS,
  TRAVEL_TIME_OPTIONS,
  type OnboardingGroupId,
} from "@/lib/onboarding/allow-lists";
import type { ProgressLanguage, ProgressProfile } from "@/lib/onboarding/progress";

export function formatReviewRow(
  group: OnboardingGroupId,
  profile: ProgressProfile,
  languages: readonly ProgressLanguage[],
): { label: string; value: string } {
  const label = ONBOARDING_GROUP_LABELS[group];

  switch (group) {
    case "languages": {
      const comfortOption = GERMAN_COMFORT_OPTIONS.find(
        (opt) => opt.code === profile.germanComfort,
      );
      const value = comfortOption?.label ?? "Not answered";
      return { label, value };
    }

    case "work_authorisation": {
      if (profile.workAuthorisationDeclared === true) {
        return { label, value: "Yes" };
      }
      if (profile.workAuthorisationDeclared === false) {
        return { label, value: "Not sure" };
      }
      return { label, value: "Not answered" };
    }

    case "location": {
      if (!profile.city || !profile.travelRadiusMinutes) {
        return { label, value: "Not answered" };
      }
      return {
        label,
        value: `${profile.city} · up to ${profile.travelRadiusMinutes} minutes travel`,
      };
    }

    case "categories": {
      if (profile.jobCategories.length === 0) {
        return { label, value: "Not answered" };
      }
      const categoryLabels = profile.jobCategories
        .map((code) => JOB_CATEGORY_OPTIONS.find((opt) => opt.code === code)?.label)
        .filter((label) => label !== undefined) as string[];
      return { label, value: categoryLabels.join(", ") };
    }

    case "availability": {
      if (!profile.availableFrom) {
        return { label, value: "Not answered" };
      }
      return { label, value: profile.availableFrom };
    }

    case "employment": {
      const employmentLabels = profile.employmentTypes
        .map((code) => EMPLOYMENT_TYPE_OPTIONS.find((opt) => opt.code === code)?.label)
        .filter((label) => label !== undefined) as string[];

      const shiftLabels = profile.shiftPreferences
        .map((code) => SHIFT_PREFERENCE_OPTIONS.find((opt) => opt.code === code)?.label)
        .filter((label) => label !== undefined) as string[];

      if (employmentLabels.length === 0 && shiftLabels.length === 0) {
        return { label, value: "Not answered" };
      }

      const employmentPart = employmentLabels.join(", ");
      const shiftPart = shiftLabels.join(", ");
      const value =
        employmentPart && shiftPart
          ? `${employmentPart} · ${shiftPart}`
          : employmentPart || shiftPart;
      return { label, value };
    }

    default: {
      const _exhaustive: never = group;
      return _exhaustive;
    }
  }
}
