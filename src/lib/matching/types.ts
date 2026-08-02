import type {
  EmploymentTypeCode,
  GermanComfortCode,
  JobCategoryCode,
  LanguageCode,
  LanguageProficiencyCode,
  ShiftPreferenceCode,
} from "@/lib/onboarding/allow-lists";

/** Vacancy concrete shifts only — never `flexible` (docs/20). */
export type ConcreteShift = Exclude<ShiftPreferenceCode, "flexible">;

export type CandidateShiftPreference = ShiftPreferenceCode;

export type GermanComfort = GermanComfortCode;

export type LanguageProficiency = LanguageProficiencyCode;

export type MatchReasonCode =
  | "category_match"
  | "employment_type_match"
  | "shift_match"
  | "german_requirement_met"
  | "additional_languages_met"
  | "availability_match"
  | "berlin_job";

/** Closed Slice 2 reason priority (docs/20). */
export const MATCH_REASON_PRIORITY = [
  "category_match",
  "employment_type_match",
  "shift_match",
  "german_requirement_met",
  "additional_languages_met",
  "availability_match",
  "berlin_job",
] as const satisfies readonly MatchReasonCode[];

export type CandidateLanguage = {
  languageCode: LanguageCode;
  proficiency: LanguageProficiency;
};

export type CandidateMatchingInput = {
  city: "Berlin";
  germanComfort: GermanComfort;
  jobCategories: readonly JobCategoryCode[];
  employmentTypes: readonly EmploymentTypeCode[];
  shiftPreferences: readonly CandidateShiftPreference[];
  /** ISO calendar date `YYYY-MM-DD`. */
  availableFrom: string;
  languages: readonly CandidateLanguage[];
};

export type VacancyLanguageRequirement = {
  languageCode: LanguageCode;
  minProficiency: LanguageProficiency;
};

export type CompanyMatchingData = {
  id: string;
  name: string;
  slug: string;
};

export type VacancyMatchingInput = {
  id: string;
  company: CompanyMatchingData;
  title: string;
  slug: string;
  summary: string;
  city: "Berlin";
  jobCategory: JobCategoryCode;
  employmentTypes: readonly EmploymentTypeCode[];
  shiftRequirements: readonly ConcreteShift[];
  germanRequirement: GermanComfort;
  /** ISO calendar date or null (flexible start). */
  availableFrom: string | null;
  /** ISO timestamptz; non-null after domain validation. */
  publishedAt: string;
  languageRequirements: readonly VacancyLanguageRequirement[];
};

export type CategoryMatchReason = {
  code: "category_match";
  category: JobCategoryCode;
};

export type EmploymentTypeMatchReason = {
  code: "employment_type_match";
  employmentTypes: EmploymentTypeCode[];
};

export type ShiftMatchReason =
  | {
      code: "shift_match";
      viaFlexible: true;
    }
  | {
      code: "shift_match";
      viaFlexible: false;
      shifts: ConcreteShift[];
    };

export type GermanRequirementMetReason = {
  code: "german_requirement_met";
  germanRequirement: GermanComfort;
};

export type AdditionalLanguagesMetReason = {
  code: "additional_languages_met";
  languageCodes: LanguageCode[];
};

export type AvailabilityMatchReason =
  | {
      code: "availability_match";
      kind: "flexible_start";
    }
  | {
      code: "availability_match";
      kind: "fixed_start";
      candidateAvailableFrom: string;
      vacancyAvailableFrom: string;
    };

export type BerlinJobReason = {
  code: "berlin_job";
  city: "Berlin";
};

export type MatchReason =
  | CategoryMatchReason
  | EmploymentTypeMatchReason
  | ShiftMatchReason
  | GermanRequirementMetReason
  | AdditionalLanguagesMetReason
  | AvailabilityMatchReason
  | BerlinJobReason;

export type CandidateMatch = {
  vacancy: VacancyMatchingInput;
  reasons: MatchReason[];
};

export type LoadCandidateMatchesResult =
  | { status: "unauthenticated" }
  | { status: "profile_missing" }
  | { status: "onboarding_incomplete" }
  | { status: "success"; matches: CandidateMatch[] }
  | { status: "failure"; reason: "load" | "invariant" };
