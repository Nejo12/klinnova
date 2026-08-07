"use server";

import { revalidatePath } from "next/cache";

import {
  MODERATION_GENERIC_FAILURE,
  MODERATION_UNAUTHENTICATED,
  MODERATION_VALIDATION,
} from "@/lib/internal/moderation/messages";
import {
  mapRevokeVerificationStatus,
  mapSuspendEmployerStatus,
  mapUnsuspendEmployerStatus,
} from "@/lib/internal/moderation/map-rpc-status";
import {
  revokeVerificationFormSchema,
  revokeVerificationRpcResultSchema,
  suspendEmployerFormSchema,
  suspendEmployerRpcResultSchema,
  unsuspendEmployerFormSchema,
  unsuspendEmployerRpcResultSchema,
} from "@/lib/internal/moderation/schemas";
import { requireActiveOperator } from "@/lib/internal/verification/operator-gate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type EmployerModerationActionState = {
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

function revalidateEmployerModeration(employerProfileId: string): void {
  revalidatePath("/internal/employers");
  revalidatePath(`/internal/employers/${employerProfileId}`);
}

export async function suspendEmployerAction(
  _prev: EmployerModerationActionState,
  formData: FormData,
): Promise<EmployerModerationActionState> {
  const parsed = suspendEmployerFormSchema.safeParse({
    employerProfileId: formValue(formData, "employerProfileId") ?? "",
    reason: formValue(formData, "reason") ?? "",
    confirmSuspend: formValue(formData, "confirmSuspend") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? MODERATION_VALIDATION,
      message: null,
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return { error: MODERATION_UNAUTHENTICATED, message: null };
  }

  // suspend_employer remains authoritative: it re-verifies operator
  // membership and the employer's current suspension state under a row
  // lock, independent of this gate and any earlier list/detail read.
  const { data, error } = await gate.supabase.rpc("suspend_employer", {
    p_employer_profile_id: parsed.data.employerProfileId,
    p_reason: parsed.data.reason,
  });

  if (error !== null) {
    return { error: MODERATION_GENERIC_FAILURE, message: null };
  }

  const rpc = suspendEmployerRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: MODERATION_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return { error: mapSuspendEmployerStatus(rpc.data.status), message: null };
  }

  revalidateEmployerModeration(parsed.data.employerProfileId);
  return { error: null, message: "Employer suspended." };
}

export async function unsuspendEmployerAction(
  _prev: EmployerModerationActionState,
  formData: FormData,
): Promise<EmployerModerationActionState> {
  const parsed = unsuspendEmployerFormSchema.safeParse({
    employerProfileId: formValue(formData, "employerProfileId") ?? "",
    confirmUnsuspend: formValue(formData, "confirmUnsuspend") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? MODERATION_VALIDATION,
      message: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return { error: MODERATION_UNAUTHENTICATED, message: null };
  }

  const { data, error } = await gate.supabase.rpc("unsuspend_employer", {
    p_employer_profile_id: parsed.data.employerProfileId,
  });

  if (error !== null) {
    return { error: MODERATION_GENERIC_FAILURE, message: null };
  }

  const rpc = unsuspendEmployerRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: MODERATION_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return {
      error: mapUnsuspendEmployerStatus(rpc.data.status),
      message: null,
    };
  }

  revalidateEmployerModeration(parsed.data.employerProfileId);
  return { error: null, message: "Employer unsuspended." };
}

export async function revokeEmployerVerificationAction(
  _prev: EmployerModerationActionState,
  formData: FormData,
): Promise<EmployerModerationActionState> {
  const parsed = revokeVerificationFormSchema.safeParse({
    employerProfileId: formValue(formData, "employerProfileId") ?? "",
    reason: formValue(formData, "reason") ?? "",
    confirmRevoke: formValue(formData, "confirmRevoke") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? MODERATION_VALIDATION,
      message: null,
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return { error: MODERATION_UNAUTHENTICATED, message: null };
  }

  // revoke_employer_verification remains authoritative: it re-verifies
  // operator membership and requires the employer's current
  // verification_state to be 'verified' under a row lock. This is a
  // distinct action from suspend/unsuspend and never combined with it.
  const { data, error } = await gate.supabase.rpc(
    "revoke_employer_verification",
    {
      p_employer_profile_id: parsed.data.employerProfileId,
      p_reason: parsed.data.reason,
    },
  );

  if (error !== null) {
    return { error: MODERATION_GENERIC_FAILURE, message: null };
  }

  const rpc = revokeVerificationRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: MODERATION_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return {
      error: mapRevokeVerificationStatus(rpc.data.status),
      message: null,
    };
  }

  revalidateEmployerModeration(parsed.data.employerProfileId);
  revalidatePath(`/internal/verification/${parsed.data.employerProfileId}`);
  return { error: null, message: "Verification revoked." };
}
