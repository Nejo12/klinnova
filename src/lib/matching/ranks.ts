import type { GermanComfort, LanguageProficiency } from "@/lib/matching/types";

/** Canonical German comfort ordinal (docs/20). Never expose in match reasons. */
export const GERMAN_COMFORT_RANK = {
  none: 0,
  basic: 1,
  conversational: 2,
  comfortable: 3,
} as const satisfies Record<GermanComfort, number>;

/** Canonical language proficiency ordinal (docs/20). Never expose in match reasons. */
export const LANGUAGE_PROFICIENCY_RANK = {
  basic: 0,
  conversational: 1,
  proficient: 2,
  native: 3,
} as const satisfies Record<LanguageProficiency, number>;

export function germanComfortRank(level: GermanComfort): number {
  return GERMAN_COMFORT_RANK[level];
}

export function languageProficiencyRank(level: LanguageProficiency): number {
  return LANGUAGE_PROFICIENCY_RANK[level];
}

export function meetsGermanRequirement(
  candidate: GermanComfort,
  required: GermanComfort,
): boolean {
  return germanComfortRank(candidate) >= germanComfortRank(required);
}

export function meetsLanguageProficiency(
  candidate: LanguageProficiency,
  required: LanguageProficiency,
): boolean {
  return (
    languageProficiencyRank(candidate) >= languageProficiencyRank(required)
  );
}
