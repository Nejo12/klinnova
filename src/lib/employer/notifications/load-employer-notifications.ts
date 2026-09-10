import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { employerNotificationsSchema } from "@/lib/employer/notifications/schemas";
import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";
import type { Database } from "@/types/database";

export type LoadEmployerNotificationsResult =
  | {
      ok: true;
      notifications: ReturnType<typeof employerNotificationsSchema.parse>;
    }
  | {
      ok: false;
      reason: "unauthenticated" | "incomplete" | "failed";
      error: string;
    };

export async function loadEmployerNotifications(
  supabase: SupabaseClient<Database>,
): Promise<LoadEmployerNotificationsResult> {
  const gate = await requireCompletedEmployer(supabase);
  if (!gate.ok) {
    return gate;
  }

  const { data, error } = await gate.supabase.rpc(
    "list_current_employer_notifications",
  );

  if (error !== null || data === null) {
    return {
      ok: false,
      reason: "failed",
      error: "Could not load notifications.",
    };
  }

  const parsed = employerNotificationsSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "failed",
      error: "Could not load notifications.",
    };
  }

  return { ok: true, notifications: parsed.data };
}
