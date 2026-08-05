"use server";

import { revalidatePath } from "next/cache";

import {
  mapFillStatus,
  mapMaterializeExpiryStatus,
  mapPauseStatus,
  mapPublishStatus,
  mapRenewStatus,
  mapResumeStatus,
  mapWithdrawStatus,
} from "@/lib/employer/vacancies/map-rpc-status";
import {
  VACANCY_GENERIC_FAILURE,
  VACANCY_UNAUTHENTICATED,
  VACANCY_VALIDATION,
} from "@/lib/employer/vacancies/messages";
import { requireAuthenticatedEmployer } from "@/lib/employer/vacancies/require-authenticated-employer";
import {
  fillVacancyRpcResultSchema,
  materializeExpiryRpcResultSchema,
  pauseVacancyRpcResultSchema,
  publishVacancyRpcResultSchema,
  renewVacancyRpcResultSchema,
  resumeVacancyRpcResultSchema,
  vacancyLifecycleConfirmFormSchema,
  vacancyLifecycleFormSchema,
  withdrawVacancyRpcResultSchema,
} from "@/lib/employer/vacancies/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type EmployerVacancyLifecycleActionState = {
  error: string | null;
  message: string | null;
  missing?: string[];
};

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseVacancyId(
  formData: FormData,
): { ok: true; vacancyId: string } | { ok: false; error: string } {
  const parsed = vacancyLifecycleFormSchema.safeParse({
    vacancyId: formValue(formData, "vacancyId"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? VACANCY_VALIDATION,
    };
  }
  return { ok: true, vacancyId: parsed.data.vacancyId };
}

/**
 * For the six consequential transitions (all but materialize-expiry), the
 * explicit confirmation checkbox is validated server-side, not merely
 * relied on as a disabled submit button.
 */
function parseConfirmedVacancyId(
  formData: FormData,
): { ok: true; vacancyId: string } | { ok: false; error: string } {
  const parsed = vacancyLifecycleConfirmFormSchema.safeParse({
    vacancyId: formValue(formData, "vacancyId"),
    confirmed: formValue(formData, "confirmed"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? VACANCY_VALIDATION,
    };
  }
  return { ok: true, vacancyId: parsed.data.vacancyId };
}

function revalidateVacancyRoutes(vacancyId: string): void {
  revalidatePath("/employer/vacancies");
  revalidatePath(`/employer/vacancies/${vacancyId}`);
}

export async function publishEmployerVacancyAction(
  _prev: EmployerVacancyLifecycleActionState,
  formData: FormData,
): Promise<EmployerVacancyLifecycleActionState> {
  const id = parseConfirmedVacancyId(formData);
  if (!id.ok) {
    return { error: id.error, message: null };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireAuthenticatedEmployer(supabase);
  if (!gate.ok) {
    return { error: VACANCY_UNAUTHENTICATED, message: null };
  }

  // publish_employer_vacancy remains authoritative: it re-verifies ownership,
  // current publication_state, employer completion, employer verification,
  // and every readiness field under a row lock — independent of any earlier
  // page load.
  const { data, error } = await gate.supabase.rpc("publish_employer_vacancy", {
    p_vacancy_id: id.vacancyId,
  });

  if (error !== null) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  const rpc = publishVacancyRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return {
      error: mapPublishStatus(rpc.data.status),
      message: null,
      missing: rpc.data.status === "incomplete" ? rpc.data.missing : undefined,
    };
  }

  revalidateVacancyRoutes(id.vacancyId);
  return { error: null, message: "Vacancy published." };
}

export async function pauseEmployerVacancyAction(
  _prev: EmployerVacancyLifecycleActionState,
  formData: FormData,
): Promise<EmployerVacancyLifecycleActionState> {
  const id = parseConfirmedVacancyId(formData);
  if (!id.ok) {
    return { error: id.error, message: null };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireAuthenticatedEmployer(supabase);
  if (!gate.ok) {
    return { error: VACANCY_UNAUTHENTICATED, message: null };
  }

  const { data, error } = await gate.supabase.rpc("pause_employer_vacancy", {
    p_vacancy_id: id.vacancyId,
  });

  if (error !== null) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  const rpc = pauseVacancyRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return { error: mapPauseStatus(rpc.data.status), message: null };
  }

  revalidateVacancyRoutes(id.vacancyId);
  return { error: null, message: "Vacancy paused." };
}

export async function resumeEmployerVacancyAction(
  _prev: EmployerVacancyLifecycleActionState,
  formData: FormData,
): Promise<EmployerVacancyLifecycleActionState> {
  const id = parseConfirmedVacancyId(formData);
  if (!id.ok) {
    return { error: id.error, message: null };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireAuthenticatedEmployer(supabase);
  if (!gate.ok) {
    return { error: VACANCY_UNAUTHENTICATED, message: null };
  }

  // No caller-supplied expiry. resume_employer_vacancy keeps the existing
  // expires_at if it is still in the future; a default 30-day expiry is
  // passed only as the server-computed fallback the RPC uses when the
  // stored expiry has already elapsed (never as an override of a still-valid
  // one — that decision stays inside the RPC).
  const fallbackExpiry = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await gate.supabase.rpc("resume_employer_vacancy", {
    p_vacancy_id: id.vacancyId,
    p_expires_at: fallbackExpiry,
  });

  if (error !== null) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  const rpc = resumeVacancyRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return {
      error: mapResumeStatus(rpc.data.status),
      message: null,
      missing: rpc.data.status === "incomplete" ? rpc.data.missing : undefined,
    };
  }

  revalidateVacancyRoutes(id.vacancyId);
  return { error: null, message: "Vacancy resumed." };
}

export async function fillEmployerVacancyAction(
  _prev: EmployerVacancyLifecycleActionState,
  formData: FormData,
): Promise<EmployerVacancyLifecycleActionState> {
  const id = parseConfirmedVacancyId(formData);
  if (!id.ok) {
    return { error: id.error, message: null };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireAuthenticatedEmployer(supabase);
  if (!gate.ok) {
    return { error: VACANCY_UNAUTHENTICATED, message: null };
  }

  const { data, error } = await gate.supabase.rpc("fill_employer_vacancy", {
    p_vacancy_id: id.vacancyId,
  });

  if (error !== null) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  const rpc = fillVacancyRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return { error: mapFillStatus(rpc.data.status), message: null };
  }

  revalidateVacancyRoutes(id.vacancyId);
  return { error: null, message: "Vacancy marked filled." };
}

export async function withdrawEmployerVacancyAction(
  _prev: EmployerVacancyLifecycleActionState,
  formData: FormData,
): Promise<EmployerVacancyLifecycleActionState> {
  const id = parseConfirmedVacancyId(formData);
  if (!id.ok) {
    return { error: id.error, message: null };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireAuthenticatedEmployer(supabase);
  if (!gate.ok) {
    return { error: VACANCY_UNAUTHENTICATED, message: null };
  }

  const { data, error } = await gate.supabase.rpc("withdraw_employer_vacancy", {
    p_vacancy_id: id.vacancyId,
  });

  if (error !== null) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  const rpc = withdrawVacancyRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return { error: mapWithdrawStatus(rpc.data.status), message: null };
  }

  revalidateVacancyRoutes(id.vacancyId);
  return { error: null, message: "Vacancy withdrawn." };
}

export async function materializeEmployerVacancyExpiryAction(
  _prev: EmployerVacancyLifecycleActionState,
  formData: FormData,
): Promise<EmployerVacancyLifecycleActionState> {
  const id = parseVacancyId(formData);
  if (!id.ok) {
    return { error: id.error, message: null };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireAuthenticatedEmployer(supabase);
  if (!gate.ok) {
    return { error: VACANCY_UNAUTHENTICATED, message: null };
  }

  const { data, error } = await gate.supabase.rpc(
    "materialize_employer_vacancy_expiry",
    { p_vacancy_id: id.vacancyId },
  );

  if (error !== null) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  const rpc = materializeExpiryRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return {
      error: mapMaterializeExpiryStatus(rpc.data.status),
      message: null,
    };
  }

  revalidateVacancyRoutes(id.vacancyId);
  return { error: null, message: "Expiry status refreshed." };
}

export async function renewEmployerVacancyAction(
  _prev: EmployerVacancyLifecycleActionState,
  formData: FormData,
): Promise<EmployerVacancyLifecycleActionState> {
  const id = parseConfirmedVacancyId(formData);
  if (!id.ok) {
    return { error: id.error, message: null };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireAuthenticatedEmployer(supabase);
  if (!gate.ok) {
    return { error: VACANCY_UNAUTHENTICATED, message: null };
  }

  const { data, error } = await gate.supabase.rpc(
    "renew_employer_vacancy_to_draft",
    { p_vacancy_id: id.vacancyId },
  );

  if (error !== null) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  const rpc = renewVacancyRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: VACANCY_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return { error: mapRenewStatus(rpc.data.status), message: null };
  }

  revalidateVacancyRoutes(id.vacancyId);
  return { error: null, message: "Vacancy renewed to draft." };
}
