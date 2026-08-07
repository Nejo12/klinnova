"use server";

import { revalidatePath } from "next/cache";

import {
  MODERATION_GENERIC_FAILURE,
  MODERATION_UNAUTHENTICATED,
  MODERATION_VALIDATION,
} from "@/lib/internal/moderation/messages";
import {
  mapModerateVacancyStatus,
  mapRestoreVacancyStatus,
} from "@/lib/internal/moderation/map-rpc-status";
import {
  moderateVacancyFormSchema,
  moderateVacancyRpcResultSchema,
  restoreVacancyFormSchema,
  restoreVacancyRpcResultSchema,
} from "@/lib/internal/moderation/schemas";
import { requireActiveOperator } from "@/lib/internal/verification/operator-gate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type VacancyModerationActionState = {
  error: string | null;
  message: string | null;
  fieldErrors?: Record<string, string>;
};

function formValue(formData: FormData, key: string): FormDataEntryValue | null {
  return formData.get(key);
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

function revalidateVacancyModeration(
  employerProfileId: string,
  vacancyId: string,
): void {
  revalidatePath(`/internal/employers/${employerProfileId}`);
  revalidatePath(
    `/internal/employers/${employerProfileId}/vacancies/${vacancyId}`,
  );
}

export async function moderateVacancyAction(
  _prev: VacancyModerationActionState,
  formData: FormData,
): Promise<VacancyModerationActionState> {
  const parsed = moderateVacancyFormSchema.safeParse({
    vacancyId: formValue(formData, "vacancyId") ?? "",
    reason: formValue(formData, "reason") ?? "",
    confirmModerate: formValue(formData, "confirmModerate") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? MODERATION_VALIDATION,
      message: null,
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const employerProfileId = formValue(formData, "employerProfileId");
  if (typeof employerProfileId !== "string" || employerProfileId === "") {
    return { error: MODERATION_GENERIC_FAILURE, message: null };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return { error: MODERATION_UNAUTHENTICATED, message: null };
  }

  // moderate_vacancy remains authoritative: it re-verifies operator
  // membership and the vacancy's current moderation state under a row
  // lock, independent of this gate and any earlier detail read.
  const { data, error } = await gate.supabase.rpc("moderate_vacancy", {
    p_vacancy_id: parsed.data.vacancyId,
    p_reason: parsed.data.reason,
  });

  if (error !== null) {
    return { error: MODERATION_GENERIC_FAILURE, message: null };
  }

  const rpc = moderateVacancyRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: MODERATION_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return { error: mapModerateVacancyStatus(rpc.data.status), message: null };
  }

  revalidateVacancyModeration(employerProfileId, parsed.data.vacancyId);
  return { error: null, message: "Vacancy moderated." };
}

export async function restoreVacancyAction(
  _prev: VacancyModerationActionState,
  formData: FormData,
): Promise<VacancyModerationActionState> {
  const parsed = restoreVacancyFormSchema.safeParse({
    vacancyId: formValue(formData, "vacancyId") ?? "",
    confirmRestore: formValue(formData, "confirmRestore") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? MODERATION_VALIDATION,
      message: null,
    };
  }

  const employerProfileId = formValue(formData, "employerProfileId");
  if (typeof employerProfileId !== "string" || employerProfileId === "") {
    return { error: MODERATION_GENERIC_FAILURE, message: null };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return { error: MODERATION_UNAUTHENTICATED, message: null };
  }

  const { data, error } = await gate.supabase.rpc("restore_vacancy", {
    p_vacancy_id: parsed.data.vacancyId,
  });

  if (error !== null) {
    return { error: MODERATION_GENERIC_FAILURE, message: null };
  }

  const rpc = restoreVacancyRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: MODERATION_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return { error: mapRestoreVacancyStatus(rpc.data.status), message: null };
  }

  revalidateVacancyModeration(employerProfileId, parsed.data.vacancyId);
  return { error: null, message: "Vacancy moderation hold removed." };
}
