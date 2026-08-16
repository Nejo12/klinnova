import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.hoisted(() => vi.fn());
const exchangeCodeForSession = vi.hoisted(() => vi.fn());
const ensureCandidateProfile = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
);

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { verifyOtp, exchangeCodeForSession },
  })),
}));

vi.mock("@/lib/auth/ensure-candidate-profile", () => ({
  ensureCandidateProfile,
}));

vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));

import { confirmAction } from "@/app/auth/confirm/actions";

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("confirmAction", () => {
  beforeEach(() => {
    verifyOtp.mockReset();
    exchangeCodeForSession.mockReset();
    ensureCandidateProfile.mockReset();
    loadAccountCapabilities.mockReset();
    redirect.mockClear();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: false,
      hasEmployerProfile: false,
    });
  });

  it("is the only step that calls verifyOtp — extracts the hidden form fields and confirms, then redirects to the resolved destination", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null });
    ensureCandidateProfile.mockResolvedValue({
      ok: true,
      created: true,
      userId: "u1",
      displayName: "Ada",
    });

    await expect(
      confirmAction(form({ token_hash: "abc", type: "signup", next: "" })),
    ).rejects.toThrow("REDIRECT:/candidate");

    expect(verifyOtp).toHaveBeenCalledWith({
      type: "signup",
      token_hash: "abc",
    });
    expect(redirect).toHaveBeenCalledWith("/candidate");
  });

  it("preserves employer next through the human-submitted POST", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null });

    await expect(
      confirmAction(
        form({
          token_hash: "abc",
          type: "signup",
          next: "/employer/onboarding",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/employer/onboarding");

    expect(ensureCandidateProfile).not.toHaveBeenCalled();
  });

  it("recovery intent redirects to /reset-password without ever creating a profile", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null });

    await expect(
      confirmAction(
        form({
          token_hash: "recovery-token",
          type: "recovery",
          intent: "recovery",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/reset-password");

    expect(verifyOtp).toHaveBeenCalledWith({
      type: "recovery",
      token_hash: "recovery-token",
    });
    expect(ensureCandidateProfile).not.toHaveBeenCalled();
    expect(loadAccountCapabilities).not.toHaveBeenCalled();
  });

  it("an invalid/expired token redirects to the generic error state, never a raw Supabase error", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: new Error("otp_expired") });

    await expect(
      confirmAction(form({ token_hash: "expired", type: "signup" })),
    ).rejects.toThrow("REDIRECT:/auth/error");
  });

  it("an invalid/expired recovery token redirects to the recovery-specific error state", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: new Error("otp_expired") });

    await expect(
      confirmAction(
        form({ token_hash: "expired", type: "recovery", intent: "recovery" }),
      ),
    ).rejects.toThrow("REDIRECT:/auth/error?reason=recovery");
  });

  it("a missing token_hash and code redirects to the generic error state without calling verifyOtp or exchangeCodeForSession", async () => {
    await expect(confirmAction(form({}))).rejects.toThrow(
      "REDIRECT:/auth/error",
    );
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("a second submission of the same already-consumed token is rejected safely (Supabase's one-time enforcement surfaces as a verifyOtp error on replay)", async () => {
    verifyOtp.mockResolvedValueOnce({ data: {}, error: null });
    ensureCandidateProfile.mockResolvedValue({
      ok: true,
      created: true,
      userId: "u1",
      displayName: "Ada",
    });

    await expect(
      confirmAction(form({ token_hash: "abc", type: "signup" })),
    ).rejects.toThrow("REDIRECT:/candidate");

    verifyOtp.mockResolvedValueOnce({
      data: {},
      error: new Error("otp_expired"),
    });

    await expect(
      confirmAction(form({ token_hash: "abc", type: "signup" })),
    ).rejects.toThrow("REDIRECT:/auth/error");

    expect(verifyOtp).toHaveBeenCalledTimes(2);
  });
});
