import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { countUnseenApplicationsRpcResultSchema } from "@/lib/employer/applications/schemas";
import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";
import type { Database } from "@/types/database";

type EmployerClient = SupabaseClient<Database>;

/**
 * N4: the current employer's unseen-application count for the Applications
 * navigation indicator, via `count_unseen_current_employer_applications`
 * only. Derived fresh from source rows on every call (no maintained
 * counter to fall out of sync). Returns `0` for any non-`ok` outcome
 * (unauthenticated, incomplete employer, suspended, or a transport/parse
 * failure) — the navigation badge fails closed to "no indicator" rather
 * than surfacing an error state in a shell rendered on every employer page.
 */
export async function loadUnseenApplicationsCount(
  supabase: EmployerClient,
): Promise<number> {
  const gate = await requireCompletedEmployer(supabase);
  if (!gate.ok) {
    return 0;
  }

  const { data, error } = await gate.supabase.rpc(
    "count_unseen_current_employer_applications",
  );

  if (error !== null || data === null) {
    return 0;
  }

  const parsed = countUnseenApplicationsRpcResultSchema.safeParse(data);
  if (!parsed.success || parsed.data.result !== "ok") {
    return 0;
  }

  return parsed.data.count;
}
