import {
  EMPLOYMENT_TYPE_CODES,
  LANGUAGE_CODES,
  uniqueOrdered,
  type EmploymentTypeCode,
  type LanguageCode,
  type LanguageProficiencyCode,
} from "@/lib/onboarding/allow-lists";
import { CONCRETE_SHIFT_CODES } from "@/lib/matching/concrete-shifts";
import type {
  CandidateMatchingInput,
  CandidateShiftPreference,
  ConcreteShift,
  MatchReason,
  VacancyLanguageRequirement,
  VacancyMatchingInput,
} from "@/lib/matching/types";
import {
  meetsGermanRequirement,
  meetsLanguageProficiency,
} from "@/lib/matching/ranks";

type LanguageProficiency = LanguageProficiencyCode;

export { CONCRETE_SHIFT_CODES };

const ISO_CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Lexicographic ISO calendar-date compare; no timezone conversion. */
export function isValidIsoCalendarDate(value: string): boolean {
  if (!ISO_CALENDAR_DATE.test(value)) {
    return false;
  }
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  // Reject impossible calendar days without timezone Date parsing.
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  const maxDay = daysInMonth[month - 1];
  return maxDay !== undefined && day <= maxDay;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function compareIsoCalendarDates(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

/** Deterministic UTF-16 code-unit string compare (locale-independent). */
export function compareStrings(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

export function orderedEmploymentIntersection(
  candidate: readonly EmploymentTypeCode[],
  vacancy: readonly EmploymentTypeCode[],
): EmploymentTypeCode[] {
  const candidateSet = new Set(uniqueOrdered(candidate));
  const vacancySet = new Set(uniqueOrdered(vacancy));
  return EMPLOYMENT_TYPE_CODES.filter(
    (code) => candidateSet.has(code) && vacancySet.has(code),
  );
}

export function orderedConcreteShiftIntersection(
  candidate: readonly CandidateShiftPreference[],
  vacancy: readonly ConcreteShift[],
): ConcreteShift[] {
  const candidateSet = new Set(uniqueOrdered(candidate));
  const vacancySet = new Set(uniqueOrdered(vacancy));
  return CONCRETE_SHIFT_CODES.filter(
    (code) => candidateSet.has(code) && vacancySet.has(code),
  );
}

export function orderedLanguageCodes(
  codes: readonly LanguageCode[],
): LanguageCode[] {
  const set = new Set(codes);
  return LANGUAGE_CODES.filter((code) => set.has(code));
}

export function candidateHasFlexibleShift(
  preferences: readonly CandidateShiftPreference[],
): boolean {
  return preferences.includes("flexible");
}

/**
 * Best candidate proficiency for a language code.
 * Duplicate malformed rows keep the highest proficiency deterministically.
 */
export function bestCandidateProficiency(
  candidate: CandidateMatchingInput,
  languageCode: LanguageCode,
): LanguageProficiency | null {
  let best: LanguageProficiency | null = null;
  for (const entry of candidate.languages) {
    if (entry.languageCode !== languageCode) {
      continue;
    }
    if (best === null || meetsLanguageProficiency(entry.proficiency, best)) {
      best = entry.proficiency;
    }
  }
  return best;
}

export function evaluateLocation(
  candidate: CandidateMatchingInput,
  vacancy: VacancyMatchingInput,
): boolean {
  return candidate.city === "Berlin" && vacancy.city === "Berlin";
}

export function evaluateCategory(
  candidate: CandidateMatchingInput,
  vacancy: VacancyMatchingInput,
): boolean {
  return candidate.jobCategories.includes(vacancy.jobCategory);
}

export function evaluateEmployment(
  candidate: CandidateMatchingInput,
  vacancy: VacancyMatchingInput,
): boolean {
  return (
    orderedEmploymentIntersection(
      candidate.employmentTypes,
      vacancy.employmentTypes,
    ).length > 0
  );
}

export function evaluateShift(
  candidate: CandidateMatchingInput,
  vacancy: VacancyMatchingInput,
): { ok: true; viaFlexible: boolean; shifts: ConcreteShift[] } | { ok: false } {
  if ((vacancy.shiftRequirements as readonly string[]).includes("flexible")) {
    return { ok: false };
  }
  if (candidateHasFlexibleShift(candidate.shiftPreferences)) {
    return { ok: true, viaFlexible: true, shifts: [] };
  }
  const shifts = orderedConcreteShiftIntersection(
    candidate.shiftPreferences,
    vacancy.shiftRequirements,
  );
  if (shifts.length === 0) {
    return { ok: false };
  }
  return { ok: true, viaFlexible: false, shifts };
}

export function evaluateGerman(
  candidate: CandidateMatchingInput,
  vacancy: VacancyMatchingInput,
): boolean {
  return meetsGermanRequirement(
    candidate.germanComfort,
    vacancy.germanRequirement,
  );
}

export function evaluateAdditionalLanguages(
  candidate: CandidateMatchingInput,
  vacancy: VacancyMatchingInput,
):
  | { ok: true; emitReason: false }
  | { ok: true; emitReason: true; languageCodes: LanguageCode[] }
  | { ok: false } {
  const requirements = vacancy.languageRequirements;
  if (requirements.length === 0) {
    return { ok: true, emitReason: false };
  }

  const satisfied: LanguageCode[] = [];
  for (const requirement of requirements) {
    if (!languageRequirementMet(candidate, requirement)) {
      return { ok: false };
    }
    satisfied.push(requirement.languageCode);
  }

  return {
    ok: true,
    emitReason: true,
    languageCodes: orderedLanguageCodes(satisfied),
  };
}

function languageRequirementMet(
  candidate: CandidateMatchingInput,
  requirement: VacancyLanguageRequirement,
): boolean {
  const proficiency = bestCandidateProficiency(
    candidate,
    requirement.languageCode,
  );
  if (proficiency === null) {
    return false;
  }
  return meetsLanguageProficiency(proficiency, requirement.minProficiency);
}

export function evaluateAvailability(
  candidate: CandidateMatchingInput,
  vacancy: VacancyMatchingInput,
):
  | { ok: true; kind: "flexible_start" }
  | {
      ok: true;
      kind: "fixed_start";
      candidateAvailableFrom: string;
      vacancyAvailableFrom: string;
    }
  | { ok: false } {
  if (!isValidIsoCalendarDate(candidate.availableFrom)) {
    return { ok: false };
  }
  if (vacancy.availableFrom === null) {
    return { ok: true, kind: "flexible_start" };
  }
  if (!isValidIsoCalendarDate(vacancy.availableFrom)) {
    return { ok: false };
  }
  if (
    compareIsoCalendarDates(candidate.availableFrom, vacancy.availableFrom) <= 0
  ) {
    return {
      ok: true,
      kind: "fixed_start",
      candidateAvailableFrom: candidate.availableFrom,
      vacancyAvailableFrom: vacancy.availableFrom,
    };
  }
  return { ok: false };
}

export function buildMatchReasons(
  candidate: CandidateMatchingInput,
  vacancy: VacancyMatchingInput,
  shift: { viaFlexible: boolean; shifts: ConcreteShift[] },
  languages:
    { emitReason: false } | { emitReason: true; languageCodes: LanguageCode[] },
  availability:
    | { kind: "flexible_start" }
    | {
        kind: "fixed_start";
        candidateAvailableFrom: string;
        vacancyAvailableFrom: string;
      },
): MatchReason[] {
  const reasons: MatchReason[] = [
    { code: "category_match", category: vacancy.jobCategory },
    {
      code: "employment_type_match",
      employmentTypes: orderedEmploymentIntersection(
        candidate.employmentTypes,
        vacancy.employmentTypes,
      ),
    },
    shift.viaFlexible
      ? { code: "shift_match", viaFlexible: true }
      : { code: "shift_match", viaFlexible: false, shifts: shift.shifts },
    {
      code: "german_requirement_met",
      germanRequirement: vacancy.germanRequirement,
    },
  ];

  if (languages.emitReason) {
    reasons.push({
      code: "additional_languages_met",
      languageCodes: languages.languageCodes,
    });
  }

  if (availability.kind === "flexible_start") {
    reasons.push({ code: "availability_match", kind: "flexible_start" });
  } else {
    reasons.push({
      code: "availability_match",
      kind: "fixed_start",
      candidateAvailableFrom: availability.candidateAvailableFrom,
      vacancyAvailableFrom: availability.vacancyAvailableFrom,
    });
  }

  reasons.push({ code: "berlin_job", city: "Berlin" });
  return reasons;
}
