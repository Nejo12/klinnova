"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  transitionApplicationRpcResultSchema,
  transitionFormSchema,
} from "@/lib/employer/applications/schemas";
import type { TransitionApplicationActionState } from "@/lib/employer/applications/transition-action-state";
import { requireAuthenticatedEmployer } from "@/lib/employer/vacancies/require-authenticated-employer";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateApplicationRoutes(applicationId: string): void {
  revalidatePath("/employer/applications");
  revalidatePath(`/employer/applications/${applicationId}`);
}

/**
 * Transitions a single employer-owned application. Accepts only the
 * application id, the target status, and an optional reason — never an
 * employer id, actor id, current-status-as-authority, or timestamp.
 * `transition_current_employer_application_status` remains the sole
 * authority: it re-locks and re-reads the live row, independent of
 * whatever status the page last rendered.
 */
export async function transitionEmployerApplicationAction(
  _prev: TransitionApplicationActionState,
  formData: FormData,
): Promise<TransitionApplicationActionState> {
  const parsed = transitionFormSchema.safeParse({
    applicationId: formValue(formData, "applicationId"),
    targetStatus: formValue(formData, "targetStatus"),
    reason: formValue(formData, "reason"),
  });

  if (!parsed.success) {
    return { kind: "failure" };
  }

  const detailPath = `/employer/applications/${parsed.data.applicationId}`;

  const supabase = await createServerSupabaseClient();
  const gate = await requireAuthenticatedEmployer(supabase);
  if (!gate.ok) {
    redirect(`/login?next=${encodeURIComponent(detailPath)}`);
  }

  const { data, error } = await gate.supabase.rpc(
    "transition_current_employer_application_status",
    {
      p_application_id: parsed.data.applicationId,
      p_target_status: parsed.data.targetStatus,
      p_reason: parsed.data.reason ?? undefined,
    },
  );

  if (error !== null || data === null) {
    return { kind: "failure" };
  }

  const rpc = transitionApplicationRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { kind: "failure" };
  }

  if (rpc.data.result === "employer_unavailable") {
    redirect("/employer/onboarding");
  }

  revalidateApplicationRoutes(parsed.data.applicationId);

  switch (rpc.data.result) {
    case "updated":
      return { kind: "updated", currentStatus: rpc.data.current_status };
    case "already_in_state":
      return {
        kind: "already_in_state",
        currentStatus: rpc.data.current_status,
      };
    case "invalid_transition":
      return { kind: "invalid_transition" };
    case "unavailable":
      return { kind: "unavailable" };
  }
}
