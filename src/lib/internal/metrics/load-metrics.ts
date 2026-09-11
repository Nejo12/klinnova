import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { m5FounderMetricsSchema } from "@/lib/internal/metrics/schemas";
import { requireActiveOperator } from "@/lib/internal/verification/operator-gate";
import type { Database } from "@/types/database";

export type LoadM5MetricsResult =
  | { ok: true; metrics: ReturnType<typeof m5FounderMetricsSchema.parse> }
  | { ok: false; reason: "unauthenticated" | "not_operator" | "failed" };

export async function loadM5FounderMetrics(
  supabase: SupabaseClient<Database>,
): Promise<LoadM5MetricsResult> {
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return gate;
  }

  const { data, error } = await gate.supabase.rpc("get_m5_founder_metrics");

  if (error !== null) {
    return { ok: false, reason: "failed" };
  }

  const parsed = m5FounderMetricsSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, reason: "failed" };
  }

  return { ok: true, metrics: parsed.data };
}
