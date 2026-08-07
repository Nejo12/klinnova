import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActiveOperator = vi.hoisted(() => vi.fn());

vi.mock("@/lib/internal/verification/operator-gate", () => ({
  requireActiveOperator,
}));

import { loadOperatorEmployers } from "@/lib/internal/moderation/load-employers";

function makeGatedClient(rpcResult: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  return { rpc };
}

const employerRow = {
  employer_profile_id: "11111111-1111-4111-8111-111111111111",
  employer_type: "private" as const,
  display_name: "Ada Employer",
  company_name: null,
  onboarding_completed: true,
  verification_state: "verified" as const,
  suspended: false,
  suspended_at: null,
  created_at: "2026-08-01T00:00:00Z",
};

describe("loadOperatorEmployers", () => {
  beforeEach(() => {
    requireActiveOperator.mockReset();
  });

  it("propagates gate denial without calling the RPC", async () => {
    requireActiveOperator.mockResolvedValue({
      ok: false,
      reason: "not_operator",
    });

    const result = await loadOperatorEmployers({} as never, {
      limit: 50,
      offset: 0,
    });

    expect(result).toEqual({ ok: false, reason: "not_operator" });
  });

  it("calls the RPC with the exact bounded limit/offset", async () => {
    const client = makeGatedClient({ data: [employerRow], error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    await loadOperatorEmployers({} as never, { limit: 50, offset: 100 });

    expect(client.rpc).toHaveBeenCalledWith("list_employers_for_operator", {
      p_limit: 50,
      p_offset: 100,
    });
  });

  it("maps a transport error to failed", async () => {
    const client = makeGatedClient({ data: null, error: { message: "boom" } });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadOperatorEmployers({} as never, {
      limit: 50,
      offset: 0,
    });

    expect(result).toEqual({ ok: false, reason: "failed" });
  });

  it("maps a malformed RPC payload to failed", async () => {
    const client = makeGatedClient({ data: { not: "an array" }, error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadOperatorEmployers({} as never, {
      limit: 50,
      offset: 0,
    });

    expect(result).toEqual({ ok: false, reason: "failed" });
  });

  it("returns camelCase rows, including the suspended flag", async () => {
    const client = makeGatedClient({ data: [employerRow], error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadOperatorEmployers({} as never, {
      limit: 50,
      offset: 0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([
      {
        employerProfileId: employerRow.employer_profile_id,
        employerType: "private",
        displayName: "Ada Employer",
        companyName: null,
        onboardingCompleted: true,
        verificationState: "verified",
        suspended: false,
        suspendedAt: null,
        createdAt: employerRow.created_at,
      },
    ]);
  });

  it("never returns an actor id or suspension reason", async () => {
    const client = makeGatedClient({
      data: [
        {
          ...employerRow,
          suspended: true,
          suspended_at: "2026-08-05T00:00:00Z",
        },
      ],
      error: null,
    });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadOperatorEmployers({} as never, {
      limit: 50,
      offset: 0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.rows);
    expect(serialized).not.toMatch(/actor|reason|suspended_by/i);
  });
});
