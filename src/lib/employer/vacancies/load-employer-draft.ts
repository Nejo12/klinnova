import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EmployerType } from "@/lib/employer/schemas";
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

export type EmployerDraftDetail = {
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
  publicationState: "draft" | "paused";
  updatedAt: string;
  createdAt: string;
  languages: LanguageRequirementRow[];
  ready: boolean;
  checklist: ReadinessChecklistItem[];
  readinessAvailable: boolean;
};

export type LoadEmployerDraftResult =
  | { ok: true; draft: EmployerDraftDetail }
  | {
      ok: false;
      reason: "unauthenticated" | "incomplete" | "unavailable" | "failed";
      error: string;
    };

type EmployerClient = SupabaseClient<Database>;

/**
 * Load a single owned, currently-editable employer vacancy with languages
 * and readiness. Editable states are `draft` and `paused` (D-058 editing
 * matrix, mirrored by `update_employer_vacancy_draft` /
 * `replace_employer_vacancy_languages`, which enforce the same states
 * server-side). Missing, seed, foreign, and non-editable-state IDs all map
 * to unavailable.
 */
export async function loadEmployerDraft(
  supabase: EmployerClient,
  vacancyId: string,
): Promise<LoadEmployerDraftResult> {
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
      employer_profile_id,
      companies(name)
    `,
    )
    .eq("id", idParsed.data)
    .eq("source", "employer")
    .in("publication_state", ["draft", "paused"])
    .eq("employer_profile_id", gate.userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      reason: "failed",
      error: "Could not load this vacancy draft.",
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
      error: "Could not load language requirements for this draft.",
    };
  }

  const readinessCall = await gate.supabase.rpc(
    "employer_vacancy_draft_readiness",
    { p_vacancy_id: row.id },
  );

  let ready = false;
  let checklist: ReadinessChecklistItem[] = [];
  let readinessAvailable = false;

  if (readinessCall.error === null) {
    const parsed = readinessRpcResultSchema.safeParse(readinessCall.data);
    if (parsed.success && parsed.data.status === "ok") {
      ready = parsed.data.ready;
      checklist = mapReadinessChecklist(parsed.data.missing);
      readinessAvailable = true;
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

  return {
    ok: true,
    draft: {
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
      publicationState: row.publication_state as "draft" | "paused",
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      languages: languageRows.flatMap((language) => {
        const parsedLanguage = languageRequirementRowSchema.safeParse({
          languageCode: language.language_code,
          minProficiency: language.min_proficiency,
        });
        return parsedLanguage.success ? [parsedLanguage.data] : [];
      }),
      ready,
      checklist,
      readinessAvailable,
    },
  };
}
