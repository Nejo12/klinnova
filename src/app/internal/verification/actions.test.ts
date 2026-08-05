import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const requireActiveOperator = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc })),
}));

vi.mock("@/lib/internal/verification/operator-gate", () => ({
  requireActiveOperator,
}));

import {
  approveVerificationAction,
  rejectVerificationAction,
} from "@/app/internal/verification/actions";

const employerProfileId = "33333333-3333-4333-8333-333333333333";

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}

describe("approveVerificationAction", () => {
  beforeEach(() => {
    rpc.mockReset();
    requireActiveOperator.mockReset();
    revalidatePath.mockClear();
    redirect.mockClear();
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: { rpc },
      userId: "op-1",
    });
  });

  it("rejects a missing employer id before checking the gate", async () => {
    const state = await approveVerificationAction(
      { error: null, message: null },
      form({ confirmApprove: "true" }),
    );

    expect(state.error).toBeTruthy();
    expect(requireActiveOperator).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an unconfirmed approval before calling the RPC", async () => {
    const state = await approveVerificationAction(
      { error: null, message: null },
      form({ employerProfileId }),
    );

    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("denies a non-operator without exposing why", async () => {
    requireActiveOperator.mockResolvedValue({
      ok: false,
      reason: "not_operator",
    });

    const state = await approveVerificationAction(
      { error: null, message: null },
      form({ employerProfileId, confirmApprove: "true" }),
    );

    expect(state.error).toMatch(/not available/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("denies an unauthenticated caller", async () => {
    requireActiveOperator.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
    });

    const state = await approveVerificationAction(
      { error: null, message: null },
      form({ employerProfileId, confirmApprove: "true" }),
    );

    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls the RPC with only the employer id, revalidates, and redirects on success", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", employer_profile_id: employerProfileId },
      error: null,
    });

    await expect(
      approveVerificationAction(
        { error: null, message: null },
        form({ employerProfileId, confirmApprove: "true" }),
      ),
    ).rejects.toThrow("REDIRECT:/internal/verification");

    expect(rpc).toHaveBeenCalledWith("approve_employer_verification", {
      p_employer_profile_id: employerProfileId,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/internal/verification");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/internal/verification/${employerProfileId}`,
    );
  });

  it("maps a stale invalid_state result without redirecting", async () => {
    rpc.mockResolvedValue({ data: { status: "invalid_state" }, error: null });

    const state = await approveVerificationAction(
      { error: null, message: null },
      form({ employerProfileId, confirmApprove: "true" }),
    );

    expect(state.error).toMatch(/no longer pending/i);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("normalizes a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table employer_profiles" },
    });

    const state = await approveVerificationAction(
      { error: null, message: null },
      form({ employerProfileId, confirmApprove: "true" }),
    );

    expect(state.error).not.toMatch(/permission denied/i);
    expect(state.error).toMatch(/went wrong/i);
  });

  it("normalizes an unparseable RPC payload", async () => {
    rpc.mockResolvedValue({ data: { unexpected: "shape" }, error: null });

    const state = await approveVerificationAction(
      { error: null, message: null },
      form({ employerProfileId, confirmApprove: "true" }),
    );

    expect(state.error).toMatch(/went wrong/i);
  });
});

describe("rejectVerificationAction", () => {
  beforeEach(() => {
    rpc.mockReset();
    requireActiveOperator.mockReset();
    revalidatePath.mockClear();
    redirect.mockClear();
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: { rpc },
      userId: "op-1",
    });
  });

  it("rejects an empty reason before calling the RPC", async () => {
    const state = await rejectVerificationAction(
      { error: null, message: null },
      form({ employerProfileId, reason: "", confirmReject: "true" }),
    );

    expect(state.fieldErrors?.reason).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only reason before calling the RPC", async () => {
    const state = await rejectVerificationAction(
      { error: null, message: null },
      form({ employerProfileId, reason: "   ", confirmReject: "true" }),
    );

    expect(state.fieldErrors?.reason).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a reason over 500 characters before calling the RPC", async () => {
    const state = await rejectVerificationAction(
      { error: null, message: null },
      form({
        employerProfileId,
        reason: "a".repeat(501),
        confirmReject: "true",
      }),
    );

    expect(state.fieldErrors?.reason).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an unconfirmed rejection before calling the RPC", async () => {
    const state = await rejectVerificationAction(
      { error: null, message: null },
      form({ employerProfileId, reason: "Profile needs review" }),
    );

    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("trims the reason and calls the RPC with only id and reason", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", employer_profile_id: employerProfileId },
      error: null,
    });

    await expect(
      rejectVerificationAction(
        { error: null, message: null },
        form({
          employerProfileId,
          reason: "  Profile needs review  ",
          confirmReject: "true",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/internal/verification");

    expect(rpc).toHaveBeenCalledWith("reject_employer_verification", {
      p_employer_profile_id: employerProfileId,
      p_reason: "Profile needs review",
    });
  });

  it("denies a non-operator without exposing why", async () => {
    requireActiveOperator.mockResolvedValue({
      ok: false,
      reason: "not_operator",
    });

    const state = await rejectVerificationAction(
      { error: null, message: null },
      form({
        employerProfileId,
        reason: "Profile needs review",
        confirmReject: "true",
      }),
    );

    expect(state.error).toMatch(/not available/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps a stale invalid_state result without redirecting", async () => {
    rpc.mockResolvedValue({ data: { status: "invalid_state" }, error: null });

    const state = await rejectVerificationAction(
      { error: null, message: null },
      form({
        employerProfileId,
        reason: "Profile needs review",
        confirmReject: "true",
      }),
    );

    expect(state.error).toMatch(/no longer pending/i);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("maps a validation_error result from the RPC itself", async () => {
    rpc.mockResolvedValue({
      data: { status: "validation_error" },
      error: null,
    });

    const state = await rejectVerificationAction(
      { error: null, message: null },
      form({
        employerProfileId,
        reason: "Profile needs review",
        confirmReject: "true",
      }),
    );

    expect(state.error).toMatch(/rejection reason/i);
  });

  it("normalizes a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied for function foo" },
    });

    const state = await rejectVerificationAction(
      { error: null, message: null },
      form({
        employerProfileId,
        reason: "Profile needs review",
        confirmReject: "true",
      }),
    );

    expect(state.error).not.toMatch(/permission denied/i);
    expect(state.error).toMatch(/went wrong/i);
  });
});
