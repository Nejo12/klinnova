import { describe, expect, it, vi } from "vitest";

import { confirmAuthCallback } from "@/lib/auth/confirm";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/auth/ensure-candidate-profile", () => ({
  ensureCandidateProfile: vi.fn(),
}));

import { ensureCandidateProfile } from "@/lib/auth/ensure-candidate-profile";

const ensureMock = vi.mocked(ensureCandidateProfile);

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
  it("rejects missing token and code", async () => {
    const client = mockAuthClient({});
    const result = await confirmAuthCallback(client, {});
    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(ensureMock).not.toHaveBeenCalled();
  });

  it("rejects unsupported OTP type", async () => {
    const client = mockAuthClient({});
    const result = await confirmAuthCallback(client, {
      token_hash: "abc",
      type: "recovery",
    });
    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(client.auth.verifyOtp).not.toHaveBeenCalled();
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
    expect(ensureMock).toHaveBeenCalledWith(client);
    expect(result).toEqual({ ok: true, nextPath: "/candidate" });
  });

  it("does not initialize profile when verification fails", async () => {
    const client = mockAuthClient({ verifyError: new Error("bad") });
    const result = await confirmAuthCallback(client, {
      token_hash: "abc",
      type: "signup",
    });
    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(ensureMock).not.toHaveBeenCalled();
  });
});
