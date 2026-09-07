import { z } from "zod";
import type { Locale } from "@/lib/i18n/locale";

/**
 * Canonical missing-requirement codes returned by the PR 5.5c database
 * contract (`_evaluate_candidate_vacancy_eligibility`,
 * `resolve_current_candidate_vacancy_match`, and `submit_candidate_application`'s
 * `ineligible` result). Exhaustive — the evaluator never emits any other
 * value, and this schema rejects anything it doesn't recognise rather than
 * rendering it.
 */
export const missingRequirementCodeSchema = z.enum([
  "category",
  "employment_type",
  "shift",
  "german",
  "language",
  "availability",
]);

export type MissingRequirementCode = z.infer<
  typeof missingRequirementCodeSchema
>;

/** Database evaluation order — never re-sorted client-side. */
export const MISSING_REQUIREMENT_CODES = [
  "category",
  "employment_type",
  "shift",
  "german",
  "language",
  "availability",
] as const satisfies readonly MissingRequirementCode[];

/**
 * Explains what needs updating, never why (no employer-rejection wording,
 * no permanent-ineligibility wording, no underlying candidate value).
 */
const MISSING_REQUIREMENT_LABELS: Record<MissingRequirementCode, string> = {
  category: "Preferred job category",
  employment_type: "Employment-type preference",
  shift: "Shift preference",
  german: "German level",
  language: "Language profile",
  availability: "Availability date",
};

const MISSING_REQUIREMENT_LABELS_DE: Record<MissingRequirementCode, string> = {
  category: "Bevorzugte Jobkategorie",
  employment_type: "Bevorzugte Beschäftigungsart",
  shift: "Bevorzugte Schicht",
  german: "Deutschkenntnisse",
  language: "Sprachprofil",
  availability: "Verfügbarkeitsdatum",
};

export function missingRequirementLabel(
  code: MissingRequirementCode,
  locale: Locale = "en",
): string {
  return locale === "de"
    ? MISSING_REQUIREMENT_LABELS_DE[code]
    : MISSING_REQUIREMENT_LABELS[code];
}

/**
 * Validates a full missing-requirement array against the database contract:
 * every element a known code, no duplicates, order preserved exactly as
 * returned. Rejects (returns null) rather than dropping unknown/duplicate
 * entries — a malformed array must not silently become a shorter, plausible-
 * looking list.
 */
export function parseMissingRequirementCodes(
  value: unknown,
): MissingRequirementCode[] | null {
  const parsed = z.array(missingRequirementCodeSchema).safeParse(value);
  if (!parsed.success) {
    return null;
  }
  const seen = new Set<MissingRequirementCode>();
  for (const code of parsed.data) {
    if (seen.has(code)) {
      return null;
    }
    seen.add(code);
  }
  return parsed.data;
}
