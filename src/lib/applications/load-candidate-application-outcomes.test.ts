import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc })),
}));

import { loadCandidateApplicationOutcomes } from "@/lib/applications/load-candidate-application-outcomes";

const applicationId = "11111111-1111-4111-8111-111111111111";

describe("loadCandidateApplicationOutcomes", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("returns not-ok for a malformed application id, without calling the RPC", async () => {
    const result = await loadCandidateApplicationOutcomes("not-a-uuid");
    expect(result).toEqual({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls candidate_application_outcomes with only the application id", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await loadCandidateApplicationOutcomes(applicationId);
    expect(rpc).toHaveBeenCalledWith("candidate_application_outcomes", {
      p_application_id: applicationId,
    });
  });

  it("returns an empty list for an application with no active outcome events yet — not an error", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const result = await loadCandidateApplicationOutcomes(applicationId);
    expect(result).toEqual({ ok: true, outcomes: [] });
  });

  it("preserves the RPC's own row order and never re-sorts", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          outcome_type: "interview_completed",
          occurred_at: "2026-08-01T00:00:00Z",
        },
        { outcome_type: "hired", occurred_at: "2026-08-05T00:00:00Z" },
      ],
      error: null,
    });
    const result = await loadCandidateApplicationOutcomes(applicationId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcomes.map((entry) => entry.outcome_type)).toEqual([
        "interview_completed",
        "hired",
      ]);
    }
  });

  it("excludes outcome_event_id, recorded_at, voided_at, and actor identity even if present in the payload", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          outcome_type: "hired",
          occurred_at: "2026-08-01T00:00:00Z",
          outcome_event_id: "should be stripped",
          recorded_at: "should be stripped",
          recorded_by: "should be stripped",
          voided_at: "should be stripped",
        },
      ],
      error: null,
    });
    const result = await loadCandidateApplicationOutcomes(applicationId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcomes[0]).not.toHaveProperty("outcome_event_id");
      expect(result.outcomes[0]).not.toHaveProperty("recorded_at");
      expect(result.outcomes[0]).not.toHaveProperty("recorded_by");
      expect(result.outcomes[0]).not.toHaveProperty("voided_at");
    }
  });

  it("fails closed on a malformed outcome payload (unknown outcome_type)", async () => {
    rpc.mockResolvedValue({
      data: [
        { outcome_type: "interview_set", occurred_at: "2026-08-01T00:00:00Z" },
      ],
      error: null,
    });
    const result = await loadCandidateApplicationOutcomes(applicationId);
    expect(result).toEqual({ ok: false });
  });

  it("normalizes a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });
    const result = await loadCandidateApplicationOutcomes(applicationId);
    expect(result).toEqual({ ok: false });
  });
});
