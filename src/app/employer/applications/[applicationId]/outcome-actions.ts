"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  berlinTodayIso,
  computeOccurredAtIso,
} from "@/lib/applications/outcome-type";
import type {
  RecordOutcomeActionState,
  VoidOutcomeActionState,
} from "@/lib/employer/applications/outcome-action-state";
import {
  recordApplicationOutcomeRpcResultSchema,
  recordOutcomeFormSchema,
  voidApplicationOutcomeRpcResultSchema,
  voidOutcomeFormSchema,
} from "@/lib/employer/applications/schemas";
import { requireAuthenticatedEmployer } from "@/lib/employer/vacancies/require-authenticated-employer";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Records an interview/hire outcome for a single employer-owned
 * application, via `record_application_outcome` only (M5.1 Unit E,
 * D-M5-22). Accepts only the application id, outcome type, and a plain
 * calendar date — never an employer id, actor id, or a client-constructed
 * timestamp beyond the date-to-instant conversion in
 * `computeOccurredAtIso`. `record_application_outcome` remains the sole
 * authority for the temporal window and every authorization/ownership
 * check; this action does not attempt to pre-empt or duplicate that logic,
 * only to avoid an obviously-invalid future date reaching the RPC at all.
 *
 * `requireAuthenticatedEmployer` (auth-only, not `requireCompletedEmployer`)
 * is deliberate — mirrors `transitionEmployerApplicationAction` exactly:
 * the RPC itself is the completeness/suspension/ownership/deleted-candidate
 * authority and collapses every one of those cases into a single
 * `unavailable` result. Inventing a stricter pre-check here would either
 * duplicate that logic or produce a discriminant the RPC cannot back.
 */
export async function recordApplicationOutcomeAction(
  _prev: RecordOutcomeActionState,
  formData: FormData,
): Promise<RecordOutcomeActionState> {
  const parsed = recordOutcomeFormSchema.safeParse({
    applicationId: formValue(formData, "applicationId"),
    outcomeType: formValue(formData, "outcomeType"),
    occurredAtDate: formValue(formData, "occurredAtDate"),
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

  const conversion = computeOccurredAtIso(
    parsed.data.occurredAtDate,
    berlinTodayIso(),
    new Date(),
  );
  if (!conversion.ok) {
    return { kind: "invalid_occurred_at" };
  }

  const { data, error } = await gate.supabase.rpc(
    "record_application_outcome",
    {
      p_application_id: parsed.data.applicationId,
      p_outcome_type: parsed.data.outcomeType,
      p_occurred_at: conversion.occurredAtIso,
    },
  );

  if (error !== null || data === null) {
    return { kind: "failure" };
  }

  const rpc = recordApplicationOutcomeRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { kind: "failure" };
  }

  if (rpc.data.result === "ok") {
    revalidatePath(detailPath);
    return {
      kind: "recorded",
      outcomeEventId: rpc.data.outcome_event_id,
      outcomeType: rpc.data.outcome_type,
      occurredAt: rpc.data.occurred_at,
    };
  }

  switch (rpc.data.result) {
    case "already_hired":
      return { kind: "already_hired" };
    case "invalid_occurred_at":
      return { kind: "invalid_occurred_at" };
    case "invalid_outcome_type":
      // Defensive only — unreachable via the form's constrained <select>.
      return { kind: "failure" };
    case "unavailable":
      return { kind: "unavailable" };
  }
}

/**
 * Voids a single outcome event, via `void_application_outcome` only.
 * `applicationId` is accepted only to build the revalidation path — never
 * passed to the RPC itself, which authorizes and locates the event purely
 * from `outcomeEventId` and the caller's own ownership (never an employer
 * id or a void reason; D-M5-22 has no free-text void reason). Same
 * `requireAuthenticatedEmployer` gate and `unavailable` bounding as
 * `recordApplicationOutcomeAction`, for the same reasons.
 */
export async function voidApplicationOutcomeAction(
  _prev: VoidOutcomeActionState,
  formData: FormData,
): Promise<VoidOutcomeActionState> {
  const parsed = voidOutcomeFormSchema.safeParse({
    applicationId: formValue(formData, "applicationId"),
    outcomeEventId: formValue(formData, "outcomeEventId"),
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

  const { data, error } = await gate.supabase.rpc("void_application_outcome", {
    p_outcome_event_id: parsed.data.outcomeEventId,
  });

  if (error !== null || data === null) {
    return { kind: "failure" };
  }

  const rpc = voidApplicationOutcomeRpcResultSchema.safeParse(data);
  if (!rpc.success) {
    return { kind: "failure" };
  }

  if (rpc.data.result === "ok") {
    revalidatePath(detailPath);
    return { kind: "voided" };
  }

  switch (rpc.data.result) {
    case "already_voided":
      return { kind: "already_voided" };
    case "unavailable":
      return { kind: "unavailable" };
  }
}
