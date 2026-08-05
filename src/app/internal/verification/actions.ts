"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  mapApproveVerificationStatus,
  mapRejectVerificationStatus,
} from "@/lib/internal/verification/map-rpc-status";
import {
  INTERNAL_GENERIC_FAILURE,
  INTERNAL_UNAVAILABLE,
  INTERNAL_VALIDATION,
} from "@/lib/internal/verification/messages";
import { requireActiveOperator } from "@/lib/internal/verification/operator-gate";
import {
  approveVerificationFormSchema,
  approveVerificationRpcResultSchema,
  rejectVerificationFormSchema,
  rejectVerificationRpcResultSchema,
} from "@/lib/internal/verification/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type InternalVerificationActionState = {
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

function revalidateVerification(employerProfileId: string): void {
  revalidatePath("/internal/verification");
  revalidatePath(`/internal/verification/${employerProfileId}`);
}

export async function approveVerificationAction(
  _prev: InternalVerificationActionState,
  formData: FormData,
): Promise<InternalVerificationActionState> {
  const parsed = approveVerificationFormSchema.safeParse({
    employerProfileId: formValue(formData, "employerProfileId") ?? "",
    confirmApprove: formValue(formData, "confirmApprove") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? INTERNAL_VALIDATION,
      message: null,
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return { error: INTERNAL_UNAVAILABLE, message: null };
  }

  // The operator-check gate above is defense in depth. approve_employer_verification
  // remains the authoritative check — it re-verifies operator membership and the
  // employer's current pending state under a row lock, independent of this gate
  // and independent of any earlier queue/detail read.
  const { data, error } = await gate.supabase.rpc(
    "approve_employer_verification",
    { p_employer_profile_id: parsed.data.employerProfileId },
  );

  if (error !== null) {
    return { error: INTERNAL_GENERIC_FAILURE, message: null };
  }

  const rpc = approveVerificationRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: INTERNAL_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return {
      error: mapApproveVerificationStatus(rpc.data.status),
      message: null,
    };
  }

  revalidateVerification(parsed.data.employerProfileId);
  redirect("/internal/verification");
}

export async function rejectVerificationAction(
  _prev: InternalVerificationActionState,
  formData: FormData,
): Promise<InternalVerificationActionState> {
  const parsed = rejectVerificationFormSchema.safeParse({
    employerProfileId: formValue(formData, "employerProfileId") ?? "",
    reason: formValue(formData, "reason") ?? "",
    confirmReject: formValue(formData, "confirmReject") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? INTERNAL_VALIDATION,
      message: null,
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return { error: INTERNAL_UNAVAILABLE, message: null };
  }

  // Same defense-in-depth note as approve: reject_employer_verification
  // rechecks operator membership and pending state itself, under lock.
  const { data, error } = await gate.supabase.rpc(
    "reject_employer_verification",
    {
      p_employer_profile_id: parsed.data.employerProfileId,
      p_reason: parsed.data.reason,
    },
  );

  if (error !== null) {
    return { error: INTERNAL_GENERIC_FAILURE, message: null };
  }

  const rpc = rejectVerificationRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: INTERNAL_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return {
      error: mapRejectVerificationStatus(rpc.data.status),
      message: null,
    };
  }

  revalidateVerification(parsed.data.employerProfileId);
  redirect("/internal/verification");
}
