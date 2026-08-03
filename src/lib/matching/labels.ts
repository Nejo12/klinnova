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

export function jobCategoryLabel(code: JobCategoryCode): string {
  return JOB_CATEGORY_LABELS[code];
}

export function employmentTypeLabel(code: EmploymentTypeCode): string {
  return EMPLOYMENT_TYPE_LABELS[code];
}

export function shiftLabel(code: ShiftPreferenceCode | ConcreteShift): string {
  return SHIFT_LABELS[code];
}

export function languageLabel(code: LanguageCode): string {
  return LANGUAGE_LABELS[code];
}

export function languageProficiencyLabel(
  code: LanguageProficiencyCode,
): string {
  return LANGUAGE_PROFICIENCY_LABELS[code];
}

export function germanComfortLabel(code: GermanComfortCode): string {
  return GERMAN_COMFORT_LABELS[code];
}

export function germanRequirementLabel(code: GermanComfortCode): string {
  return GERMAN_REQUIREMENT_LABELS[code];
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

export function joinLabels(labels: readonly string[]): string {
  if (labels.length === 0) {
    return "";
  }
  if (labels.length === 1) {
    return labels[0] ?? "";
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  const head = labels.slice(0, -1).join(", ");
  const last = labels[labels.length - 1];
  return `${head}, and ${last}`;
}
