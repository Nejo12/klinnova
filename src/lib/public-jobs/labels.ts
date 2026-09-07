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
import type { Locale } from "@/lib/i18n/locale";

export { jobCategoryLabel, languageLabel, languageProficiencyLabel };

const WORKPLACE_TYPE_LABELS = Object.fromEntries(
  WORKPLACE_TYPE_OPTIONS.map((option) => [option.code, option.label]),
) as Record<WorkplaceTypeCode, string>;

const WORK_FREQUENCY_LABELS = Object.fromEntries(
  WORK_FREQUENCY_OPTIONS.map((option) => [option.code, option.label]),
) as Record<WorkFrequencyCode, string>;

const WORKPLACE_TYPE_LABELS_DE: Record<WorkplaceTypeCode, string> = {
  private_home: "Privathaushalt",
  apartment: "Wohnung",
  shop: "Geschäft",
  office: "Büro",
  warehouse: "Lager",
  outdoor: "Im Freien",
  other: "Sonstiges",
};

const WORK_FREQUENCY_LABELS_DE: Record<WorkFrequencyCode, string> = {
  one_off: "Einmalig",
  recurring: "Wiederkehrend",
};

export function workplaceTypeLabel(
  code: WorkplaceTypeCode,
  locale: Locale = "en",
): string {
  return locale === "de"
    ? WORKPLACE_TYPE_LABELS_DE[code]
    : WORKPLACE_TYPE_LABELS[code];
}

export function workFrequencyLabel(
  code: WorkFrequencyCode,
  locale: Locale = "en",
): string {
  return locale === "de"
    ? WORK_FREQUENCY_LABELS_DE[code]
    : WORK_FREQUENCY_LABELS[code];
}

/** Date-only (no time) — matches the public "Closes …" wording. */
export function formatListingDate(
  isoTimestamp: string,
  locale: Locale = "en",
): string | null {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "long",
  }).format(date);
}
