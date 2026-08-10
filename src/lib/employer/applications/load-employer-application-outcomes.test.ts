import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadEmployerApplicationOutcomes } from "@/lib/employer/applications/load-employer-application-outcomes";

const applicationId = "11111111-1111-4111-8111-111111111111";

describe("loadEmployerApplicationOutcomes", () => {
  const rpc = vi.fn();
  const supabase = { rpc } as unknown as Parameters<
    typeof loadEmployerApplicationOutcomes
  >[0];

  beforeEach(() => {
    rpc.mockReset();
  });

  it("returns not-ok for a malformed application id, without calling the RPC", async () => {
    const result = await loadEmployerApplicationOutcomes(
      supabase,
      "not-a-uuid",
    );
    expect(result).toEqual({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls employer_application_outcomes with only the application id", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await loadEmployerApplicationOutcomes(supabase, applicationId);
    expect(rpc).toHaveBeenCalledWith("employer_application_outcomes", {
      p_application_id: applicationId,
    });
  });

  it("returns an empty list for a cross-employer application — no existence oracle, not an error", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const result = await loadEmployerApplicationOutcomes(
      supabase,
      applicationId,
    );
    expect(result).toEqual({ ok: true, outcomes: [] });
  });

  it("returns both active and voided rows in the RPC's own order", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          outcome_event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          outcome_type: "interview_completed",
          occurred_at: "2026-08-01T00:00:00Z",
          recorded_at: "2026-08-01T00:00:00Z",
          voided_at: null,
        },
        {
          outcome_event_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          outcome_type: "hired",
          occurred_at: "2026-08-05T00:00:00Z",
          recorded_at: "2026-08-05T00:00:00Z",
          voided_at: "2026-08-06T00:00:00Z",
        },
      ],
      error: null,
    });
    const result = await loadEmployerApplicationOutcomes(
      supabase,
      applicationId,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcomes.map((entry) => entry.outcome_type)).toEqual([
        "interview_completed",
        "hired",
      ]);
      expect(result.outcomes[1]?.voided_at).toBe("2026-08-06T00:00:00Z");
    }
  });

  it("excludes recorded_by/voided_by even if present in the payload", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          outcome_event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          outcome_type: "hired",
          occurred_at: "2026-08-01T00:00:00Z",
          recorded_at: "2026-08-01T00:00:00Z",
          voided_at: null,
          recorded_by: "should be stripped",
          voided_by: "should be stripped",
        },
      ],
      error: null,
    });
    const result = await loadEmployerApplicationOutcomes(
      supabase,
      applicationId,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcomes[0]).not.toHaveProperty("recorded_by");
      expect(result.outcomes[0]).not.toHaveProperty("voided_by");
    }
  });

  it("fails closed on a malformed outcome payload", async () => {
    rpc.mockResolvedValue({
      data: [{ outcome_event_id: "not-a-uuid" }],
      error: null,
    });
    const result = await loadEmployerApplicationOutcomes(
      supabase,
      applicationId,
    );
    expect(result).toEqual({ ok: false });
  });

  it("normalizes a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });
    const result = await loadEmployerApplicationOutcomes(
      supabase,
      applicationId,
    );
    expect(result).toEqual({ ok: false });
  });
});
