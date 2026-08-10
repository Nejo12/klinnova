import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  applicationIdSchema,
  employerOutcomeEventListSchema,
  type EmployerOutcomeEventRow,
} from "@/lib/employer/applications/schemas";
import type { Database } from "@/types/database";

export type { EmployerOutcomeEventRow };

export type LoadEmployerApplicationOutcomesResult =
  { ok: true; outcomes: EmployerOutcomeEventRow[] } | { ok: false };

type EmployerClient = SupabaseClient<Database>;

/**
 * Employer read via `employer_application_outcomes` only (M5.1 Unit E,
 * D-M5-22) — never a direct `application_outcome_events` read. The RPC
 * self-gates (employer completeness/suspension/deletion + application
 * ownership) and returns zero rows, not an error, for anything it denies —
 * this loader adds no gate of its own and relies on the callerpage
 * (`/employer/applications/[applicationId]`) already having established an
 * authenticated employer session before this ever runs, exactly like
 * `loadCandidateApplicationOutcomes` on the candidate side.
 * `{ ok: false }` is fail-soft: callers show a small inline notice and keep
 * the rest of the application-detail page intact, rather than failing the
 * whole page over this secondary read.
 */
export async function loadEmployerApplicationOutcomes(
  supabase: EmployerClient,
  applicationId: string,
): Promise<LoadEmployerApplicationOutcomesResult> {
  const idParsed = applicationIdSchema.safeParse(applicationId);
  if (!idParsed.success) {
    return { ok: false };
  }

  const { data, error } = await supabase.rpc("employer_application_outcomes", {
    p_application_id: idParsed.data,
  });

  if (error !== null || data === null) {
    return { ok: false };
  }

  const parsed = employerOutcomeEventListSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false };
  }

  return { ok: true, outcomes: parsed.data };
}
