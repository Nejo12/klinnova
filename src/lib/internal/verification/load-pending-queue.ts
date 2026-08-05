import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireActiveOperator } from "@/lib/internal/verification/operator-gate";
import { pendingVerificationListSchema } from "@/lib/internal/verification/schemas";
import type { Database } from "@/types/database";

export type PendingVerificationRow = {
  employerProfileId: string;
  employerType: "private" | "organisation";
  displayName: string | null;
  companyName: string | null;
  website: string | null;
  onboardingCompleted: boolean;
  verificationRequestedAt: string;
  verificationAttestedAt: string;
  verificationAttestationVersion: string;
};

export type LoadPendingQueueResult =
  | { ok: true; rows: PendingVerificationRow[] }
  | { ok: false; reason: "unauthenticated" | "not_operator" | "failed" };

/**
 * Load the minimum-field pending queue for an active operator only.
 * Authorization comes from the operator gate — never from this result
 * being empty or non-empty.
 */
export async function loadPendingVerificationQueue(
  supabase: SupabaseClient<Database>,
): Promise<LoadPendingQueueResult> {
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return gate;
  }

  const { data, error } = await gate.supabase.rpc(
    "list_pending_employer_verifications",
  );

  if (error !== null) {
    return { ok: false, reason: "failed" };
  }

  const parsed = pendingVerificationListSchema.safeParse(data);
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
      website: row.website,
      onboardingCompleted: row.onboarding_completed,
      verificationRequestedAt: row.verification_requested_at,
      verificationAttestedAt: row.verification_attested_at,
      verificationAttestationVersion: row.verification_attestation_version,
    })),
  };
}
