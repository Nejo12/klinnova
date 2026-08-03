import {
  employmentTypeLabel,
  formatIsoCalendarDate,
  germanRequirementLabel,
  jobCategoryLabel,
  joinLabels,
  languageLabel,
  languageProficiencyLabel,
  shiftLabel,
} from "@/lib/matching/labels";
import {
  presentMatchReasons,
  type PresentedMatchReason,
} from "@/lib/matching/present-reasons";
import type { CandidateMatch } from "@/lib/matching/types";

export const DEMO_VACANCY_LABEL = "Demo vacancy";

export type DetailLanguageRequirement = {
  languageCode: string;
  languageLabel: string;
  minProficiencyLabel: string;
};

/** Candidate-facing vacancy detail view model (accepted schema-backed fields only). */
export type CandidateVacancyDetail = {
  vacancyId: string;
  title: string;
  employerDisplayName: string;
  demoLabel: typeof DEMO_VACANCY_LABEL;
  city: "Berlin";
  jobCategoryLabel: string;
  employmentTypesLabel: string;
  shiftRequirementsLabel: string;
  germanRequirementLabel: string;
  languageRequirements: DetailLanguageRequirement[];
  availableFromLabel: string;
  listedOnLabel: string | null;
  matchReasons: PresentedMatchReason[];
};

function formatListedOn(publishedAt: string): string | null {
  const datePart = publishedAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return null;
  }
  return formatIsoCalendarDate(datePart);
}

/**
 * Build the detail view model from a successful matcher result.
 * Presentation-only; does not re-run eligibility rules.
 */
export function buildCandidateVacancyDetail(
  match: CandidateMatch,
): CandidateVacancyDetail {
  const { vacancy, reasons } = match;
  const languageRequirements = [...vacancy.languageRequirements]
    .sort((left, right) => left.languageCode.localeCompare(right.languageCode))
    .map((requirement) => ({
      languageCode: requirement.languageCode,
      languageLabel: languageLabel(requirement.languageCode),
      minProficiencyLabel: languageProficiencyLabel(requirement.minProficiency),
    }));

  return {
    vacancyId: vacancy.id,
    title: vacancy.title,
    employerDisplayName: vacancy.company.name,
    demoLabel: DEMO_VACANCY_LABEL,
    city: "Berlin",
    jobCategoryLabel: jobCategoryLabel(vacancy.jobCategory),
    employmentTypesLabel: joinLabels(
      vacancy.employmentTypes.map(employmentTypeLabel),
    ),
    shiftRequirementsLabel: joinLabels(
      vacancy.shiftRequirements.map(shiftLabel),
    ),
    germanRequirementLabel: germanRequirementLabel(vacancy.germanRequirement),
    languageRequirements,
    availableFromLabel:
      vacancy.availableFrom === null
        ? "Flexible start"
        : `From ${formatIsoCalendarDate(vacancy.availableFrom)}`,
    listedOnLabel: formatListedOn(vacancy.publishedAt),
    matchReasons: presentMatchReasons(reasons),
  };
}
