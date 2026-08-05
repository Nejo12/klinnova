import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActiveOperator = vi.hoisted(() => vi.fn());

vi.mock("@/lib/internal/verification/operator-gate", () => ({
  requireActiveOperator,
}));

import { loadVerificationReview } from "@/lib/internal/verification/load-verification-review";

const validId = "22222222-2222-4222-8222-222222222222";

function makeGatedClient(rpcResult: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  return { rpc };
}

const reviewRow = {
  employer_profile_id: validId,
  employer_type: "private" as const,
  display_name: "Ada",
  company_name: null,
  website: null,
  berlin_locality: "Mitte",
  onboarding_completed: true,
  verification_state: "pending" as const,
  verification_requested_at: "2026-08-01T00:00:00Z",
  verification_attested_at: "2026-08-01T00:00:00Z",
  verification_attestation_version: "v1",
  verification_reviewed_at: null,
  verification_review_reason: null,
};

describe("loadVerificationReview", () => {
  beforeEach(() => {
    requireActiveOperator.mockReset();
  });

  it("propagates gate denial without querying the RPC", async () => {
    requireActiveOperator.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
    });

    const result = await loadVerificationReview({} as never, validId);

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("treats a malformed id as unavailable before calling the RPC", async () => {
    const client = makeGatedClient({ data: [reviewRow], error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadVerificationReview({} as never, "not-a-uuid");

    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("treats a nonexistent employer (empty RPC result) as unavailable", async () => {
    const client = makeGatedClient({ data: [], error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadVerificationReview({} as never, validId);

    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  it("maps a transport error to failed", async () => {
    const client = makeGatedClient({
      data: null,
      error: { message: "boom" },
    });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadVerificationReview({} as never, validId);

    expect(result).toEqual({ ok: false, reason: "failed" });
  });

  it("returns camelCase detail for an eligible pending row", async () => {
    const client = makeGatedClient({ data: [reviewRow], error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadVerificationReview({} as never, validId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.review).toEqual({
      employerProfileId: validId,
      employerType: "private",
      displayName: "Ada",
      companyName: null,
      website: null,
      berlinLocality: "Mitte",
      onboardingCompleted: true,
      verificationState: "pending",
      verificationRequestedAt: reviewRow.verification_requested_at,
      verificationAttestedAt: reviewRow.verification_attested_at,
      verificationAttestationVersion: "v1",
      verificationReviewedAt: null,
      verificationReviewReason: null,
    });
    expect(client.rpc).toHaveBeenCalledWith(
      "get_employer_verification_review",
      { p_employer_profile_id: validId },
    );
  });

  it("never returns reviewer identity, email, or exact-address fields", async () => {
    const client = makeGatedClient({ data: [reviewRow], error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadVerificationReview({} as never, validId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.review);
    expect(serialized).not.toMatch(/reviewed_by|email|address/i);
  });
});
