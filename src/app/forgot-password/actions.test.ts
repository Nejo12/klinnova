import { beforeEach, describe, expect, it, vi } from "vitest";

const resetPasswordForEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { resetPasswordForEmail },
  })),
}));

vi.mock("@/lib/env/public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "key",
    NEXT_PUBLIC_SITE_URL: "https://klinnova.com",
  }),
}));

import { requestPasswordResetAction } from "@/app/forgot-password/actions";
import { AUTH_RESET_REQUEST_SENT } from "@/lib/auth/messages";

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

const initialState = { error: null, message: null };

describe("requestPasswordResetAction (M5.1 Unit C)", () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset();
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it("rejects an invalid email with a field-level message, not the generic success state", async () => {
    const result = await requestPasswordResetAction(
      initialState,
      form({ email: "not-an-email" }),
    );
    expect(result.message).toBeNull();
    expect(result.error).not.toBeNull();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("calls resetPasswordForEmail with a redirectTo pointed at the app's own /auth/confirm route, marked intent=recovery (the signal confirm.ts actually keys on, since type does not survive GoTrue's verify redirect)", async () => {
    await requestPasswordResetAction(
      initialState,
      form({ email: "ada@example.com" }),
    );
    expect(resetPasswordForEmail).toHaveBeenCalledWith("ada@example.com", {
      redirectTo: "https://klinnova.com/auth/confirm?intent=recovery",
    });
  });

  it("returns the generic enumeration-safe message for a real, successfully-processed email", async () => {
    const result = await requestPasswordResetAction(
      initialState,
      form({ email: "ada@example.com" }),
    );
    expect(result).toEqual({ error: null, message: AUTH_RESET_REQUEST_SENT });
  });

  it("returns the identical generic message even when resetPasswordForEmail errors (enumeration safety, e.g. unknown address)", async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: "User not found", status: 400 },
    });

    const result = await requestPasswordResetAction(
      initialState,
      form({ email: "unknown@example.com" }),
    );
    expect(result).toEqual({ error: null, message: AUTH_RESET_REQUEST_SENT });
  });

  it("never exposes a raw Supabase error message to the caller", async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: "some internal Supabase detail", status: 500 },
    });

    const result = await requestPasswordResetAction(
      initialState,
      form({ email: "ada@example.com" }),
    );
    expect(JSON.stringify(result)).not.toMatch(/internal Supabase detail/);
  });
});
