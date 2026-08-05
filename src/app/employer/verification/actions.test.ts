import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
const loadEmployerProfile = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser },
    from,
    rpc,
  })),
}));

vi.mock("@/lib/employer/load-employer", () => ({
  loadEmployerProfile,
}));

import { requestEmployerVerificationAction } from "@/app/employer/verification/actions";

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}

const completedProfile = {
  ok: true as const,
  userId: "emp-1",
  data: {
    id: "emp-1",
    employerType: "private" as const,
    displayName: "Ada",
    berlinLocality: "Mitte",
    phone: null,
    website: null,
    organisationLegalName: null,
    lawfulHiringDeclared: true,
    verificationState: "unverified",
    verificationRequestedAt: null,
    verificationReviewedAt: null,
    verificationReviewReason: null,
    onboardingCompletedAt: "2026-08-01T00:00:00Z",
    company: null,
    typeLocked: true,
  },
};

describe("requestEmployerVerificationAction", () => {
  beforeEach(() => {
    getUser.mockReset();
    from.mockReset();
    rpc.mockReset();
    loadEmployerProfile.mockReset();
    revalidatePath.mockClear();
    getUser.mockResolvedValue({
      data: { user: { id: "emp-1" } },
      error: null,
    });
    loadEmployerProfile.mockResolvedValue(completedProfile);
  });

  it("rejects an unchecked attestation before calling the RPC", async () => {
    const state = await requestEmployerVerificationAction(
      { error: null, message: null },
      form({}),
    );

    expect(state.error).toMatch(/attestation/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers before calling the RPC", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
      error: "signed in",
    });

    const state = await requestEmployerVerificationAction(
      { error: null, message: null },
      form({ attestationConfirmed: "true" }),
    );

    expect(state.error).toMatch(/signed in/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects incomplete employers before calling the RPC", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      userId: "emp-1",
      data: { ...completedProfile.data, onboardingCompletedAt: null },
    });

    const state = await requestEmployerVerificationAction(
      { error: null, message: null },
      form({ attestationConfirmed: "true" }),
    );

    expect(state.error).toMatch(/onboarding/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls the RPC with no arguments and revalidates on success", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        employer_profile_id: "11111111-1111-4111-8111-111111111111",
      },
      error: null,
    });

    const state = await requestEmployerVerificationAction(
      { error: null, message: null },
      form({ attestationConfirmed: "true" }),
    );

    expect(rpc).toHaveBeenCalledWith("request_employer_verification");
    expect(rpc.mock.calls[0]?.length).toBe(1);
    expect(state.message).toMatch(/requested/i);
    expect(state.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/employer/verification");
    expect(revalidatePath).toHaveBeenCalledWith("/employer");
  });

  it("maps invalid_state (already pending) to a stable message", async () => {
    rpc.mockResolvedValue({
      data: { status: "invalid_state" },
      error: null,
    });

    const state = await requestEmployerVerificationAction(
      { error: null, message: null },
      form({ attestationConfirmed: "true" }),
    );

    expect(state.error).toMatch(/cannot be requested/i);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("maps incomplete status from the RPC to a stable message", async () => {
    rpc.mockResolvedValue({
      data: { status: "incomplete" },
      error: null,
    });

    const state = await requestEmployerVerificationAction(
      { error: null, message: null },
      form({ attestationConfirmed: "true" }),
    );

    expect(state.error).toMatch(/onboarding/i);
  });

  it("normalizes transport errors without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table employer_profiles" },
    });

    const state = await requestEmployerVerificationAction(
      { error: null, message: null },
      form({ attestationConfirmed: "true" }),
    );

    expect(state.error).not.toMatch(/permission denied/i);
    expect(state.error).toMatch(/went wrong/i);
  });

  it("normalizes an unparseable RPC payload", async () => {
    rpc.mockResolvedValue({
      data: { unexpected: "shape" },
      error: null,
    });

    const state = await requestEmployerVerificationAction(
      { error: null, message: null },
      form({ attestationConfirmed: "true" }),
    );

    expect(state.error).toMatch(/went wrong/i);
  });
});
