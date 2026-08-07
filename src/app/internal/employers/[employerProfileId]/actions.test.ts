import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const requireActiveOperator = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc })),
}));

vi.mock("@/lib/internal/verification/operator-gate", () => ({
  requireActiveOperator,
}));

import {
  revokeEmployerVerificationAction,
  suspendEmployerAction,
  unsuspendEmployerAction,
} from "@/app/internal/employers/[employerProfileId]/actions";

const employerProfileId = "33333333-3333-4333-8333-333333333333";

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}

function resetAll() {
  rpc.mockReset();
  requireActiveOperator.mockReset();
  revalidatePath.mockClear();
  requireActiveOperator.mockResolvedValue({
    ok: true,
    supabase: { rpc },
    userId: "op-1",
  });
}

describe("suspendEmployerAction", () => {
  beforeEach(resetAll);

  it("rejects a missing employer id before checking the gate", async () => {
    const state = await suspendEmployerAction(
      { error: null, message: null },
      form({ reason: "Fraud reports", confirmSuspend: "true" }),
    );

    expect(state.error).toBeTruthy();
    expect(requireActiveOperator).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a blank reason before calling the RPC", async () => {
    const state = await suspendEmployerAction(
      { error: null, message: null },
      form({ employerProfileId, reason: "", confirmSuspend: "true" }),
    );

    expect(state.fieldErrors?.reason).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a reason over 500 characters before calling the RPC", async () => {
    const state = await suspendEmployerAction(
      { error: null, message: null },
      form({
        employerProfileId,
        reason: "a".repeat(501),
        confirmSuspend: "true",
      }),
    );

    expect(state.fieldErrors?.reason).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an unconfirmed suspend before calling the RPC", async () => {
    const state = await suspendEmployerAction(
      { error: null, message: null },
      form({ employerProfileId, reason: "Fraud reports" }),
    );

    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("denies a non-operator without exposing why", async () => {
    requireActiveOperator.mockResolvedValue({
      ok: false,
      reason: "not_operator",
    });

    const state = await suspendEmployerAction(
      { error: null, message: null },
      form({
        employerProfileId,
        reason: "Fraud reports",
        confirmSuspend: "true",
      }),
    );

    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("trims the reason and calls the RPC with only id and reason", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", employer_profile_id: employerProfileId },
      error: null,
    });

    const state = await suspendEmployerAction(
      { error: null, message: null },
      form({
        employerProfileId,
        reason: "  Fraud reports  ",
        confirmSuspend: "true",
      }),
    );

    expect(state.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith("suspend_employer", {
      p_employer_profile_id: employerProfileId,
      p_reason: "Fraud reports",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/internal/employers");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/internal/employers/${employerProfileId}`,
    );
  });

  it("maps an already_in_state result without treating it as an error crash", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "already_in_state",
        employer_profile_id: employerProfileId,
      },
      error: null,
    });

    const state = await suspendEmployerAction(
      { error: null, message: null },
      form({
        employerProfileId,
        reason: "Fraud reports",
        confirmSuspend: "true",
      }),
    );

    expect(state.error).toMatch(/already changed/i);
  });

  it("normalizes a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table employer_suspension" },
    });

    const state = await suspendEmployerAction(
      { error: null, message: null },
      form({
        employerProfileId,
        reason: "Fraud reports",
        confirmSuspend: "true",
      }),
    );

    expect(state.error).not.toMatch(/permission denied/i);
    expect(state.error).toMatch(/went wrong/i);
  });
});

describe("unsuspendEmployerAction", () => {
  beforeEach(resetAll);

  it("rejects an unconfirmed unsuspend before calling the RPC", async () => {
    const state = await unsuspendEmployerAction(
      { error: null, message: null },
      form({ employerProfileId }),
    );

    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls the RPC with only the employer id on success", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", employer_profile_id: employerProfileId },
      error: null,
    });

    const state = await unsuspendEmployerAction(
      { error: null, message: null },
      form({ employerProfileId, confirmUnsuspend: "true" }),
    );

    expect(state.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith("unsuspend_employer", {
      p_employer_profile_id: employerProfileId,
    });
  });
});

describe("revokeEmployerVerificationAction", () => {
  beforeEach(resetAll);

  it("rejects a blank reason before calling the RPC", async () => {
    const state = await revokeEmployerVerificationAction(
      { error: null, message: null },
      form({ employerProfileId, reason: "", confirmRevoke: "true" }),
    );

    expect(state.fieldErrors?.reason).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls revoke_employer_verification, not suspend_employer", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        employer_profile_id: employerProfileId,
        paused_vacancy_count: 1,
      },
      error: null,
    });

    const state = await revokeEmployerVerificationAction(
      { error: null, message: null },
      form({
        employerProfileId,
        reason: "Compliance concern",
        confirmRevoke: "true",
      }),
    );

    expect(state.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith("revoke_employer_verification", {
      p_employer_profile_id: employerProfileId,
      p_reason: "Compliance concern",
    });
    expect(rpc).not.toHaveBeenCalledWith("suspend_employer", expect.anything());
    expect(revalidatePath).toHaveBeenCalledWith(
      `/internal/verification/${employerProfileId}`,
    );
  });

  it("maps an invalid_state result (not currently verified)", async () => {
    rpc.mockResolvedValue({ data: { status: "invalid_state" }, error: null });

    const state = await revokeEmployerVerificationAction(
      { error: null, message: null },
      form({
        employerProfileId,
        reason: "Compliance concern",
        confirmRevoke: "true",
      }),
    );

    expect(state.error).toMatch(/already changed/i);
  });
});
