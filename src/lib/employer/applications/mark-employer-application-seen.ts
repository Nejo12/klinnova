import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  applicationIdSchema,
  markApplicationSeenRpcResultSchema,
} from "@/lib/employer/applications/schemas";
import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";
import type { Database } from "@/types/database";

type EmployerClient = SupabaseClient<Database>;

/**
 * N4: acknowledges one employer-owned application as seen, via
 * `mark_employer_application_seen` only — never a direct table write (the
 * `applications` table carries zero authenticated UPDATE grant, by design;
 * every mutation in this schema is RPC-mediated). Ownership/completion/
 * suspension are enforced entirely inside the RPC itself; this wrapper
 * exists only to validate the id and translate the result, matching every
 * other loader in this module.
 *
 * Idempotent and monotonic (the RPC uses `coalesce`): calling this more
 * than once for the same application, from repeated page loads, multiple
 * tabs, or a duplicate request, always converges to the same seen state
 * without error.
 */
export async function markEmployerApplicationSeen(
  supabase: EmployerClient,
  applicationId: string,
): Promise<{ ok: true } | { ok: false }> {
  const gate = await requireCompletedEmployer(supabase);
  if (!gate.ok) {
    return { ok: false };
  }

  const idParsed = applicationIdSchema.safeParse(applicationId);
  if (!idParsed.success) {
    return { ok: false };
  }

  const { data, error } = await gate.supabase.rpc(
    "mark_employer_application_seen",
    { p_application_id: idParsed.data },
  );

  if (error !== null || data === null) {
    return { ok: false };
  }

  const parsed = markApplicationSeenRpcResultSchema.safeParse(data);
  if (!parsed.success || parsed.data.result !== "ok") {
    return { ok: false };
  }

  return { ok: true };
}
