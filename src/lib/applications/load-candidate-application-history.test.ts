import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc })),
}));

import { loadCandidateApplicationHistory } from "@/lib/applications/load-candidate-application-history";

const applicationId = "11111111-1111-4111-8111-111111111111";

describe("loadCandidateApplicationHistory", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("returns not-ok for a malformed application id, without calling the RPC", async () => {
    const result = await loadCandidateApplicationHistory("not-a-uuid");
    expect(result).toEqual({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls list_current_candidate_application_status_history with only the application id", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await loadCandidateApplicationHistory(applicationId);
    expect(rpc).toHaveBeenCalledWith(
      "list_current_candidate_application_status_history",
      { p_application_id: applicationId },
    );
  });

  it("preserves the RPC's own row order and never re-sorts", async () => {
    rpc.mockResolvedValue({
      data: [
        { to_status: "submitted", occurred_at: "2026-08-01T00:00:00Z" },
        { to_status: "reviewing", occurred_at: "2026-08-02T00:00:00Z" },
      ],
      error: null,
    });
    const result = await loadCandidateApplicationHistory(applicationId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.history.map((h) => h.to_status)).toEqual([
        "submitted",
        "reviewing",
      ]);
    }
  });

  it("excludes any reason or actor identity field even if present in the payload", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          to_status: "rejected",
          occurred_at: "2026-08-01T00:00:00Z",
          reason: "should be stripped",
          actor_user_id: "should be stripped",
        },
      ],
      error: null,
    });
    const result = await loadCandidateApplicationHistory(applicationId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.history[0]).not.toHaveProperty("reason");
      expect(result.history[0]).not.toHaveProperty("actor_user_id");
    }
  });

  it("fails closed on a malformed history payload", async () => {
    rpc.mockResolvedValue({
      data: [{ to_status: "archived", occurred_at: "2026-08-01T00:00:00Z" }],
      error: null,
    });
    const result = await loadCandidateApplicationHistory(applicationId);
    expect(result).toEqual({ ok: false });
  });

  it("normalizes a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });
    const result = await loadCandidateApplicationHistory(applicationId);
    expect(result).toEqual({ ok: false });
  });
});
