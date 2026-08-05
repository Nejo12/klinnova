import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActiveOperator = vi.hoisted(() => vi.fn());

vi.mock("@/lib/internal/verification/operator-gate", () => ({
  requireActiveOperator,
}));

import { loadPendingVerificationQueue } from "@/lib/internal/verification/load-pending-queue";

function makeGatedClient(rpcResult: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  return { rpc };
}

const pendingRow = {
  employer_profile_id: "11111111-1111-4111-8111-111111111111",
  employer_type: "organisation" as const,
  display_name: "Ada Org",
  company_name: "Ada Co",
  website: null,
  onboarding_completed: true,
  verification_state: "pending" as const,
  verification_requested_at: "2026-08-01T00:00:00Z",
  verification_attested_at: "2026-08-01T00:00:00Z",
  verification_attestation_version: "v1",
};

describe("loadPendingVerificationQueue", () => {
  beforeEach(() => {
    requireActiveOperator.mockReset();
  });

  it("propagates gate denial without calling the RPC", async () => {
    requireActiveOperator.mockResolvedValue({
      ok: false,
      reason: "not_operator",
    });

    const result = await loadPendingVerificationQueue({} as never);

    expect(result).toEqual({ ok: false, reason: "not_operator" });
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

    const result = await loadPendingVerificationQueue({} as never);

    expect(result).toEqual({ ok: false, reason: "failed" });
  });

  it("maps a malformed RPC payload to failed", async () => {
    const client = makeGatedClient({ data: { not: "an array" }, error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadPendingVerificationQueue({} as never);

    expect(result).toEqual({ ok: false, reason: "failed" });
  });

  it("returns camelCase rows for an active operator, preserving RPC order", async () => {
    const client = makeGatedClient({ data: [pendingRow], error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadPendingVerificationQueue({} as never);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([
      {
        employerProfileId: pendingRow.employer_profile_id,
        employerType: "organisation",
        displayName: "Ada Org",
        companyName: "Ada Co",
        website: null,
        onboardingCompleted: true,
        verificationRequestedAt: pendingRow.verification_requested_at,
        verificationAttestedAt: pendingRow.verification_attested_at,
        verificationAttestationVersion: "v1",
      },
    ]);
    expect(client.rpc).toHaveBeenCalledWith(
      "list_pending_employer_verifications",
    );
  });

  it("returns an empty list without inferring anything about operator status", async () => {
    const client = makeGatedClient({ data: [], error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadPendingVerificationQueue({} as never);

    expect(result).toEqual({ ok: true, rows: [] });
  });

  it("never returns reviewer identity, email, or private-address fields", async () => {
    const client = makeGatedClient({ data: [pendingRow], error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadPendingVerificationQueue({} as never);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.rows);
    expect(serialized).not.toMatch(/reviewed_by|email|address/i);
  });
});
