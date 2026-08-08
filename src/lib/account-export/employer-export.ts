import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/types/database";

import { resolveCurrentExportAccount } from "./current-account";
import {
  ACCOUNT_EXPORT_VERSION,
  employerAccountExportV1Schema,
  exportEmployerApplicationProcessRowSchema,
  type EmployerAccountExportV1,
} from "./schemas";

export type EmployerAccountExportResult =
  | { kind: "unauthenticated" }
  /** Deleted account, or an authenticated identity with no employer capability — deliberately indistinguishable. */
  | { kind: "unavailable" }
  | { kind: "failure" }
  | { kind: "ok"; payload: EmployerAccountExportV1 };

const employerProfileRowSchema = z.object({
  employer_type: z.string(),
  display_name: z.string().nullable(),
  berlin_locality: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  organisation_legal_name: z.string().nullable(),
  lawful_hiring_declared: z.boolean().nullable(),
  lawful_hiring_declared_at: z.string().nullable(),
  onboarding_completed_at: z.string().nullable(),
  created_at: z.string().min(1),
  verification_state: z.string(),
  verification_requested_at: z.string().nullable(),
  verification_reviewed_at: z.string().nullable(),
  verification_attested_at: z.string().nullable(),
  verification_attestation_version: z.string().nullable(),
});

const companyRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  created_at: z.string().min(1),
});

const vacancyLanguageRequirementRowSchema = z.object({
  vacancy_id: z.string().uuid(),
  language_code: z.string(),
  min_proficiency: z.string(),
});

const vacancyRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  description: z.string().nullable(),
  city: z.string(),
  public_locality: z.string().nullable(),
  job_category: z.string(),
  employment_types: z.array(z.string()),
  shift_requirements: z.array(z.string()),
  german_requirement: z.string(),
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
  publication_state: z.string(),
  source: z.literal("employer"),
  published_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  paused_at: z.string().nullable(),
  filled_at: z.string().nullable(),
  withdrawn_at: z.string().nullable(),
  expired_at: z.string().nullable(),
  created_at: z.string().min(1),
});

/**
 * Own-data employer account export (D-077/D-088/D-089). No new DB
 * RPC/migration — profile/company/vacancies/vacancy_language_requirements
 * are read under the existing `employer_profiles_select_own`/
 * `companies_select_own_employer`/`vacancies_select_own_employer`/
 * `vacancy_language_requirements_select_own_employer` RLS policies
 * (already `not _is_current_employer_deleted()`-gated, on top of the
 * explicit whole-account gate this function checks first). Applications
 * are read ONLY via `list_current_employer_export_applications()` (D-089)
 * — never `list_current_employer_applications`/
 * `get_current_employer_application`, both of which return
 * candidate-identifying fields this export must never carry. Deliberately
 * does not gate on suspension/verification state/onboarding completion —
 * this is an own-data read, not a business operation (D-089).
 */
