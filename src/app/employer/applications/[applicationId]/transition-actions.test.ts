import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const requireAuthenticatedEmployer = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
);
const notifyCandidateOfStatusChange = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ status: "sent", providerMessageId: "test-id" }),
);

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc })),
}));

vi.mock("@/lib/employer/vacancies/require-authenticated-employer", () => ({
  requireAuthenticatedEmployer,
}));

vi.mock("@/lib/applications/notify-candidate-status-change", () => ({
  notifyCandidateOfStatusChange,
}));

import { transitionEmployerApplicationAction } from "@/app/employer/applications/[applicationId]/transition-actions";

const applicationId = "11111111-1111-4111-8111-111111111111";

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}

beforeEach(() => {
  rpc.mockReset();
  requireAuthenticatedEmployer.mockReset();
  revalidatePath.mockClear();
  redirectMock.mockClear();
  notifyCandidateOfStatusChange.mockReset();
  notifyCandidateOfStatusChange.mockResolvedValue({
    status: "sent",
    providerMessageId: "test-id",
  });
  requireAuthenticatedEmployer.mockResolvedValue({
    ok: true,
    supabase: { rpc },
    userId: "emp-1",
  });
});

function updatedRpcResult(currentStatus: string) {
  return {
    data: {
      result: "updated",
      application_id: applicationId,
      previous_status: "submitted",
      current_status: currentStatus,
      occurred_at: "2026-08-06T00:00:00Z",
    },
    error: null,
  };
}

