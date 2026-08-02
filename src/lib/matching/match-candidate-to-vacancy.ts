import type {
  CandidateMatch,
  CandidateMatchingInput,
  VacancyMatchingInput,
} from "@/lib/matching/types";
import {
  buildMatchReasons,
  evaluateAdditionalLanguages,
  evaluateAvailability,
  evaluateCategory,
  evaluateEmployment,
  evaluateGerman,
  evaluateLocation,
  evaluateShift,
} from "@/lib/matching/rules";

/**
 * Pure hard-filter match for one vacancy.
 * Returns null when any eligibility rule fails. Never scores.
 */
export function matchCandidateToVacancy(
  candidate: CandidateMatchingInput,
  vacancy: VacancyMatchingInput,
): CandidateMatch | null {
  if (!evaluateLocation(candidate, vacancy)) {
    return null;
  }
  if (!evaluateCategory(candidate, vacancy)) {
    return null;
  }
  if (!evaluateEmployment(candidate, vacancy)) {
    return null;
  }

  const shift = evaluateShift(candidate, vacancy);
  if (!shift.ok) {
    return null;
  }

  if (!evaluateGerman(candidate, vacancy)) {
    return null;
  }

  const languages = evaluateAdditionalLanguages(candidate, vacancy);
  if (!languages.ok) {
    return null;
  }

  const availability = evaluateAvailability(candidate, vacancy);
  if (!availability.ok) {
    return null;
  }

  return {
    vacancy,
    reasons: buildMatchReasons(
      candidate,
      vacancy,
      { viaFlexible: shift.viaFlexible, shifts: shift.shifts },
      languages.emitReason
        ? { emitReason: true, languageCodes: languages.languageCodes }
        : { emitReason: false },
      availability,
    ),
  };
}
