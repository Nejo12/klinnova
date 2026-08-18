"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { loadEmployerDraft } from "@/lib/employer/vacancies/load-employer-draft";
import {
  mapCreateDraftStatus,
  mapDeleteDraftStatus,
  mapReplaceLanguagesStatus,
  mapUpdateDraftStatus,
} from "@/lib/employer/vacancies/map-rpc-status";
import {
  VACANCY_GENERIC_FAILURE,
  VACANCY_INCOMPLETE_EMPLOYER,
  VACANCY_UNAUTHENTICATED,
  VACANCY_UNAVAILABLE,
  VACANCY_VALIDATION,
} from "@/lib/employer/vacancies/messages";
import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";
import {
  createDraftRpcResultSchema,
  createDraftVacancyFormSchema,
  deleteDraftRpcResultSchema,
  deleteDraftVacancySchema,
  parseSalaryFields,
  replaceDraftLanguagesSchema,
  replaceLanguagesRpcResultSchema,
  updateDraftRpcResultSchema,
  updateDraftVacancyFormSchema,
} from "@/lib/employer/vacancies/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type EmployerVacancyActionState = {
  error: string | null;
  message: string | null;
  fieldErrors?: Record<string, string>;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formBoolean(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "true" || value === "on" || value === "1";
}