export async function buildEmployerAccountExport(
  supabase: SupabaseClient<Database>,
): Promise<EmployerAccountExportResult> {
  const account = await resolveCurrentExportAccount(supabase);

  if (account.kind === "unauthenticated") {
    return { kind: "unauthenticated" };
  }
  if (account.kind === "deleted") {
    return { kind: "unavailable" };
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("employer_profiles")
    .select(
      "employer_type, display_name, berlin_locality, phone, website, organisation_legal_name, lawful_hiring_declared, lawful_hiring_declared_at, onboarding_completed_at, created_at, verification_state, verification_requested_at, verification_reviewed_at, verification_attested_at, verification_attestation_version",
    )
    .eq("id", account.userId)
    .maybeSingle();

  if (profileError !== null) {
    return { kind: "failure" };
  }
  if (profileRow === null) {
    return { kind: "unavailable" };
  }

  const parsedProfile = employerProfileRowSchema.safeParse(profileRow);
  if (!parsedProfile.success) {
    return { kind: "failure" };
  }

  const { data: companyRow, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug, created_at")
    .eq("owner_employer_id", account.userId)
    .eq("source", "employer")
    .maybeSingle();

  if (companyError !== null) {
    return { kind: "failure" };
  }
  const parsedCompany =
    companyRow === null ? null : companyRowSchema.safeParse(companyRow);
  if (parsedCompany !== null && !parsedCompany.success) {
    return { kind: "failure" };
  }

  const { data: vacancyRows, error: vacanciesError } = await supabase
    .from("vacancies")
    .select(
      "id, title, slug, summary, description, city, public_locality, job_category, employment_types, shift_requirements, german_requirement, workplace_type, work_frequency, salary_amount_cents, salary_currency, salary_period, salary_is_gross, cv_required, interview_english_ok, experience_notes, available_from, publication_state, source, published_at, expires_at, paused_at, filled_at, withdrawn_at, expired_at, created_at",
    )
    .eq("source", "employer")
    .eq("employer_profile_id", account.userId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (vacanciesError !== null || vacancyRows === null) {
    return { kind: "failure" };
  }
  const parsedVacancies = z.array(vacancyRowSchema).safeParse(vacancyRows);
  if (!parsedVacancies.success) {
    return { kind: "failure" };
  }

  const vacancyIds = parsedVacancies.data.map((vacancy) => vacancy.id);
  const { data: languageRequirementRows, error: languageRequirementsError } =
    vacancyIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("vacancy_language_requirements")
          .select("vacancy_id, language_code, min_proficiency")
          .in("vacancy_id", vacancyIds)
          .order("language_code", { ascending: true });

  if (languageRequirementsError !== null || languageRequirementRows === null) {
    return { kind: "failure" };
  }
  const parsedLanguageRequirements = z
    .array(vacancyLanguageRequirementRowSchema)
    .safeParse(languageRequirementRows);
  if (!parsedLanguageRequirements.success) {
    return { kind: "failure" };
  }

  const { data: applicationRows, error: applicationsError } =
    await supabase.rpc("list_current_employer_export_applications");

  if (applicationsError !== null || applicationRows === null) {
    return { kind: "failure" };
  }
  const parsedApplications = z
    .array(exportEmployerApplicationProcessRowSchema)
    .safeParse(applicationRows);
  if (!parsedApplications.success) {
    return { kind: "failure" };
  }

  const languageRequirementsByVacancy = new Map<
    string,
    { language_code: string; min_proficiency: string }[]
  >();
  for (const requirement of parsedLanguageRequirements.data) {
    const existing =
      languageRequirementsByVacancy.get(requirement.vacancy_id) ?? [];
    existing.push({
      language_code: requirement.language_code,
      min_proficiency: requirement.min_proficiency,
    });
    languageRequirementsByVacancy.set(requirement.vacancy_id, existing);
  }

  const payload = employerAccountExportV1Schema.safeParse({
    version: ACCOUNT_EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    account: account.account,
    employer: {
      employer_type: parsedProfile.data.employer_type,
      display_name: parsedProfile.data.display_name,
      berlin_locality: parsedProfile.data.berlin_locality,
      phone: parsedProfile.data.phone,
      website: parsedProfile.data.website,
      organisation_legal_name: parsedProfile.data.organisation_legal_name,
      lawful_hiring_declared: parsedProfile.data.lawful_hiring_declared,
      lawful_hiring_declared_at: parsedProfile.data.lawful_hiring_declared_at,
      onboarding_completed_at: parsedProfile.data.onboarding_completed_at,
      created_at: parsedProfile.data.created_at,
      verification_state: parsedProfile.data.verification_state,
      verification_requested_at: parsedProfile.data.verification_requested_at,
      verification_reviewed_at: parsedProfile.data.verification_reviewed_at,
      verification_attested_at: parsedProfile.data.verification_attested_at,
      verification_attestation_version:
        parsedProfile.data.verification_attestation_version,
      company: parsedCompany === null ? null : parsedCompany.data,
      vacancies: parsedVacancies.data.map((vacancy) => ({
        ...vacancy,
        language_requirements: [
          ...(languageRequirementsByVacancy.get(vacancy.id) ?? []),
        ].sort((left, right) =>
          left.language_code.localeCompare(right.language_code),
        ),
      })),
      applications: [...parsedApplications.data].sort((left, right) => {
        const bySubmittedAt = left.submitted_at.localeCompare(
          right.submitted_at,
        );
        return bySubmittedAt !== 0
          ? bySubmittedAt
          : left.application_id.localeCompare(right.application_id);
      }),
    },
  });

  if (!payload.success) {
    return { kind: "failure" };
  }

  return { kind: "ok", payload: payload.data };
}
