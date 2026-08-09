import { beforeEach, describe, expect, it, vi } from "vitest";

import { confirmAuthCallback } from "@/lib/auth/confirm";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/auth/ensure-candidate-profile", () => ({
  ensureCandidateProfile: vi.fn(),
}));

vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities: vi.fn(),
}));

import { ensureCandidateProfile } from "@/lib/auth/ensure-candidate-profile";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";

const ensureMock = vi.mocked(ensureCandidateProfile);
const capabilitiesMock = vi.mocked(loadAccountCapabilities);

function mockAuthClient(options: {
  verifyError?: Error | null;
  exchangeError?: Error | null;
}): SupabaseClient<Database> {
  return {
    auth: {
      verifyOtp: vi.fn().mockResolvedValue({
        data: {},
        error: options.verifyError ?? null,
      }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        data: {},
        error: options.exchangeError ?? null,
      }),
    },
  } as unknown as SupabaseClient<Database>;
}

describe("confirmAuthCallback", () => {
  beforeEach(() => {
    ensureMock.mockReset();
    capabilitiesMock.mockReset();
    capabilitiesMock.mockResolvedValue({
      hasCandidateProfile: false,
      hasEmployerProfile: false,
    });
  });

  it("rejects missing token and code", async () => {
    const client = mockAuthClient({});
    const result = await confirmAuthCallback(client, {});
    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(ensureMock).not.toHaveBeenCalled();
  });

  it("rejects a genuinely unsupported OTP type", async () => {
    const client = mockAuthClient({});
    const result = await confirmAuthCallback(client, {
      token_hash: "abc",
      type: "magiclink",
    });
    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(client.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("recovery: verifies the recovery token and routes straight to /reset-password, never creating a profile or resolving capability-based destinations (M5.1 Unit C)", async () => {
    const client = mockAuthClient({});
    const result = await confirmAuthCallback(client, {
      token_hash: "recovery-token",
      type: "recovery",
    });
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({
      type: "recovery",
      token_hash: "recovery-token",
    });
    expect(result).toEqual({ ok: true, nextPath: "/reset-password" });
    expect(ensureMock).not.toHaveBeenCalled();
    expect(capabilitiesMock).not.toHaveBeenCalled();
  });

  it("recovery: an invalid/expired token is rejected with the recovery-specific reason, without ever calling ensureCandidateProfile", async () => {
    const client = mockAuthClient({ verifyError: new Error("expired") });
    const result = await confirmAuthCallback(client, {
      token_hash: "recovery-token",
      type: "recovery",
    });
    expect(result).toEqual({ ok: false, reason: "recovery" });
    expect(ensureMock).not.toHaveBeenCalled();
  });

  it("recovery: missing token_hash is rejected with the recovery-specific reason, without calling verifyOtp", async () => {
    const client = mockAuthClient({});
    const result = await confirmAuthCallback(client, { type: "recovery" });
    expect(result).toEqual({ ok: false, reason: "recovery" });
    expect(client.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("recovery: intent=recovery with a PKCE code (the real path empirically confirmed against local Supabase — GoTrue's /verify redirect drops type but preserves our redirectTo's intent param) exchanges the code and routes to /reset-password without ever creating a profile", async () => {
    const client = mockAuthClient({});
    const result = await confirmAuthCallback(client, {
      intent: "recovery",
      code: "pkce-code-123",
    });
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      "pkce-code-123",
    );
    expect(client.auth.verifyOtp).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, nextPath: "/reset-password" });
    expect(ensureMock).not.toHaveBeenCalled();
    expect(capabilitiesMock).not.toHaveBeenCalled();
  });

  it("recovery: intent=recovery with an invalid/expired code is rejected with the recovery-specific reason", async () => {
    const client = mockAuthClient({ exchangeError: new Error("expired") });
    const result = await confirmAuthCallback(client, {
      intent: "recovery",
      code: "pkce-code-123",
    });
    expect(result).toEqual({ ok: false, reason: "recovery" });
    expect(ensureMock).not.toHaveBeenCalled();
  });

  it("recovery: intent=recovery with neither token_hash nor code is rejected with the recovery-specific reason", async () => {
    const client = mockAuthClient({});
    const result = await confirmAuthCallback(client, { intent: "recovery" });
    expect(result).toEqual({ ok: false, reason: "recovery" });
    expect(client.auth.verifyOtp).not.toHaveBeenCalled();
    expect(client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("a bare code with no recovery intent still follows the ordinary signup/login profile-creation path, not recovery", async () => {
    ensureMock.mockResolvedValue({
      ok: true,
      created: true,
      userId: "u1",
      displayName: "Ada",
    });
    const client = mockAuthClient({});
    const result = await confirmAuthCallback(client, { code: "abc" });
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(ensureMock).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, nextPath: "/candidate" });
  });

  it("rejects unsafe next destinations", async () => {
    ensureMock.mockResolvedValue({
      ok: true,
      created: true,
      userId: "u1",
      displayName: "Ada",
    });
    const client = mockAuthClient({});
    const result = await confirmAuthCallback(client, {
      token_hash: "abc",
      type: "signup",
      next: "https://evil.example",
    });
    expect(result).toEqual({ ok: true, nextPath: "/candidate" });
  });

  it("verifies token and initializes profile after success", async () => {
    ensureMock.mockResolvedValue({
      ok: true,
      created: true,
      userId: "u1",
      displayName: "Ada",
    });
    const client = mockAuthClient({});
    const result = await confirmAuthCallback(client, {
      token_hash: "abc",
      type: "signup",
      next: "/candidate",
    });
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({
      type: "signup",
      token_hash: "abc",
    });
    expect(ensureMock).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, nextPath: "/candidate" });
  });

  it("skips candidate profile ensure for employer next", async () => {
    const client = mockAuthClient({});
    const result = await confirmAuthCallback(client, {
      token_hash: "abc",
      type: "signup",
      next: "/employer/onboarding",
    });
    expect(ensureMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, nextPath: "/employer/onboarding" });
  });
});
