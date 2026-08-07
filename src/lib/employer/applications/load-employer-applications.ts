import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ApplicationListFilter,
  EmployerApplicationListRow,
} from "@/lib/employer/applications/schemas";
import { employerApplicationListSchema } from "@/lib/employer/applications/schemas";
import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";
import type { Database } from "@/types/database";

export type LoadEmployerApplicationsResult =
  | { ok: true; applications: EmployerApplicationListRow[] }
  | {
      ok: false;
      reason: "unauthenticated" | "incomplete" | "failed";
      error: string;
    };

type EmployerClient = SupabaseClient<Database>;

/**
 * Load the current employer's applicant inventory via
 * `list_current_employer_applications` only — no direct read of
 * `applications`, `application_status_history`, `candidate_profiles`,
 * `candidate_languages`, or `vacancies`. The RPC's own `submitted_at desc,
 * application_id asc` ordering is preserved exactly; this loader never
 * re-sorts.
 */
export async function loadEmployerApplications(
  supabase: EmployerClient,
  filter: ApplicationListFilter,
): Promise<LoadEmployerApplicationsResult> {
  const gate = await requireCompletedEmployer(supabase);
  if (!gate.ok) {
    return gate;
  }

  const { data, error } = await gate.supabase.rpc(
    "list_current_employer_applications",
    {
      p_vacancy_id: filter.vacancyId ?? undefined,
      p_status: filter.status ?? undefined,
    },
  );

  if (error !== null || data === null) {
    return {
      ok: false,
      reason: "failed",
      error: "Could not load your applications.",
    };
  }

  const parsed = employerApplicationListSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "failed",
      error: "Could not load your applications.",
    };
  }

  return { ok: true, applications: parsed.data };
}
