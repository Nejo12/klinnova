import { z } from "zod";
import { loadCandidateCompletionStatus } from "@/lib/onboarding/candidate-completion-status";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const completion = await loadCandidateCompletionStatus(supabase);
  if (completion.status !== "complete")
    return Response.json(
      { unreadCount: null },
      {
        status: completion.status === "failure" ? 503 : 401,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  const { data, error } = await supabase.rpc(
    "count_current_candidate_unread_notifications",
  );
  const parsed = z.number().int().min(0).safeParse(data);
  return Response.json(
    { unreadCount: error === null && parsed.success ? parsed.data : null },
    {
      status: error === null && parsed.success ? 200 : 503,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
