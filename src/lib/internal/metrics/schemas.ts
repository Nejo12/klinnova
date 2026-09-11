import { z } from "zod";

const countSchema = z.number().int().nonnegative();
const percentSchema = z.number().nonnegative().nullable();

export const m5FounderMetricsSchema = z.object({
  m5_started_at: z.string().datetime({ offset: true }),
  measured_at: z.string().datetime({ offset: true }),
  core: z.object({
    participating_employers: countSchema,
    verified_vacancies: countSchema,
    completed_candidates: countSchema,
    submitted_applications: countSchema,
    completed_interview_conversions: countSchema,
    confirmed_hires: countSchema,
  }),
  current_supply: z.object({
    active_safe_participating_employers: countSchema,
    effective_public_vacancies: countSchema,
  }),
  diagnostic: z.object({
    raw_candidate_registrations: countSchema,
    applications_reviewing: countSchema,
    applications_shortlisted: countSchema,
    completed_interview_rounds: countSchema,
  }),
  conversions: z.object({
    candidate_to_application_percent: percentSchema,
    application_to_interview_percent: percentSchema,
    interview_to_hire_percent: percentSchema,
  }),
});

export type M5FounderMetrics = z.infer<typeof m5FounderMetricsSchema>;
