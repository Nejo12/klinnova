import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { operatorEmployerListSchema } from "@/lib/internal/moderation/schemas";
import { requireActiveOperator } from "@/lib/internal/verification/operator-gate";
import type { Database } from "@/types/database";

export type OperatorEmployerRow = {
  employerProfileId: string;
  employerType: "private" | "organisation";
  displayName: string | null;
  companyName: string | null;
  onboardingCompleted: boolean;
  verificationState:
    "unverified" | "pending" | "verified" | "rejected" | "revoked";
  suspended: boolean;
  suspendedAt: string | null;
  createdAt: string;
};

export type LoadOperatorEmployersResult =
  | { ok: true; rows: OperatorEmployerRow[] }
  | { ok: false; reason: "unauthenticated" | "not_operator" | "failed" };

/**
 * Load the bounded, operator-only employer moderation list via
 * `list_employers_for_operator` only — no direct table reads. Authorization
 * comes from the operator gate; a non-operator's zero-row RPC result must
 * never be treated as authorization on its own.
 */
export async function loadOperatorEmployers(
  supabase: SupabaseClient<Database>,
  page: { limit: number; offset: number },
): Promise<LoadOperatorEmployersResult> {
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return gate;
  }

  const { data, error } = await gate.supabase.rpc(
    "list_employers_for_operator",
    { p_limit: page.limit, p_offset: page.offset },
  );

  if (error !== null) {
    return { ok: false, reason: "failed" };
  }

  const parsed = operatorEmployerListSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, reason: "failed" };
  }

  return {
    ok: true,
    rows: parsed.data.map((row) => ({
      employerProfileId: row.employer_profile_id,
      employerType: row.employer_type,
      displayName: row.display_name,
      companyName: row.company_name,
      onboardingCompleted: row.onboarding_completed,
      verificationState: row.verification_state,
      suspended: row.suspended,
      suspendedAt: row.suspended_at,
      createdAt: row.created_at,
    })),
  };
}
