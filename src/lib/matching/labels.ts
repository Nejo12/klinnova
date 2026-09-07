import {
  EMPLOYMENT_TYPE_OPTIONS,
  GERMAN_COMFORT_OPTIONS,
  JOB_CATEGORY_OPTIONS,
  LANGUAGE_OPTIONS,
  LANGUAGE_PROFICIENCY_OPTIONS,
  SHIFT_PREFERENCE_OPTIONS,
  type EmploymentTypeCode,
  type GermanComfortCode,
  type JobCategoryCode,
  type LanguageCode,
  type LanguageProficiencyCode,
  type ShiftPreferenceCode,
} from "@/lib/onboarding/allow-lists";
import type { ConcreteShift } from "@/lib/matching/types";
import type { Locale } from "@/lib/i18n/locale";

const JOB_CATEGORY_LABELS = Object.fromEntries(
  JOB_CATEGORY_OPTIONS.map((option) => [option.code, option.label]),
) as Record<JobCategoryCode, string>;

const EMPLOYMENT_TYPE_LABELS = Object.fromEntries(
  EMPLOYMENT_TYPE_OPTIONS.map((option) => [option.code, option.label]),
) as Record<EmploymentTypeCode, string>;

const SHIFT_LABELS = Object.fromEntries(
  SHIFT_PREFERENCE_OPTIONS.map((option) => [option.code, option.label]),
) as Record<ShiftPreferenceCode, string>;

const LANGUAGE_LABELS = Object.fromEntries(
  LANGUAGE_OPTIONS.map((option) => [option.code, option.label]),
) as Record<LanguageCode, string>;

const LANGUAGE_PROFICIENCY_LABELS = Object.fromEntries(
  LANGUAGE_PROFICIENCY_OPTIONS.map((option) => [option.code, option.label]),
) as Record<LanguageProficiencyCode, string>;

const JOB_CATEGORY_LABELS_DE: Record<JobCategoryCode, string> = {
  cleaning: "Reinigung",
  hospitality: "Gastronomie",
  logistics: "Logistik",
  warehousing: "Lagerarbeit",
  food_production: "Lebensmittelproduktion",
  moving: "Umzüge",
  retail: "Einzelhandel",
};

const EMPLOYMENT_TYPE_LABELS_DE: Record<EmploymentTypeCode, string> = {
  full_time: "Vollzeit",
  part_time: "Teilzeit",
  mini_job: "Minijob",
  temporary: "Befristet",
};

const SHIFT_LABELS_DE: Record<ShiftPreferenceCode, string> = {
  morning: "Morgens",
  daytime: "Tagsüber",
  evening: "Abends",
  night: "Nachts",
  weekend: "Wochenende",
  flexible: "Flexibel",
};

const LANGUAGE_LABELS_DE: Record<LanguageCode, string> = {
  de: "Deutsch",
  en: "Englisch",
  ar: "Arabisch",
  tr: "Türkisch",
  uk: "Ukrainisch",
  ru: "Russisch",
  pl: "Polnisch",
  fr: "Französisch",
  es: "Spanisch",
  it: "Italienisch",
  pt: "Portugiesisch",
  ro: "Rumänisch",
  bg: "Bulgarisch",
  sr: "Serbisch",
  hr: "Kroatisch",
  bs: "Bosnisch",
  sq: "Albanisch",
  el: "Griechisch",
  fa: "Persisch",
  ku: "Kurdisch",
  ur: "Urdu",
  hi: "Hindi",
  bn: "Bengalisch",
  vi: "Vietnamesisch",
  zh: "Chinesisch",
  other: "Weitere Sprache",
};

const LANGUAGE_PROFICIENCY_LABELS_DE: Record<LanguageProficiencyCode, string> =
  {
    basic: "Grundkenntnisse",
    conversational: "Alltagssicher",
    proficient: "Sehr gute Kenntnisse",
    native: "Muttersprache",
  };

/** Onboarding vocabulary for the candidate’s German comfort declaration. */
const GERMAN_COMFORT_LABELS = Object.fromEntries(
  GERMAN_COMFORT_OPTIONS.map((option) => [option.code, option.label]),
) as Record<GermanComfortCode, string>;

/** Short vacancy-facing German requirement labels (not long onboarding sentences). */
const GERMAN_REQUIREMENT_LABELS: Record<GermanComfortCode, string> = {
  none: "No German required",
  basic: "Basic German",
  conversational: "Conversational German",
  comfortable: "Comfortable German",
};

const GERMAN_REQUIREMENT_LABELS_DE: Record<GermanComfortCode, string> = {
  none: "Keine Deutschkenntnisse erforderlich",
  basic: "Deutsch-Grundkenntnisse",
  conversational: "Alltagssicheres Deutsch",
  comfortable: "Sicheres Deutsch",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function jobCategoryLabel(
  code: JobCategoryCode,
  locale: Locale = "en",
): string {
  return locale === "de"
    ? JOB_CATEGORY_LABELS_DE[code]
    : JOB_CATEGORY_LABELS[code];
}

export function employmentTypeLabel(code: EmploymentTypeCode): string;
export function employmentTypeLabel(
  code: EmploymentTypeCode,
  locale: Locale,
): string;
export function employmentTypeLabel(
  code: EmploymentTypeCode,
  locale: Locale = "en",
): string {
  return locale === "de"
    ? EMPLOYMENT_TYPE_LABELS_DE[code]
    : EMPLOYMENT_TYPE_LABELS[code];
}

export function shiftLabel(code: ShiftPreferenceCode | ConcreteShift): string;
export function shiftLabel(
  code: ShiftPreferenceCode | ConcreteShift,
  locale: Locale,
): string;
export function shiftLabel(
  code: ShiftPreferenceCode | ConcreteShift,
  locale: Locale = "en",
): string {
  return locale === "de" ? SHIFT_LABELS_DE[code] : SHIFT_LABELS[code];
}

export function languageLabel(
  code: LanguageCode,
  locale: Locale = "en",
): string {
  return locale === "de" ? LANGUAGE_LABELS_DE[code] : LANGUAGE_LABELS[code];
}

export function languageProficiencyLabel(
  code: LanguageProficiencyCode,
  locale: Locale = "en",
): string {
  return locale === "de"
    ? LANGUAGE_PROFICIENCY_LABELS_DE[code]
    : LANGUAGE_PROFICIENCY_LABELS[code];
}

export function germanComfortLabel(code: GermanComfortCode): string {
  return GERMAN_COMFORT_LABELS[code];
}

export function germanRequirementLabel(
  code: GermanComfortCode,
  locale: Locale = "en",
): string {
  return locale === "de"
    ? GERMAN_REQUIREMENT_LABELS_DE[code]
    : GERMAN_REQUIREMENT_LABELS[code];
}

/** Format validated `YYYY-MM-DD` without timezone Date conversion. */
export function formatIsoCalendarDate(isoDate: string): string {
  const [yearText, monthText, dayText] = isoDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const monthName = MONTH_NAMES[month - 1];
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    monthName === undefined
  ) {
    return isoDate;
  }
  return `${day} ${monthName} ${year}`;
}

export function joinLabels(
  labels: readonly string[],
  locale: Locale = "en",
): string {
  if (labels.length === 0) {
    return "";
  }
  if (labels.length === 1) {
    return labels[0] ?? "";
  }
  if (labels.length === 2) {
    return `${labels[0]} ${locale === "de" ? "und" : "and"} ${labels[1]}`;
  }
  const head = labels.slice(0, -1).join(", ");
  const last = labels[labels.length - 1];
  return locale === "de" ? `${head} und ${last}` : `${head}, and ${last}`;
}
