/** D-025 — Slice 1 onboarding allow-lists (stable codes + candidate-facing copy). */

export const GERMAN_COMFORT_OPTIONS = [
  { code: "none", label: "I do not speak German yet" },
  { code: "basic", label: "I can understand and use some basic German" },
  {
    code: "conversational",
    label: "I can handle everyday conversations",
  },
  { code: "comfortable", label: "I am comfortable working in German" },
] as const;

export type GermanComfortCode = (typeof GERMAN_COMFORT_OPTIONS)[number]["code"];

export const TRAVEL_TIME_OPTIONS = [
  { minutes: 15, label: "Up to 15 minutes one way" },
  { minutes: 30, label: "Up to 30 minutes one way" },
  { minutes: 45, label: "Up to 45 minutes one way" },
  { minutes: 60, label: "Up to 60 minutes one way" },
] as const;

export type TravelTimeMinutes = (typeof TRAVEL_TIME_OPTIONS)[number]["minutes"];

export const JOB_CATEGORY_OPTIONS = [
  { code: "cleaning", label: "Cleaning" },
  { code: "hospitality", label: "Hospitality" },
  { code: "logistics", label: "Logistics" },
  { code: "warehousing", label: "Warehousing" },
  { code: "food_production", label: "Food production" },
  { code: "moving", label: "Moving" },
  { code: "retail", label: "Retail" },
] as const;

export type JobCategoryCode = (typeof JOB_CATEGORY_OPTIONS)[number]["code"];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { code: "full_time", label: "Full time" },
  { code: "part_time", label: "Part time" },
  { code: "mini_job", label: "Mini-job" },
  { code: "temporary", label: "Temporary" },
] as const;

export type EmploymentTypeCode =
  (typeof EMPLOYMENT_TYPE_OPTIONS)[number]["code"];

export const SHIFT_PREFERENCE_OPTIONS = [
  { code: "morning", label: "Morning" },
  { code: "daytime", label: "Daytime" },
  { code: "evening", label: "Evening" },
  { code: "night", label: "Night" },
  { code: "weekend", label: "Weekend" },
  { code: "flexible", label: "Flexible" },
] as const;

export type ShiftPreferenceCode =
  (typeof SHIFT_PREFERENCE_OPTIONS)[number]["code"];

export const LANGUAGE_PROFICIENCY_OPTIONS = [
  { code: "basic", label: "Basic" },
  { code: "conversational", label: "Conversational" },
  { code: "proficient", label: "Proficient" },
  { code: "native", label: "Native" },
] as const;

export type LanguageProficiencyCode =
  (typeof LANGUAGE_PROFICIENCY_OPTIONS)[number]["code"];

export const LANGUAGE_OPTIONS = [
  { code: "de", label: "German" },
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "tr", label: "Turkish" },
  { code: "uk", label: "Ukrainian" },
  { code: "ru", label: "Russian" },
  { code: "pl", label: "Polish" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ro", label: "Romanian" },
  { code: "bg", label: "Bulgarian" },
  { code: "sr", label: "Serbian" },
  { code: "hr", label: "Croatian" },
  { code: "bs", label: "Bosnian" },
  { code: "sq", label: "Albanian" },
  { code: "el", label: "Greek" },
  { code: "fa", label: "Persian" },
  { code: "ku", label: "Kurdish" },
  { code: "ur", label: "Urdu" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "vi", label: "Vietnamese" },
  { code: "zh", label: "Chinese" },
  { code: "other", label: "Another language" },
] as const;

export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]["code"];

export const GERMAN_COMFORT_CODES = GERMAN_COMFORT_OPTIONS.map(
  (option) => option.code,
) as unknown as readonly [GermanComfortCode, ...GermanComfortCode[]];

export const TRAVEL_TIME_MINUTES = TRAVEL_TIME_OPTIONS.map(
  (option) => option.minutes,
) as unknown as readonly [TravelTimeMinutes, ...TravelTimeMinutes[]];

export const JOB_CATEGORY_CODES = JOB_CATEGORY_OPTIONS.map(
  (option) => option.code,
) as unknown as readonly [JobCategoryCode, ...JobCategoryCode[]];

export const EMPLOYMENT_TYPE_CODES = EMPLOYMENT_TYPE_OPTIONS.map(
  (option) => option.code,
) as unknown as readonly [EmploymentTypeCode, ...EmploymentTypeCode[]];

export const SHIFT_PREFERENCE_CODES = SHIFT_PREFERENCE_OPTIONS.map(
  (option) => option.code,
) as unknown as readonly [ShiftPreferenceCode, ...ShiftPreferenceCode[]];

export const LANGUAGE_PROFICIENCY_CODES = LANGUAGE_PROFICIENCY_OPTIONS.map(
  (option) => option.code,
) as unknown as readonly [
  LanguageProficiencyCode,
  ...LanguageProficiencyCode[],
];

export const LANGUAGE_CODES = LANGUAGE_OPTIONS.map(
  (option) => option.code,
) as unknown as readonly [LanguageCode, ...LanguageCode[]];

export const ONBOARDING_GROUPS = [
  "languages",
  "work_authorisation",
  "location",
  "categories",
  "availability",
  "employment",
] as const;

export type OnboardingGroupId = (typeof ONBOARDING_GROUPS)[number];

export const ONBOARDING_GROUP_LABELS: Record<OnboardingGroupId, string> = {
  languages: "Languages and German comfort",
  work_authorisation: "Work authorisation",
  location: "Berlin and travel time",
  categories: "Job categories",
  availability: "Earliest availability",
  employment: "Employment types and shifts",
};

/** Unique values preserving first-seen order. */
export function uniqueOrdered<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}
