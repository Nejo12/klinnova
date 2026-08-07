import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  applicationIdSchema,
  employerApplicationDetailSchema,
} from "@/lib/employer/applications/schemas";
import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";
import type { Database } from "@/types/database";

export type EmployerApplicationDetailReady = Extract<
  ReturnType<typeof employerApplicationDetailSchema.parse>,
  { status: "ready" }
>;

export type LoadEmployerApplicationResult =
  | { ok: true; application: EmployerApplicationDetailReady }
  | {
      ok: false;
      reason: "unauthenticated" | "incomplete" | "unavailable" | "failed";
      error: string;
    };

type EmployerClient = SupabaseClient<Database>;

/**
 * Load a single owned employer applicant via `get_current_employer_application`
 * only. A malformed application id, an unknown application, and a
 * cross-employer-owned application all collapse to the identical
 * `{ ok: false, reason: "unavailable" }` result — no existence oracle.
 */
export async function loadEmployerApplication(
  supabase: EmployerClient,
  applicationId: string,
): Promise<LoadEmployerApplicationResult> {
  const gate = await requireCompletedEmployer(supabase);
  if (!gate.ok) {
    return gate;
  }

  const idParsed = applicationIdSchema.safeParse(applicationId);
  if (!idParsed.success) {
    return {
      ok: false,
      reason: "unavailable",
      error: "This application is not available.",
    };
  }

  const { data, error } = await gate.supabase.rpc(
    "get_current_employer_application",
    { p_application_id: idParsed.data },
  );

  if (error !== null || data === null) {
    return {
      ok: false,
      reason: "failed",
      error: "Could not load this application.",
    };
  }

  const parsed = employerApplicationDetailSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "failed",
      error: "Could not load this application.",
    };
  }

  if (parsed.data.status !== "ready") {
    return {
      ok: false,
      reason: "unavailable",
      error: "This application is not available.",
    };
  }

  return { ok: true, application: parsed.data };
}
