import { z } from "zod";

import {
  WORK_FREQUENCY_CODES,
  WORKPLACE_TYPE_CODES,
} from "@/lib/employer/vacancies/allow-lists";
import {
  JOB_CATEGORY_CODES,
  LANGUAGE_CODES,
  LANGUAGE_PROFICIENCY_CODES,
} from "@/lib/onboarding/allow-lists";

/**
 * Nullability here follows the PR 5.5a migration's SQL comments, not the
 * generated `database.ts` types (a known `RETURNS TABLE` codegen limitation
 * that marks every column non-null — see PR 5.3a's identical caveat).
 * `description`, `public_locality`, `workplace_type`, `work_frequency`,
 * `cv_required`, `interview_english_ok` are null for `source='seed'` rows
 * (the local/CI seed does not populate them) and non-null for
 * `source='employer'` rows (the publish-readiness gate enforces this).
 * `employer_type`/`website` are null for seed rows (no real employer
 * profile). `company_name` is null for private-employer rows.
 * `employer_display_name` is treated as nullable defensively even though no
 * currently-returnable row is expected to have it null.
 */
export const publicVacancyRowSchema = z.object({
  vacancy_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  job_category: z.enum(JOB_CATEGORY_CODES),
  public_locality: z.string().nullable(),
  workplace_type: z.enum(WORKPLACE_TYPE_CODES).nullable(),
  work_frequency: z.enum(WORK_FREQUENCY_CODES).nullable(),
  cv_required: z.boolean().nullable(),
  interview_english_ok: z.boolean().nullable(),
  source: z.enum(["seed", "employer"]),
  employer_type: z.enum(["private", "organisation"]).nullable(),
  employer_display_name: z.string().nullable(),
  company_name: z.string().nullable(),
  website: z.string().nullable(),
  published_at: z.string().min(1),
  expires_at: z.string().min(1),
});

export type PublicVacancyRow = z.infer<typeof publicVacancyRowSchema>;

/** Rows that fail validation are dropped by the caller, not thrown — one
 * malformed list row must not fail the whole list. */
export const publicVacancyListRowsSchema = z.array(z.unknown());

export const publicVacancyLanguageRowSchema = z.object({
  language_code: z.enum(LANGUAGE_CODES),
  min_proficiency: z.enum(LANGUAGE_PROFICIENCY_CODES),
});

export type PublicVacancyLanguageRow = z.infer<
  typeof publicVacancyLanguageRowSchema
>;

export const publicVacancyLanguageListSchema = z.array(
  publicVacancyLanguageRowSchema,
);
