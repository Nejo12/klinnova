import { buildCandidateAccountExport } from "@/lib/account-export/candidate-export";
import { buildExportHttpResponse } from "@/lib/account-export/export-response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * D-088: the candidate account surface always returns the candidate
 * export only — no role/target parameter exists to change that.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const result = await buildCandidateAccountExport(supabase);
  const response = buildExportHttpResponse("candidate", result);

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
