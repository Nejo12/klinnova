import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EmployerType } from "@/lib/employer/schemas";
import type { VacancyLifecycleState } from "@/lib/employer/vacancies/load-employer-drafts";
import {
  mapReadinessChecklist,
  type ReadinessChecklistItem,
} from "@/lib/employer/vacancies/readiness";
import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";
import {
  languageRequirementRowSchema,
  readinessRpcResultSchema,
  vacancyIdSchema,
  type LanguageRequirementRow,
} from "@/lib/employer/vacancies/schemas";
import type { Database } from "@/types/database";

export type EmployerVacancyDetail = {
  id: string;
  title: string;
  jobCategory: string;
  publicLocality: string | null;
  description: string | null;
  workplaceType: string | null;
  workFrequency: string | null;
  availableFrom: string | null;
  experienceNotes: string | null;
  cvRequired: boolean | null;
  interviewEnglishOk: boolean | null;
  salaryAmountCents: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  salaryIsGross: boolean | null;
  employerType: EmployerType;
  companyName: string | null;
  updatedAt: string;
  createdAt: string;
  languages: LanguageRequirementRow[];
  publicationState: VacancyLifecycleState;
  publishedAt: string | null;
  pausedAt: string | null;
  filledAt: string | null;
  withdrawnAt: string | null;
  expiredAt: string | null;
  expiresAt: string | null;
  /**
   * True only when `publicationState === "published"` and the stored
   * `expiresAt` has already elapsed — computed server-side from the
   * database row at render time, purely for display. The lifecycle RPCs
   * (`is_vacancy_effectively_public`, `materialize_employer_vacancy_expiry`)
   * remain the sole mutation-time authority; this flag never gates an
   * action by itself.
   */
  isEffectivelyExpired: boolean;
  verificationState: string;
  ready: boolean | null;
  checklist: ReadinessChecklistItem[];
  readinessAvailable: boolean;
};

export type LoadEmployerVacancyResult =
  | { ok: true; vacancy: EmployerVacancyDetail }
  | {
      ok: false;
      reason: "unauthenticated" | "incomplete" | "unavailable" | "failed";
      error: string;
    };

type EmployerClient = SupabaseClient<Database>;

/**
 * Load a single owned employer vacancy in any lifecycle state for the
 * `/employer/vacancies/[vacancyId]` manage page. Unlike `loadEmployerDraft`
 * (edit-only, `draft`/`paused`), this loader returns read-only display data
 * for every state. It never authorizes a mutation — the lifecycle RPCs
 * (`publish_employer_vacancy`, `pause_employer_vacancy`,
 * `resume_employer_vacancy`, `fill_employer_vacancy`,
 * `withdraw_employer_vacancy`, `materialize_employer_vacancy_expiry`,
 * `renew_employer_vacancy_to_draft`) remain the sole authority for every
 * transition.
 */
export async function loadEmployerVacancy(
  supabase: EmployerClient,
  vacancyId: string,
): Promise<LoadEmployerVacancyResult> {
  const gate = await requireCompletedEmployer(supabase);
  if (!gate.ok) {
    return gate;
  }

  const idParsed = vacancyIdSchema.safeParse(vacancyId);
  if (!idParsed.success) {
    return {
      ok: false,
      reason: "unavailable",
      error: "This vacancy is not available.",
    };
  }

  const { data: row, error } = await gate.supabase
    .from("vacancies")
    .select(
      `
      id,
      title,
      job_category,
      public_locality,
      description,
      workplace_type,
      work_frequency,
      available_from,
      experience_notes,
      cv_required,
      interview_english_ok,
      salary_amount_cents,
      salary_currency,
      salary_period,
      salary_is_gross,
      updated_at,
      created_at,
      source,
      publication_state,
      published_at,
      paused_at,
      filled_at,
      withdrawn_at,
      expired_at,
      expires_at,
      employer_profile_id,
      companies(name)
    `,
    )
    .eq("id", idParsed.data)
    .eq("source", "employer")
    .eq("employer_profile_id", gate.userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      reason: "failed",
      error: "Could not load this vacancy.",
    };
  }

  if (row === null) {
    return {
      ok: false,
      reason: "unavailable",
      error: "This vacancy is not available.",
    };
  }

  const { data: languageRows, error: languageError } = await gate.supabase
    .from("vacancy_language_requirements")
    .select("language_code, min_proficiency")
    .eq("vacancy_id", row.id)
    .order("language_code", { ascending: true });

  if (languageError || languageRows === null) {
    return {
      ok: false,
      reason: "failed",
      error: "Could not load language requirements for this vacancy.",
    };
  }

  let ready: boolean | null = null;
  let checklist: ReadinessChecklistItem[] = [];
  let readinessAvailable = false;

  if (row.publication_state === "draft") {
    const readinessCall = await gate.supabase.rpc(
      "employer_vacancy_draft_readiness",
      { p_vacancy_id: row.id },
    );

    if (readinessCall.error === null) {
      const parsed = readinessRpcResultSchema.safeParse(readinessCall.data);
      if (parsed.success && parsed.data.status === "ok") {
        ready = parsed.data.ready;
        checklist = mapReadinessChecklist(parsed.data.missing);
        readinessAvailable = true;
      }
    }
  }

  const companyRelation = row.companies;
  const companyName =
    companyRelation !== null &&
    typeof companyRelation === "object" &&
    "name" in companyRelation &&
    typeof companyRelation.name === "string"
      ? companyRelation.name
      : (gate.profile.company?.name ?? null);

  const isEffectivelyExpired =
    row.publication_state === "published" &&
    row.expires_at !== null &&
    new Date(row.expires_at).getTime() <= Date.now();

  return {
    ok: true,
    vacancy: {
      id: row.id,
      title: row.title,
      jobCategory: row.job_category,
      publicLocality: row.public_locality,
      description: row.description,
      workplaceType: row.workplace_type,
      workFrequency: row.work_frequency,
      availableFrom: row.available_from,
      experienceNotes: row.experience_notes,
      cvRequired: row.cv_required,
      interviewEnglishOk: row.interview_english_ok,
      salaryAmountCents: row.salary_amount_cents,
      salaryCurrency: row.salary_currency,
      salaryPeriod: row.salary_period,
      salaryIsGross: row.salary_is_gross,
      employerType: gate.profile.employerType,
      companyName:
        gate.profile.employerType === "organisation" ? companyName : null,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      languages: languageRows.flatMap((language) => {
        const parsedLanguage = languageRequirementRowSchema.safeParse({
          languageCode: language.language_code,
          minProficiency: language.min_proficiency,
        });
        return parsedLanguage.success ? [parsedLanguage.data] : [];
      }),
      publicationState: row.publication_state as VacancyLifecycleState,
      publishedAt: row.published_at,
      pausedAt: row.paused_at,
      filledAt: row.filled_at,
      withdrawnAt: row.withdrawn_at,
      expiredAt: row.expired_at,
      expiresAt: row.expires_at,
      isEffectivelyExpired,
      verificationState: gate.profile.verificationState,
      ready,
      checklist,
      readinessAvailable,
    },
  };
}
