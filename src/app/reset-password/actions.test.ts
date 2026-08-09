import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const updateUser = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser, updateUser, signOut },
  })),
}));

import {
  continueToSignInAction,
  updatePasswordAction,
} from "@/app/reset-password/actions";
import { AUTH_RESET_SUCCESS } from "@/lib/auth/messages";

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

const initialState = { error: null, message: null };

describe("updatePasswordAction (M5.1 Unit C)", () => {
  beforeEach(() => {
    getUser.mockReset();
    updateUser.mockReset();
    signOut.mockReset();
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    updateUser.mockResolvedValue({ data: {}, error: null });
  });

  it("rejects a password shorter than 8 characters without calling updateUser", async () => {
    const result = await updatePasswordAction(
      initialState,
      form({ password: "short1", confirmPassword: "short1" }),
    );
    expect(result.message).toBeNull();
    expect(result.error).not.toBeNull();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords without calling updateUser", async () => {
    const result = await updatePasswordAction(
      initialState,
      form({ password: "password1", confirmPassword: "password2" }),
    );
    expect(result.error).toBe("Passwords do not match.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("rejects when there is no authenticated session, without calling updateUser", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const result = await updatePasswordAction(
      initialState,
      form({ password: "password1", confirmPassword: "password1" }),
    );
    expect(result.message).toBeNull();
    expect(result.error).not.toBeNull();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updates the password and returns the success message on valid input with a session", async () => {
    const result = await updatePasswordAction(
      initialState,
      form({ password: "password1", confirmPassword: "password1" }),
    );
    expect(updateUser).toHaveBeenCalledWith({ password: "password1" });
    expect(result).toEqual({ error: null, message: AUTH_RESET_SUCCESS });
  });

  it("never exposes a raw Supabase error message when updateUser fails", async () => {
    updateUser.mockResolvedValue({
      data: null,
      error: { message: "some internal Supabase detail", status: 500 },
    });
    const result = await updatePasswordAction(
      initialState,
      form({ password: "password1", confirmPassword: "password1" }),
    );
    expect(result.message).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/internal Supabase detail/);
  });
});

describe("continueToSignInAction (M5.1 Unit C)", () => {
  beforeEach(() => {
    signOut.mockReset();
    redirect.mockClear();
  });

  it("signs out the recovery session and redirects to /login", async () => {
    await expect(continueToSignInAction()).rejects.toThrow("REDIRECT:/login");
    expect(signOut).toHaveBeenCalled();
  });
});
