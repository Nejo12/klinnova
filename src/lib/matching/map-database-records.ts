import { z } from "zod";

import {
  EMPLOYMENT_TYPE_CODES,
  GERMAN_COMFORT_CODES,
  JOB_CATEGORY_CODES,
  LANGUAGE_CODES,
  LANGUAGE_PROFICIENCY_CODES,
  SHIFT_PREFERENCE_CODES,
  uniqueOrdered,
} from "@/lib/onboarding/allow-lists";
import { CONCRETE_SHIFT_CODES } from "@/lib/matching/concrete-shifts";
import { isValidIsoCalendarDate } from "@/lib/matching/rules";
import type {
  CandidateLanguage,
  CandidateMatchingInput,
  CompanyMatchingData,
  VacancyLanguageRequirement,
  VacancyMatchingInput,
} from "@/lib/matching/types";

export class MatchingInvariantError extends Error {
  readonly name = "MatchingInvariantError";

  constructor(message = "Matching invariant failed") {
    super(message);
  }
}

const concreteShiftSchema = z.enum(CONCRETE_SHIFT_CODES);

const isoCalendarDateSchema = z
  .string()
  .refine(isValidIsoCalendarDate, { message: "Invalid ISO calendar date" });

const candidateLanguageSchema = z.object({
  language_code: z.enum(LANGUAGE_CODES),
  proficiency: z.enum(LANGUAGE_PROFICIENCY_CODES),
});

const candidateProfileSchema = z.object({
  city: z.literal("Berlin"),
  german_comfort: z.enum(GERMAN_COMFORT_CODES),
  job_categories: z.array(z.enum(JOB_CATEGORY_CODES)).min(1),
  employment_types: z.array(z.enum(EMPLOYMENT_TYPE_CODES)).min(1),
  shift_preferences: z.array(z.enum(SHIFT_PREFERENCE_CODES)).min(1),
  available_from: isoCalendarDateSchema,
  onboarding_completed_at: z.string().min(1),
});

const companyRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  source: z.literal("seed"),
});

const vacancyRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().min(1),
  city: z.literal("Berlin"),
  job_category: z.enum(JOB_CATEGORY_CODES),
  employment_types: z.array(z.enum(EMPLOYMENT_TYPE_CODES)).min(1),
  shift_requirements: z.array(concreteShiftSchema).min(1),
  german_requirement: z.enum(GERMAN_COMFORT_CODES),
  available_from: isoCalendarDateSchema.nullable(),
  published_at: z.string().min(1),
  expires_at: z.string().min(1),
  source: z.literal("seed"),
  publication_state: z.literal("published"),
  companies: companyRowSchema,
});

const vacancyLanguageRowSchema = z.object({
  vacancy_id: z.string().uuid(),
  language_code: z.enum(LANGUAGE_CODES),
  min_proficiency: z.enum(LANGUAGE_PROFICIENCY_CODES),
});

/** Raw profile columns as returned by Supabase (validated by Zod before use). */
export type CandidateProfileRow = {
  city: string | null;
  german_comfort: string | null;
  job_categories: string[];
  employment_types: string[];
  shift_preferences: string[];
  available_from: string | null;
  onboarding_completed_at: string | null;
};

export type CandidateLanguageRow = {
  language_code: string;
  proficiency: string;
};

export type VacancyLanguageRequirementRow = {
  vacancy_id: string;
  language_code: string;
  min_proficiency: string;
};

export function mapCandidateMatchingInput(
  profile: CandidateProfileRow,
  languageRows: readonly CandidateLanguageRow[],
): CandidateMatchingInput {
  const parsedProfile = candidateProfileSchema.safeParse(profile);
  if (!parsedProfile.success) {
    throw new MatchingInvariantError("Invalid candidate profile for matching");
  }

  const languages: CandidateLanguage[] = [];
  for (const row of languageRows) {
    const parsed = candidateLanguageSchema.safeParse(row);
    if (!parsed.success) {
      throw new MatchingInvariantError(
        "Invalid candidate language for matching",
      );
    }
    languages.push({
      languageCode: parsed.data.language_code,
      proficiency: parsed.data.proficiency,
    });
  }

  const data = parsedProfile.data;
  return {
    city: data.city,
    germanComfort: data.german_comfort,
    jobCategories: uniqueOrdered(data.job_categories),
    employmentTypes: uniqueOrdered(data.employment_types),
    shiftPreferences: uniqueOrdered(data.shift_preferences),
    availableFrom: data.available_from,
    languages,
  };
}

export function mapCompanyMatchingData(
  company: z.infer<typeof companyRowSchema>,
): CompanyMatchingData {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
  };
}

export function groupLanguageRequirementsByVacancy(
  rows: readonly unknown[],
): Map<string, VacancyLanguageRequirement[]> {
  const grouped = new Map<string, VacancyLanguageRequirement[]>();
  for (const row of rows) {
    const parsed = vacancyLanguageRowSchema.safeParse(row);
    if (!parsed.success) {
      throw new MatchingInvariantError(
        "Invalid vacancy language requirement for matching",
      );
    }
    const list = grouped.get(parsed.data.vacancy_id) ?? [];
    list.push({
      languageCode: parsed.data.language_code,
      minProficiency: parsed.data.min_proficiency,
    });
    grouped.set(parsed.data.vacancy_id, list);
  }
  return grouped;
}

export function mapVacancyMatchingInput(
  row: unknown,
  languageRequirements: readonly VacancyLanguageRequirement[],
): VacancyMatchingInput {
  const parsed = vacancyRowSchema.safeParse(row);
  if (!parsed.success) {
    throw new MatchingInvariantError("Invalid vacancy row for matching");
  }

  const data = parsed.data;
  return {
    id: data.id,
    company: mapCompanyMatchingData(data.companies),
    title: data.title,
    slug: data.slug,
    summary: data.summary,
    city: data.city,
    jobCategory: data.job_category,
    employmentTypes: uniqueOrdered(data.employment_types),
    shiftRequirements: uniqueOrdered(data.shift_requirements),
    germanRequirement: data.german_requirement,
    availableFrom: data.available_from,
    publishedAt: data.published_at,
    languageRequirements: [...languageRequirements],
  };
}

export function mapVacanciesMatchingInput(
  vacancyRows: readonly unknown[],
  languageRows: readonly unknown[],
): VacancyMatchingInput[] {
  const byVacancy = groupLanguageRequirementsByVacancy(languageRows);
  return vacancyRows.map((row) => {
    const parsed = vacancyRowSchema.safeParse(row);
    if (!parsed.success) {
      throw new MatchingInvariantError("Invalid vacancy row for matching");
    }
    return mapVacancyMatchingInput(
      parsed.data,
      byVacancy.get(parsed.data.id) ?? [],
    );
  });
}
