import {
  WORK_FREQUENCY_OPTIONS,
  WORKPLACE_TYPE_OPTIONS,
  type WorkFrequencyCode,
  type WorkplaceTypeCode,
} from "@/lib/employer/vacancies/allow-lists";
import {
  jobCategoryLabel,
  languageLabel,
  languageProficiencyLabel,
} from "@/lib/matching/labels";

export { jobCategoryLabel, languageLabel, languageProficiencyLabel };

const WORKPLACE_TYPE_LABELS = Object.fromEntries(
  WORKPLACE_TYPE_OPTIONS.map((option) => [option.code, option.label]),
) as Record<WorkplaceTypeCode, string>;

const WORK_FREQUENCY_LABELS = Object.fromEntries(
  WORK_FREQUENCY_OPTIONS.map((option) => [option.code, option.label]),
) as Record<WorkFrequencyCode, string>;

export function workplaceTypeLabel(code: WorkplaceTypeCode): string {
  return WORKPLACE_TYPE_LABELS[code];
}

export function workFrequencyLabel(code: WorkFrequencyCode): string {
  return WORK_FREQUENCY_LABELS[code];
}

/** Date-only (no time) — matches the public "Closes …" wording. */
export function formatListingDate(isoTimestamp: string): string | null {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(date);
}
