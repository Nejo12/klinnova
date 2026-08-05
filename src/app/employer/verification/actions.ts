"use server";

import { revalidatePath } from "next/cache";

import { mapRequestVerificationStatus } from "@/lib/employer/verification/map-rpc-status";
import {
  VERIFICATION_GENERIC_FAILURE,
  VERIFICATION_INCOMPLETE_EMPLOYER,
  VERIFICATION_REQUESTED,
  VERIFICATION_UNAUTHENTICATED,
} from "@/lib/employer/verification/messages";
import {
  requestVerificationFormSchema,
  requestVerificationRpcResultSchema,
} from "@/lib/employer/verification/schemas";
import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type EmployerVerificationActionState = {
  error: string | null;
  message: string | null;
  fieldErrors?: Record<string, string>;
};

function formValue(formData: FormData, key: string): FormDataEntryValue | null {
  return formData.get(key);
}

export async function requestEmployerVerificationAction(
  _prev: EmployerVerificationActionState,
  formData: FormData,
): Promise<EmployerVerificationActionState> {
  const parsed = requestVerificationFormSchema.safeParse({
    attestationConfirmed: formValue(formData, "attestationConfirmed") ?? "",
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Confirm the attestation before requesting verification.",
      message: null,
      fieldErrors: {
        attestationConfirmed: "Confirm the attestation to continue.",
      },
    };
  }

  const supabase = await createServerSupabaseClient();
  const gate = await requireCompletedEmployer(supabase);
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") {
      return { error: VERIFICATION_UNAUTHENTICATED, message: null };
    }
    if (gate.reason === "incomplete") {
      return { error: VERIFICATION_INCOMPLETE_EMPLOYER, message: null };
    }
    return { error: gate.error, message: null };
  }

  const { data, error } = await gate.supabase.rpc(
    "request_employer_verification",
  );

  if (error !== null) {
    return { error: VERIFICATION_GENERIC_FAILURE, message: null };
  }

  const rpc = requestVerificationRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { error: VERIFICATION_GENERIC_FAILURE, message: null };
  }

  if (rpc.data.status !== "ok") {
    return {
      error: mapRequestVerificationStatus(rpc.data.status),
      message: null,
    };
  }

  revalidatePath("/employer/verification");
  revalidatePath("/employer");

  return { error: null, message: VERIFICATION_REQUESTED };
}
