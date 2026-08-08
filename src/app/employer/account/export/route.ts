import { buildExportHttpResponse } from "@/lib/account-export/export-response";
import { buildEmployerAccountExport } from "@/lib/account-export/employer-export";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * D-088: the employer account surface always returns the employer
 * export only — no role/target parameter exists to change that.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const result = await buildEmployerAccountExport(supabase);
  const response = buildExportHttpResponse("employer", result);

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
