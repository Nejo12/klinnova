import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn(() => ({ kind: "privileged" })));

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

describe("createPrivilegedDeletionClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    createClient.mockClear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "test-publishable-key-value",
    );
  });

  it("fails closed when SUPABASE_SERVICE_ROLE_KEY is absent", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { createPrivilegedDeletionClient } =
      await import("@/lib/account-deletion/privileged-supabase");

    expect(() => createPrivilegedDeletionClient()).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("never falls back to the publishable/anon key when the secret is missing", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { createPrivilegedDeletionClient } =
      await import("@/lib/account-deletion/privileged-supabase");

    expect(() => createPrivilegedDeletionClient()).toThrow();
    expect(createClient).not.toHaveBeenCalledWith(
      expect.anything(),
      "test-publishable-key-value",
      expect.anything(),
    );
  });

  it("constructs a client with the service-role key, no session persistence, no refresh, no URL session detection", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key-value");
    const { createPrivilegedDeletionClient } =
      await import("@/lib/account-deletion/privileged-supabase");

    const client = createPrivilegedDeletionClient();

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(
      "http://127.0.0.1:54321",
      "test-service-role-key-value",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
    expect(client).toEqual({ kind: "privileged" });
  });

  it("does not persist the secret on the returned client's error/message shape", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { createPrivilegedDeletionClient } =
      await import("@/lib/account-deletion/privileged-supabase");

    try {
      createPrivilegedDeletionClient();
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toMatch(/sb_secret_/);
    }
  });
});