function formStringArray(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

function fieldErrorsFromZod(
  issues: readonly { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (key.length > 0 && fieldErrors[key] === undefined) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function parseLanguageRows(formData: FormData) {
  const codes = formData.getAll("languageCode");
  const proficiencies = formData.getAll("minProficiency");
  const rows: { languageCode: string; minProficiency: string }[] = [];

  for (let index = 0; index < codes.length; index += 1) {
    const languageCode = codes[index];
    const minProficiency = proficiencies[index];
    if (
      typeof languageCode !== "string" ||
      typeof minProficiency !== "string"
    ) {
      continue;
    }
    if (
      languageCode.trim().length === 0 &&
      minProficiency.trim().length === 0
    ) {
      continue;
    }
    rows.push({
      languageCode: languageCode.trim(),
      minProficiency: minProficiency.trim(),
    });
  }

  return rows;
}

export async function createEmployerVacancyDraftAction(
  _prev: EmployerVacancyActionState,
  formData: FormData,
): Promise<EmployerVacancyActionState> {
  const parsed = createDraftVacancyFormSchema.safeParse({
    title: formString(formData, "title"),
    jobCategory: formString(formData, "jobCategory"),
    publicLocality: formString(formData, "publicLocality"),
    description: formString(formData, "description"),
    workplaceType: formString(formData, "workplaceType"),
    workFrequency: formString(formData, "workFrequency"),
    availableFrom: formString(formData, "availableFrom"),
    experienceNotes: formString(formData, "experienceNotes"),
    germanRequirement: formString(formData, "germanRequirement"),
    cvRequired: formData.get("cvRequired") ?? "",
    interviewEnglishOk: formData.get("interviewEnglishOk") ?? "",
    employmentTypes: formStringArray(formData, "employmentTypes"),
    shiftRequirements: formStringArray(formData, "shiftRequirements"),
    salaryAmountEur: formString(formData, "salaryAmountEur"),
    salaryPeriod: formString(formData, "salaryPeriod"),
    clearSalary: formBoolean(formData, "clearSalary"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? VACANCY_VALIDATION,
      message: null,
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const salary = parseSalaryFields({
    salaryAmountEur: parsed.data.salaryAmountEur,
    salaryPeriod: parsed.data.salaryPeriod,
    clearSalary: parsed.data.clearSalary,
  });

  if (!salary.ok) {
    return {
      error: VACANCY_VALIDATION,
      message: null,
      fieldErrors: salary.fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireCompletedEmployer(supabase);
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") {
      return { error: VACANCY_UNAUTHENTICATED, message: null };
    }
    if (gate.reason === "incomplete") {
      return { error: VACANCY_INCOMPLETE_EMPLOYER, message: null };
    }
    return { error: gate.error, message: null };
  }

  const { data, error } = await gate.supabase.rpc(
    "create_employer_vacancy_draft",
    {
      p_title: parsed.data.title,
      p_job_category: parsed.data.jobCategory,
      p_public_locality: parsed.data.publicLocality,
      p_description: parsed.data.description ?? undefined,
      p_workplace_type: parsed.data.workplaceType ?? undefined,
      p_work_frequency: parsed.data.workFrequency ?? undefined,
      p_available_from: parsed.data.availableFrom ?? undefined,
      p_experience_notes: parsed.data.experienceNotes ?? undefined,
      p_german_requirement: parsed.data.germanRequirement,
      p_cv_required: parsed.data.cvRequired ?? undefined,
      p_interview_english_ok: parsed.data.interviewEnglishOk ?? undefined,
      p_employment_types: parsed.data.employmentTypes,
      p_shift_requirements: parsed.data.shiftRequirements,
      p_salary_amount_cents: salary.value.salaryAmountCents ?? undefined,
      p_salary_period: salary.value.salaryPeriod ?? undefined,
    },
  );

  if (error !== null) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  const rpc = createDraftRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return { error: mapCreateDraftStatus(rpc.data.status), message: null };
  }

  redirect(`/employer/vacancies/${rpc.data.vacancy_id}/edit`);
}

export async function updateEmployerVacancyDraftAction(
  _prev: EmployerVacancyActionState,
  formData: FormData,
): Promise<EmployerVacancyActionState> {
  const parsed = updateDraftVacancyFormSchema.safeParse({
    vacancyId: formString(formData, "vacancyId"),
    title: formString(formData, "title"),
    jobCategory: formString(formData, "jobCategory"),
    publicLocality: formString(formData, "publicLocality"),
    description: formString(formData, "description"),
    workplaceType: formString(formData, "workplaceType"),
    workFrequency: formString(formData, "workFrequency"),
    availableFrom: formString(formData, "availableFrom"),
    clearAvailableFrom: formBoolean(formData, "clearAvailableFrom"),
    experienceNotes: formString(formData, "experienceNotes"),
    germanRequirement: formString(formData, "germanRequirement"),
    cvRequired: formBoolean(formData, "cvRequired"),
    interviewEnglishOk: formBoolean(formData, "interviewEnglishOk"),
    employmentTypes: formStringArray(formData, "employmentTypes"),
    shiftRequirements: formStringArray(formData, "shiftRequirements"),
    salaryAmountEur: formString(formData, "salaryAmountEur"),
    salaryPeriod: formString(formData, "salaryPeriod"),
    clearSalary: formBoolean(formData, "clearSalary"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? VACANCY_VALIDATION,
      message: null,
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const salary = parseSalaryFields({
    salaryAmountEur: parsed.data.salaryAmountEur,
    salaryPeriod: parsed.data.salaryPeriod,
    clearSalary: parsed.data.clearSalary,
  });

  if (!salary.ok) {
    return {
      error: VACANCY_VALIDATION,
      message: null,
      fieldErrors: salary.fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireCompletedEmployer(supabase);
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") {
      return { error: VACANCY_UNAUTHENTICATED, message: null };
    }
    if (gate.reason === "incomplete") {
      return { error: VACANCY_INCOMPLETE_EMPLOYER, message: null };
    }
    return { error: gate.error, message: null };
  }

  const clearAvailableFrom =
    parsed.data.clearAvailableFrom || parsed.data.availableFrom === null;

  const { data, error } = await gate.supabase.rpc(
    "update_employer_vacancy_draft",
    {
      p_vacancy_id: parsed.data.vacancyId,
      p_title: parsed.data.title,
      p_job_category: parsed.data.jobCategory,
      p_public_locality: parsed.data.publicLocality,
      p_description: parsed.data.description ?? "",
      p_workplace_type: parsed.data.workplaceType ?? "",
      p_work_frequency: parsed.data.workFrequency ?? "",
      p_available_from: parsed.data.availableFrom ?? undefined,
      p_clear_available_from: clearAvailableFrom,
      p_experience_notes: parsed.data.experienceNotes ?? "",
      p_german_requirement: parsed.data.germanRequirement,
      p_cv_required: parsed.data.cvRequired,
      p_interview_english_ok: parsed.data.interviewEnglishOk,
      p_employment_types: parsed.data.employmentTypes,
      p_shift_requirements: parsed.data.shiftRequirements,
      p_salary_amount_cents: salary.value.clearSalary
        ? undefined
        : (salary.value.salaryAmountCents ?? undefined),
      p_salary_period: salary.value.clearSalary
        ? undefined
        : (salary.value.salaryPeriod ?? undefined),
      p_clear_salary: salary.value.clearSalary,
    },
  );

  if (error !== null) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  const rpc = updateDraftRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return { error: mapUpdateDraftStatus(rpc.data.status), message: null };
  }

  // The readiness checklist rendered by the edit page's Server Component is
  // fetched once at initial load; without this, a successful save here
  // never refreshes it, leaving the sidebar showing stale "Missing" items
  // for fields that were just completed (D-M5-19).
  revalidatePath(`/employer/vacancies/${parsed.data.vacancyId}/edit`);

  return {
    error: null,
    message: "Draft changes saved.",
  };
}

export async function replaceEmployerVacancyLanguagesAction(
  _prev: EmployerVacancyActionState,
  formData: FormData,
): Promise<EmployerVacancyActionState> {
  const parsed = replaceDraftLanguagesSchema.safeParse({
    vacancyId: formString(formData, "vacancyId"),
    languages: parseLanguageRows(formData),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? VACANCY_VALIDATION,
      message: null,
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireCompletedEmployer(supabase);
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") {
      return { error: VACANCY_UNAUTHENTICATED, message: null };
    }
    if (gate.reason === "incomplete") {
      return { error: VACANCY_INCOMPLETE_EMPLOYER, message: null };
    }
    return { error: gate.error, message: null };
  }

  const { data, error } = await gate.supabase.rpc(
    "replace_employer_vacancy_languages",
    {
      p_vacancy_id: parsed.data.vacancyId,
      p_languages: parsed.data.languages.map((row) => ({
        language_code: row.languageCode,
        min_proficiency: row.minProficiency,
      })),
    },
  );

  if (error !== null) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  const rpc = replaceLanguagesRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return {
      error: mapReplaceLanguagesStatus(rpc.data.status),
      message: null,
    };
  }

  // See updateEmployerVacancyDraftAction's identical comment — without
  // this, the edit page's readiness sidebar never reflects a just-saved
  // language change until a full reload (D-M5-19).
  revalidatePath(`/employer/vacancies/${parsed.data.vacancyId}/edit`);

  return {
    error: null,
    message: "Language requirements saved.",
  };
}

export async function deleteEmployerVacancyDraftAction(
  _prev: EmployerVacancyActionState,
  formData: FormData,
): Promise<EmployerVacancyActionState> {
  const parsed = deleteDraftVacancySchema.safeParse({
    vacancyId: formString(formData, "vacancyId"),
    confirmTitle: formString(formData, "confirmTitle"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? VACANCY_VALIDATION,
      message: null,
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireCompletedEmployer(supabase);
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") {
      return { error: VACANCY_UNAUTHENTICATED, message: null };
    }
    if (gate.reason === "incomplete") {
      return { error: VACANCY_INCOMPLETE_EMPLOYER, message: null };
    }
    return { error: gate.error, message: null };
  }

  // Accidental-delete safeguard: compare against the persisted title, not a
  // client-supplied expectedTitle. Authorization remains the delete RPC.
  const draftResult = await loadEmployerDraft(
    gate.supabase,
    parsed.data.vacancyId,
  );
  if (!draftResult.ok) {
    if (draftResult.reason === "unauthenticated") {
      return { error: VACANCY_UNAUTHENTICATED, message: null };
    }
    if (draftResult.reason === "incomplete") {
      return { error: VACANCY_INCOMPLETE_EMPLOYER, message: null };
    }
    return { error: VACANCY_UNAVAILABLE, message: null };
  }

  if (parsed.data.confirmTitle !== draftResult.draft.title) {
    return {
      error: VACANCY_VALIDATION,
      message: null,
      fieldErrors: {
        confirmTitle: "Type the exact draft title to confirm deletion.",
      },
    };
  }

  const { data, error } = await gate.supabase.rpc(
    "delete_employer_vacancy_draft",
    { p_vacancy_id: parsed.data.vacancyId },
  );

  if (error !== null) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  const rpc = deleteDraftRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return { error: mapDeleteDraftStatus(rpc.data.status), message: null };
  }

  redirect("/employer/vacancies");
}
