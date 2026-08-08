import { z } from "zod";

import { applicationStatusSchema } from "@/lib/applications/status";
import {
  candidateLiveSnapshotV1Schema,
  vacancySnapshotV1Schema,
} from "@/lib/applications/snapshot-schemas";
import { employerTypeSchema } from "@/lib/employer/schemas";
import { CONCRETE_SHIFT_CODES } from "@/lib/matching/concrete-shifts";
import {
  EMPLOYMENT_TYPE_CODES,
  GERMAN_COMFORT_CODES,
  JOB_CATEGORY_CODES,
  LANGUAGE_CODES,
  LANGUAGE_PROFICIENCY_CODES,
  SHIFT_PREFERENCE_CODES,
} from "@/lib/onboarding/allow-lists";

export const ACCOUNT_EXPORT_VERSION = 1 as const;

/**
 * D-077 Auth account metadata: `email`/`created_at` only, for both roles.
 * `last_sign_in_at`, tokens, sessions, provider identities, and password
 * material are never part of this shape.
 */
export const exportAccountMetadataSchema = z.object({
  email: z.string().min(1),
  created_at: z.string().min(1),
});

export type ExportAccountMetadata = z.infer<typeof exportAccountMetadataSchema>;

// ---------------------------------------------------------------------------
// Candidate export (D-077/D-088)
// ---------------------------------------------------------------------------

const exportCandidateLanguageSchema = z.object({
  language_code: z.enum(LANGUAGE_CODES),
  proficiency: z.enum(LANGUAGE_PROFICIENCY_CODES),
});

const exportCandidateStatusHistoryEntrySchema = z.object({
  to_status: applicationStatusSchema,
  occurred_at: z.string().min(1),
});

const exportCandidateApplicationSchema = z.object({
  id: z.string().uuid(),
  status: applicationStatusSchema,
  submitted_at: z.string().min(1),
  candidate_snapshot: candidateLiveSnapshotV1Schema,
  vacancy: vacancySnapshotV1Schema,
  status_history: z.array(exportCandidateStatusHistoryEntrySchema),
});

export const candidateAccountExportProfileSchema = z.object({
  display_name: z.string().min(1),
  german_comfort: z.enum(GERMAN_COMFORT_CODES).nullable(),
  work_authorisation_declared: z.boolean().nullable(),
  work_authorisation_declared_at: z.string().nullable(),
  city: z.string().nullable(),
  travel_radius_minutes: z.number().int().positive().nullable(),
  available_from: z.string().nullable(),
  job_categories: z.array(z.enum(JOB_CATEGORY_CODES)),
  employment_types: z.array(z.enum(EMPLOYMENT_TYPE_CODES)),
  shift_preferences: z.array(z.enum(SHIFT_PREFERENCE_CODES)),
  onboarding_completed_at: z.string().nullable(),
  created_at: z.string().min(1),
  languages: z.array(exportCandidateLanguageSchema),
  applications: z.array(exportCandidateApplicationSchema),
});

export const candidateAccountExportV1Schema = z.object({
  version: z.literal(ACCOUNT_EXPORT_VERSION),
  exported_at: z.string().min(1),
  account: exportAccountMetadataSchema,
  candidate: candidateAccountExportProfileSchema,
});

export type CandidateAccountExportV1 = z.infer<
  typeof candidateAccountExportV1Schema
>;

// ---------------------------------------------------------------------------
// Employer export (D-077/D-088/D-089)
// ---------------------------------------------------------------------------

const verificationStateSchema = z.enum([
  "unverified",
  "pending",
  "verified",
  "rejected",
  "revoked",
]);

const exportEmployerCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  created_at: z.string().min(1),
});

const exportVacancyLanguageRequirementSchema = z.object({
  language_code: z.enum(LANGUAGE_CODES),
  min_proficiency: z.enum(LANGUAGE_PROFICIENCY_CODES),
});

const exportEmployerVacancySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().nullable(),
  city: z.string().min(1),
  public_locality: z.string().nullable(),
  job_category: z.enum(JOB_CATEGORY_CODES),
  employment_types: z.array(z.enum(EMPLOYMENT_TYPE_CODES)),
  shift_requirements: z.array(z.enum(CONCRETE_SHIFT_CODES)),
  german_requirement: z.enum(GERMAN_COMFORT_CODES),
  workplace_type: z.string().nullable(),
  work_frequency: z.string().nullable(),
  salary_amount_cents: z.number().int().nullable(),
  salary_currency: z.string().nullable(),
  salary_period: z.string().nullable(),
  salary_is_gross: z.boolean().nullable(),
  cv_required: z.boolean().nullable(),
  interview_english_ok: z.boolean().nullable(),
  experience_notes: z.string().nullable(),
  available_from: z.string().nullable(),
  publication_state: z.enum([
    "draft",
    "published",
    "paused",
    "filled",
    "expired",
    "withdrawn",
  ]),
  source: z.literal("employer"),
  published_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  paused_at: z.string().nullable(),
  filled_at: z.string().nullable(),
  withdrawn_at: z.string().nullable(),
  expired_at: z.string().nullable(),
  created_at: z.string().min(1),
  language_requirements: z.array(exportVacancyLanguageRequirementSchema),
});

/**
 * D-089: exactly the four fields
 * `list_current_employer_export_applications()` returns. Never
 * candidate-identifying — the schema itself is the boundary, not just the
 * database projection.
 */
export const exportEmployerApplicationProcessRowSchema = z
  .object({
    application_id: z.string().uuid(),
    vacancy_id: z.string().uuid(),
    status: applicationStatusSchema,
    submitted_at: z.string().min(1),
  })
  .strict();

export const employerAccountExportProfileSchema = z.object({
  employer_type: employerTypeSchema,
  display_name: z.string().nullable(),
  berlin_locality: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  organisation_legal_name: z.string().nullable(),
  lawful_hiring_declared: z.boolean().nullable(),
  lawful_hiring_declared_at: z.string().nullable(),
  onboarding_completed_at: z.string().nullable(),
  created_at: z.string().min(1),
  verification_state: verificationStateSchema,
  verification_requested_at: z.string().nullable(),
  verification_reviewed_at: z.string().nullable(),
  verification_attested_at: z.string().nullable(),
  verification_attestation_version: z.string().nullable(),
  company: exportEmployerCompanySchema.nullable(),
  vacancies: z.array(exportEmployerVacancySchema),
  applications: z.array(exportEmployerApplicationProcessRowSchema),
});

export const employerAccountExportV1Schema = z.object({
  version: z.literal(ACCOUNT_EXPORT_VERSION),
  exported_at: z.string().min(1),
  account: exportAccountMetadataSchema,
  employer: employerAccountExportProfileSchema,
});

export type EmployerAccountExportV1 = z.infer<
  typeof employerAccountExportV1Schema
>;
