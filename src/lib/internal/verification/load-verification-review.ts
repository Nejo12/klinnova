import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireActiveOperator } from "@/lib/internal/verification/operator-gate";
import {
  employerProfileIdSchema,
  verificationReviewListSchema,
} from "@/lib/internal/verification/schemas";
import type { Database } from "@/types/database";

export type VerificationReviewData = {
  employerProfileId: string;
  employerType: "private" | "organisation";
  displayName: string | null;
  companyName: string | null;
  website: string | null;
  berlinLocality: string | null;
  onboardingCompleted: boolean;
  verificationState: "pending" | "verified" | "rejected";
  verificationRequestedAt: string;
  verificationAttestedAt: string;
  verificationAttestationVersion: string;
  verificationReviewedAt: string | null;
  verificationReviewReason: string | null;
};

export type LoadVerificationReviewResult =
  | { ok: true; review: VerificationReviewData }
  | {
      ok: false;
      reason: "unauthenticated" | "not_operator" | "unavailable" | "failed";
    };

/**
 * Load minimum review detail for one employer, active operators only.
 * Malformed ids, nonexistent employers, and unsupported states
 * (unverified/revoked) all collapse to the same "unavailable" reason —
 * this loader must not become a broad employer-profile lookup, and the
 * caller must not use these cases to distinguish anything.
 */
export async function loadVerificationReview(
  supabase: SupabaseClient<Database>,
  employerProfileId: string,
): Promise<LoadVerificationReviewResult> {
  const gate = await requireActiveOperator(supabase);
  if (!gate.ok) {
    return gate;
  }

  const idParsed = employerProfileIdSchema.safeParse(employerProfileId);
  if (!idParsed.success) {
    return { ok: false, reason: "unavailable" };
  }

  const { data, error } = await gate.supabase.rpc(
    "get_employer_verification_review",
    { p_employer_profile_id: idParsed.data },
  );

  if (error !== null) {
    return { ok: false, reason: "failed" };
  }

  const parsed = verificationReviewListSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, reason: "failed" };
  }

  const row = parsed.data[0];
  if (row === undefined) {
    return { ok: false, reason: "unavailable" };
  }

  return {
    ok: true,
    review: {
      employerProfileId: row.employer_profile_id,
      employerType: row.employer_type,
      displayName: row.display_name,
      companyName: row.company_name,
      website: row.website,
      berlinLocality: row.berlin_locality,
      onboardingCompleted: row.onboarding_completed,
      verificationState: row.verification_state,
      verificationRequestedAt: row.verification_requested_at,
      verificationAttestedAt: row.verification_attested_at,
      verificationAttestationVersion: row.verification_attestation_version,
      verificationReviewedAt: row.verification_reviewed_at,
      verificationReviewReason: row.verification_review_reason,
    },
  };
}
