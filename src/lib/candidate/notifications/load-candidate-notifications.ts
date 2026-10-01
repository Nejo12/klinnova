import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { candidateNotificationsSchema } from "@/lib/candidate/notifications/schemas";
import { loadCandidateCompletionStatus } from "@/lib/onboarding/candidate-completion-status";
import type { Database } from "@/types/database";

export async function loadCandidateNotifications(
  supabase: SupabaseClient<Database>,
) {
  const completion = await loadCandidateCompletionStatus(supabase);
  if (completion.status !== "complete") return completion;
  const { data, error } = await supabase.rpc(
    "list_current_candidate_notifications",
  );
  const parsed = candidateNotificationsSchema.safeParse(data);
  if (error !== null || !parsed.success) return { status: "failure" as const };
  return { status: "ready" as const, notifications: parsed.data };
}
