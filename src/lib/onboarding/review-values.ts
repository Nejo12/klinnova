import {
  EMPLOYMENT_TYPE_OPTIONS,
  GERMAN_COMFORT_OPTIONS,
  JOB_CATEGORY_OPTIONS,
  LANGUAGE_OPTIONS,
  LANGUAGE_PROFICIENCY_OPTIONS,
  ONBOARDING_GROUP_LABELS,
  SHIFT_PREFERENCE_OPTIONS,
  type OnboardingGroupId,
} from "@/lib/onboarding/allow-lists";
import type {
  ProgressLanguage,
  ProgressProfile,
} from "@/lib/onboarding/progress";
import type { Locale } from "@/lib/i18n/locale";
import {
  employmentTypeLabel,
  germanComfortLabel,
  jobCategoryLabel,
  languageLabel,
  languageProficiencyLabel,
  shiftLabel,
} from "@/lib/matching/labels";

function formatAvailableFromDate(isoDate: string, locale: Locale): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return locale === "de" ? "Nicht beantwortet" : "Not answered";
  }
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

export function formatReviewRow(
  group: OnboardingGroupId,
  profile: ProgressProfile,
  languages: readonly ProgressLanguage[],
  locale: Locale = "en",
): { label: string; value: string } {
  const label = ONBOARDING_GROUP_LABELS[group];

  switch (group) {
    case "languages": {
      const comfortOption = GERMAN_COMFORT_OPTIONS.find(
        (opt) => opt.code === profile.germanComfort,
      );
      const comfortValue = comfortOption
        ? germanComfortLabel(comfortOption.code, locale)
        : locale === "de"
          ? "Nicht beantwortet"
          : "Not answered";

      const languageLabels = languages
        .map((language) => {
          const languageOption = LANGUAGE_OPTIONS.find(
            (opt) => opt.code === language.languageCode,
          );
          if (languageOption === undefined) {
            return undefined;
          }
          const proficiencyOption = LANGUAGE_PROFICIENCY_OPTIONS.find(
            (opt) => opt.code === language.proficiency,
          );
          return proficiencyOption !== undefined
            ? `${languageLabel(languageOption.code, locale)} (${languageProficiencyLabel(
                proficiencyOption.code,
                locale,
              )})`
            : languageLabel(languageOption.code, locale);
        })
        .filter((entry): entry is string => entry !== undefined);

      const value =
        languageLabels.length > 0
          ? `${languageLabels.join(", ")} · ${comfortValue}`
          : comfortValue;

      return { label, value };
    }

    case "work_authorisation": {
      if (profile.workAuthorisationDeclared === true) {
        return { label, value: locale === "de" ? "Ja" : "Yes" };
      }
      if (profile.workAuthorisationDeclared === false) {
        return { label, value: locale === "de" ? "Nicht sicher" : "Not sure" };
      }
      return {
        label,
        value: locale === "de" ? "Nicht beantwortet" : "Not answered",
      };
    }

    case "location": {
      if (profile.city === null || profile.travelRadiusMinutes === null) {
        return {
          label,
          value: locale === "de" ? "Nicht beantwortet" : "Not answered",
        };
      }
      return {
        label,
        value:
          locale === "de"
            ? `${profile.city} · bis zu ${profile.travelRadiusMinutes} Minuten Fahrtzeit`
            : `${profile.city} · up to ${profile.travelRadiusMinutes} minutes travel`,
      };
    }

    case "categories": {
      if (profile.jobCategories.length === 0) {
        return {
          label,
          value: locale === "de" ? "Nicht beantwortet" : "Not answered",
        };
      }
      const categoryLabels = profile.jobCategories
        .map(
          (code) => JOB_CATEGORY_OPTIONS.find((opt) => opt.code === code)?.code,
        )
        .filter(
          (entry): entry is Exclude<typeof entry, undefined> =>
            entry !== undefined,
        );
      return {
        label,
        value: categoryLabels
          .map((code) => jobCategoryLabel(code, locale))
          .join(", "),
      };
    }

    case "availability": {
      if (!profile.availableFrom) {
        return {
          label,
          value: locale === "de" ? "Nicht beantwortet" : "Not answered",
        };
      }
      return {
        label,
        value: formatAvailableFromDate(profile.availableFrom, locale),
      };
    }

    case "employment": {
      const employmentLabels = profile.employmentTypes
        .map(
          (code) =>
            EMPLOYMENT_TYPE_OPTIONS.find((opt) => opt.code === code)?.code,
        )
        .filter(
          (entry): entry is Exclude<typeof entry, undefined> =>
            entry !== undefined,
        );

      const shiftLabels = profile.shiftPreferences
        .map(
          (code) =>
            SHIFT_PREFERENCE_OPTIONS.find((opt) => opt.code === code)?.code,
        )
        .filter(
          (entry): entry is Exclude<typeof entry, undefined> =>
            entry !== undefined,
        );

      if (employmentLabels.length === 0 && shiftLabels.length === 0) {
        return {
          label,
          value: locale === "de" ? "Nicht beantwortet" : "Not answered",
        };
      }

      const employmentPart = employmentLabels
        .map((code) => employmentTypeLabel(code, locale))
        .join(", ");
      const shiftPart = shiftLabels
        .map((code) => shiftLabel(code, locale))
        .join(", ");
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
