import { NO_ADDITIONAL_LANGUAGE_REQUIREMENTS } from "@/lib/applications/messages";
import {
  employmentTypeLabel,
  formatIsoCalendarDate,
  germanComfortLabel,
  jobCategoryLabel,
  joinLabels,
  languageLabel,
  languageProficiencyLabel,
  shiftLabel,
} from "@/lib/matching/labels";
import type {
  CandidateMatchingInput,
  CandidateMatch,
} from "@/lib/matching/types";
import {
  EMPLOYMENT_TYPE_CODES,
  SHIFT_PREFERENCE_CODES,
  type EmploymentTypeCode,
  type GermanComfortCode,
  type JobCategoryCode,
  type LanguageCode,
  type LanguageProficiencyCode,
  type ShiftPreferenceCode,
} from "@/lib/onboarding/allow-lists";

export type ApplicationPreviewLanguage = {
  languageCode: LanguageCode;
  languageLabel: string;
  proficiencyLabel: string;
  proficiency?: LanguageProficiencyCode;
};

/**
 * Candidate-facing application preview (informational only).
 * Separate from job-detail view model; never treated as authorization evidence.
 */
export type ApplicationPreview = {
  vacancyId: string;
  vacancyTitle: string;
  employerDisplayName: string;
  candidateDisplayName: string;
  matchedJobCategoryLabel: string;
  matchedJobCategory?: JobCategoryCode;
  germanComfortLabel: string;
  germanComfort?: GermanComfortCode;
  relevantLanguages: ApplicationPreviewLanguage[];
  /** Set when the vacancy has no additional language requirements. */
  noAdditionalLanguagesLabel: string | null;
  workAuthorisationDeclaredLabel: string;
  workAuthorisationDeclared?: boolean | null;
  availableFromLabel: string | null;
  availableFrom?: string | null;
  employmentPreferencesLabel: string;
  employmentPreferences?: EmploymentTypeCode[];
  shiftPreferencesLabel: string;
  shiftPreferences?: ShiftPreferenceCode[];
};

export type BuildApplicationPreviewInput = {
  match: CandidateMatch;
  candidate: CandidateMatchingInput;
  displayName: string;
  workAuthorisationDeclared: boolean | null;
};

function orderByAllowList<T extends string>(
  values: readonly T[],
  codes: readonly T[],
): T[] {
  return codes.filter((code) => values.includes(code));
}

function workAuthorisationLabel(declared: boolean | null): string | null {
  if (declared === true) {
    return "Yes";
  }
  if (declared === false) {
    return "Not sure";
  }
  return null;
}

/**
 * Build the application preview from current trusted matcher inputs.
 * Vacancy-relevant languages only; arrays ordered deterministically.
 */
export function buildApplicationPreview(
  input: BuildApplicationPreviewInput,
): ApplicationPreview {
  const { match, candidate, displayName, workAuthorisationDeclared } = input;
  const { vacancy } = match;

  const requiredCodes = new Set(
    vacancy.languageRequirements.map((requirement) => requirement.languageCode),
  );

  const relevantLanguages =
    requiredCodes.size === 0
      ? []
      : [...candidate.languages]
          .filter((language) => requiredCodes.has(language.languageCode))
          .sort((left, right) =>
            left.languageCode.localeCompare(right.languageCode),
          )
          .map((language) => ({
            languageCode: language.languageCode,
            languageLabel: languageLabel(language.languageCode),
            proficiencyLabel: languageProficiencyLabel(language.proficiency),
            proficiency: language.proficiency,
          }));

  const employmentOrdered = orderByAllowList(
    candidate.employmentTypes as readonly EmploymentTypeCode[],
    EMPLOYMENT_TYPE_CODES,
  );
  const shiftOrdered = orderByAllowList(
    candidate.shiftPreferences as readonly ShiftPreferenceCode[],
    SHIFT_PREFERENCE_CODES,
  );

  const workAuthorisationDeclaredLabel =
    workAuthorisationLabel(workAuthorisationDeclared) ?? "Not provided";

  return {
    vacancyId: vacancy.id,
    vacancyTitle: vacancy.title,
    employerDisplayName: vacancy.company.name,
    candidateDisplayName: displayName,
    matchedJobCategoryLabel: jobCategoryLabel(vacancy.jobCategory),
    matchedJobCategory: vacancy.jobCategory,
    germanComfortLabel: germanComfortLabel(candidate.germanComfort),
    germanComfort: candidate.germanComfort,
    relevantLanguages,
    noAdditionalLanguagesLabel:
      vacancy.languageRequirements.length === 0
        ? NO_ADDITIONAL_LANGUAGE_REQUIREMENTS
        : null,
    workAuthorisationDeclaredLabel,
    workAuthorisationDeclared,
    availableFromLabel:
      candidate.availableFrom.length > 0
        ? formatIsoCalendarDate(candidate.availableFrom)
        : null,
    availableFrom: candidate.availableFrom || null,
    employmentPreferencesLabel: joinLabels(
      employmentOrdered.map(employmentTypeLabel),
    ),
    employmentPreferences: employmentOrdered,
    shiftPreferencesLabel: joinLabels(shiftOrdered.map(shiftLabel)),
    shiftPreferences: shiftOrdered,
  };
}