describe("transitionEmployerApplicationAction", () => {
  it("rejects a malformed application id before checking the gate", async () => {
    const state = await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId: "bad-id", targetStatus: "reviewing", reason: "" }),
    );
    expect(state).toEqual({ kind: "failure" });
    expect(requireAuthenticatedEmployer).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an unknown target status before calling the RPC", async () => {
    const state = await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "archived", reason: "" }),
    );
    expect(state).toEqual({ kind: "failure" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("redirects to login when unauthenticated", async () => {
    requireAuthenticatedEmployer.mockResolvedValue({ ok: false });
    await expect(
      transitionEmployerApplicationAction(
        { kind: "idle" },
        form({ applicationId, targetStatus: "reviewing", reason: "" }),
      ),
    ).rejects.toThrow(/REDIRECT:\/login/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends only application id, target status, and reason — never employer id, actor id, or timestamp", async () => {
    rpc.mockResolvedValue({
      data: {
        result: "updated",
        application_id: applicationId,
        previous_status: "submitted",
        current_status: "reviewing",
        occurred_at: "2026-08-06T00:00:00Z",
      },
      error: null,
    });

    await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "reviewing", reason: "" }),
    );

    expect(rpc).toHaveBeenCalledWith(
      "transition_current_employer_application_status",
      {
        p_application_id: applicationId,
        p_target_status: "reviewing",
        p_reason: undefined,
      },
    );
  });

  it("passes a trimmed non-blank reason only for a rejected target", async () => {
    rpc.mockResolvedValue({
      data: {
        result: "updated",
        application_id: applicationId,
        previous_status: "submitted",
        current_status: "rejected",
        occurred_at: "2026-08-06T00:00:00Z",
      },
      error: null,
    });

    await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({
        applicationId,
        targetStatus: "rejected",
        reason: "  Not a fit  ",
      }),
    );

    expect(rpc.mock.calls[0]?.[1]).toEqual({
      p_application_id: applicationId,
      p_target_status: "rejected",
      p_reason: "Not a fit",
    });
  });

  it("returns a typed updated result and revalidates both application routes", async () => {
    rpc.mockResolvedValue({
      data: {
        result: "updated",
        application_id: applicationId,
        previous_status: "submitted",
        current_status: "reviewing",
        occurred_at: "2026-08-06T00:00:00Z",
      },
      error: null,
    });

    const state = await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "reviewing", reason: "" }),
    );

    expect(state).toEqual({ kind: "updated", currentStatus: "reviewing" });
    expect(revalidatePath).toHaveBeenCalledWith("/employer/applications");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/employer/applications/${applicationId}`,
    );
  });

  it("does not notify the candidate when a genuinely new transition lands on reviewing (N3: no reviewing email)", async () => {
    rpc.mockResolvedValue(updatedRpcResult("reviewing"));

    await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "reviewing", reason: "" }),
    );

    expect(notifyCandidateOfStatusChange).not.toHaveBeenCalled();
  });

  it.each(["shortlisted", "accepted", "rejected"] as const)(
    "notifies the candidate exactly once when a genuinely new transition lands on %s (N3 email matrix: yes)",
    async (targetStatus) => {
      rpc.mockResolvedValue(updatedRpcResult(targetStatus));

      const state = await transitionEmployerApplicationAction(
        { kind: "idle" },
        form({ applicationId, targetStatus, reason: "" }),
      );

      expect(state).toEqual({ kind: "updated", currentStatus: targetStatus });
      expect(notifyCandidateOfStatusChange).toHaveBeenCalledTimes(1);
      expect(notifyCandidateOfStatusChange).toHaveBeenCalledWith({
        applicationId,
        toStatus: targetStatus,
      });
    },
  );

  it("does not notify the candidate for already_in_state (N3: no false email for a non-transition)", async () => {
    rpc.mockResolvedValue({
      data: {
        result: "already_in_state",
        application_id: applicationId,
        current_status: "shortlisted",
      },
      error: null,
    });

    await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "shortlisted", reason: "" }),
    );

    expect(notifyCandidateOfStatusChange).not.toHaveBeenCalled();
  });

  it("does not notify the candidate for invalid_transition, unavailable, or employer_unavailable results", async () => {
    rpc.mockResolvedValueOnce({
      data: { result: "invalid_transition" },
      error: null,
    });
    await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "shortlisted", reason: "" }),
    );

    rpc.mockResolvedValueOnce({ data: { result: "unavailable" }, error: null });
    await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "shortlisted", reason: "" }),
    );

    rpc.mockResolvedValueOnce({
      data: { result: "employer_unavailable" },
      error: null,
    });
    await expect(
      transitionEmployerApplicationAction(
        { kind: "idle" },
        form({ applicationId, targetStatus: "shortlisted", reason: "" }),
      ),
    ).rejects.toThrow(/REDIRECT:\/employer\/onboarding/);

    expect(notifyCandidateOfStatusChange).not.toHaveBeenCalled();
  });

  it("does not notify the candidate when the RPC call itself errors", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const state = await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "shortlisted", reason: "" }),
    );

    expect(state).toEqual({ kind: "failure" });
    expect(notifyCandidateOfStatusChange).not.toHaveBeenCalled();
  });

  it("still returns the updated result when candidate notification rejects (N3: mail failure never reverses a successful transition)", async () => {
    rpc.mockResolvedValue(updatedRpcResult("accepted"));
    notifyCandidateOfStatusChange.mockRejectedValue(
      new Error("provider unreachable"),
    );

    const state = await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "accepted", reason: "" }),
    );

    expect(state).toEqual({ kind: "updated", currentStatus: "accepted" });
    expect(notifyCandidateOfStatusChange).toHaveBeenCalledTimes(1);
  });

  it("returns a distinct already_in_state result — not a generic failure", async () => {
    rpc.mockResolvedValue({
      data: {
        result: "already_in_state",
        application_id: applicationId,
        current_status: "reviewing",
      },
      error: null,
    });

    const state = await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "reviewing", reason: "" }),
    );

    expect(state).toEqual({
      kind: "already_in_state",
      currentStatus: "reviewing",
    });
  });

  it("returns a distinct invalid_transition result and still revalidates", async () => {
    rpc.mockResolvedValue({
      data: { result: "invalid_transition" },
      error: null,
    });

    const state = await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "reviewing", reason: "" }),
    );

    expect(state).toEqual({ kind: "invalid_transition" });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("returns unavailable uniformly without an existence oracle", async () => {
    rpc.mockResolvedValue({ data: { result: "unavailable" }, error: null });

    const state = await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "reviewing", reason: "" }),
    );

    expect(state).toEqual({ kind: "unavailable" });
  });

  it("redirects to onboarding on employer_unavailable, per existing employer guard conventions", async () => {
    rpc.mockResolvedValue({
      data: { result: "employer_unavailable" },
      error: null,
    });

    await expect(
      transitionEmployerApplicationAction(
        { kind: "idle" },
        form({ applicationId, targetStatus: "reviewing", reason: "" }),
      ),
    ).rejects.toThrow(/REDIRECT:\/employer\/onboarding/);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("normalizes a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table applications" },
    });

    const state = await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "reviewing", reason: "" }),
    );

    expect(state).toEqual({ kind: "failure" });
  });

  it("normalizes an unparseable RPC payload", async () => {
    rpc.mockResolvedValue({ data: { unexpected: "shape" }, error: null });

    const state = await transitionEmployerApplicationAction(
      { kind: "idle" },
      form({ applicationId, targetStatus: "reviewing", reason: "" }),
    );

    expect(state).toEqual({ kind: "failure" });
  });
});
