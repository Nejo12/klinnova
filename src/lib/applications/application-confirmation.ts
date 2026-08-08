import { NO_ADDITIONAL_LANGUAGE_REQUIREMENTS } from "@/lib/applications/messages";
import type {
  CandidateLiveSnapshotV1,
  VacancySnapshotV1,
} from "@/lib/applications/snapshot-schemas";
import {
  applicationStatusLabel,
  type ApplicationStatus,
} from "@/lib/applications/status";
import {
  employmentTypeLabel,
  formatIsoCalendarDate,
  germanComfortLabel,
  germanRequirementLabel,
  jobCategoryLabel,
  joinLabels,
  languageLabel,
  languageProficiencyLabel,
  shiftLabel,
} from "@/lib/matching/labels";

export const APPLICATION_CONFIRMATION_HEADING = "Application submitted";
export const APPLICATION_CONFIRMATION_BODY =
  "Your application was recorded successfully.";
export const APPLICATION_STATUS_SUBMITTED_LABEL = "Submitted";
export const APPLIED_STATUS_LABEL = "Applied";

export type ConfirmationLanguage = {
  languageCode: string;
  languageLabel: string;
  proficiencyLabel: string;
};

export type ConfirmationLanguageRequirement = {
  languageCode: string;
  languageLabel: string;
  minProficiencyLabel: string;
};

/**
 * Candidate-facing confirmation receipt.
 * Snapshot-backed only — never reconstructed from current profile/vacancy/matcher.
 */
export type ApplicationConfirmation = {
  /** Route identity only — never render in candidate-facing copy. */
  applicationId: string;
  statusLabel: string;
  submittedAtIso: string;
  submittedAtLabel: string;
  vacancyId: string;
  vacancyTitle: string;
  employerDisplayName: string;
  demoLabel: "Demo vacancy" | null;
  city: "Berlin";
  vacancyJobCategoryLabel: string;
  vacancyEmploymentTypesLabel: string;
  vacancyShiftRequirementsLabel: string;
  vacancyGermanRequirementLabel: string;
  vacancyLanguageRequirements: ConfirmationLanguageRequirement[];
  vacancyNoAdditionalLanguagesLabel: string | null;
  vacancyAvailableFromLabel: string;
  candidateDisplayName: string;
  candidateMatchedCategoryLabel: string;
  candidateGermanComfortLabel: string;
  candidateLanguages: ConfirmationLanguage[];
  candidateNoAdditionalLanguagesLabel: string | null;
  candidateWorkAuthorisationLabel: string;
  candidateAvailableFromLabel: string | null;
  candidateEmploymentPreferencesLabel: string;
  candidateShiftPreferencesLabel: string;
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

/**
 * Format an ISO timestamptz as a factual UTC label without inventing local TZ.
 * Example: `3 August 2026, 14:30 UTC`
 */
export function formatSubmittedAtUtc(isoTimestamp: string): string | null {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const day = date.getUTCDate();
  const monthName = MONTH_NAMES[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  if (monthName === undefined) {
    return null;
  }

  return `${day} ${monthName} ${year}, ${hours}:${minutes} UTC`;
}

function workAuthorisationLabel(declared: boolean): string {
  return declared ? "Yes" : "Not sure";
}

/**
 * `candidate` must already be narrowed to the live variant by the caller —
 * a deleted candidate's own confirmation page is unreachable (the D-080
 * database gate blocks a deleted candidate's own reads before this
 * function is ever called), so there is no legitimate deleted-snapshot
 * case for this candidate-facing receipt to render.
 */
export function buildApplicationConfirmation(input: {
  applicationId: string;
  status: ApplicationStatus;
  submittedAt: string;
  candidate: CandidateLiveSnapshotV1;
  vacancy: VacancySnapshotV1;
}): ApplicationConfirmation | null {
  const submittedAtLabel = formatSubmittedAtUtc(input.submittedAt);
  if (submittedAtLabel === null) {
    return null;
  }

  const vacancyLanguages = [...input.vacancy.language_requirements]
    .sort((left, right) =>
      left.language_code.localeCompare(right.language_code),
    )
    .map((requirement) => ({
      languageCode: requirement.language_code,
      languageLabel: languageLabel(requirement.language_code),
      minProficiencyLabel: languageProficiencyLabel(
        requirement.min_proficiency,
      ),
    }));

  const candidateLanguages = [...input.candidate.languages]
    .sort((left, right) =>
      left.language_code.localeCompare(right.language_code),
    )
    .map((language) => ({
      languageCode: language.language_code,
      languageLabel: languageLabel(language.language_code),
      proficiencyLabel: languageProficiencyLabel(language.proficiency),
    }));

  return {
    applicationId: input.applicationId,
    statusLabel: applicationStatusLabel(input.status),
    submittedAtIso: input.submittedAt,
    submittedAtLabel,
    vacancyId: input.vacancy.vacancy_id,
    vacancyTitle: input.vacancy.title,
    employerDisplayName: input.vacancy.employer_display_name,
    demoLabel: input.vacancy.demo_label,
    city: input.vacancy.city,
    vacancyJobCategoryLabel: jobCategoryLabel(input.vacancy.job_category),
    vacancyEmploymentTypesLabel: joinLabels(
      input.vacancy.employment_types.map(employmentTypeLabel),
    ),
    vacancyShiftRequirementsLabel: joinLabels(
      input.vacancy.shift_requirements.map(shiftLabel),
    ),
    vacancyGermanRequirementLabel: germanRequirementLabel(
      input.vacancy.german_requirement,
    ),
    vacancyLanguageRequirements: vacancyLanguages,
    vacancyNoAdditionalLanguagesLabel:
      vacancyLanguages.length === 0
        ? NO_ADDITIONAL_LANGUAGE_REQUIREMENTS
        : null,
    vacancyAvailableFromLabel:
      input.vacancy.available_from === null
        ? "Flexible start"
        : `From ${formatIsoCalendarDate(input.vacancy.available_from)}`,
    candidateDisplayName: input.candidate.display_name,
    candidateMatchedCategoryLabel: jobCategoryLabel(
      input.candidate.job_category,
    ),
    candidateGermanComfortLabel: germanComfortLabel(
      input.candidate.german_comfort,
    ),
    candidateLanguages,
    candidateNoAdditionalLanguagesLabel:
      candidateLanguages.length === 0
        ? NO_ADDITIONAL_LANGUAGE_REQUIREMENTS
        : null,
    candidateWorkAuthorisationLabel: workAuthorisationLabel(
      input.candidate.work_authorisation_declared,
    ),
    candidateAvailableFromLabel:
      input.candidate.available_from === null
        ? null
        : formatIsoCalendarDate(input.candidate.available_from),
    candidateEmploymentPreferencesLabel: joinLabels(
      input.candidate.employment_types.map(employmentTypeLabel),
    ),
    candidateShiftPreferencesLabel: joinLabels(
      input.candidate.shift_preferences.map(shiftLabel),
    ),
  };
}
