import { beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClient = vi.hoisted(() =>
  vi.fn(() => ({ kind: "browser" })),
);

vi.mock("@supabase/ssr", () => ({
  createBrowserClient,
}));

describe("createBrowserSupabaseClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    createBrowserClient.mockClear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "test-publishable-key-value",
    );
  });

  it("passes validated public env values to createBrowserClient", async () => {
    const { createBrowserSupabaseClient } =
      await import("@/lib/supabase/browser");

    const client = createBrowserSupabaseClient();

    expect(createBrowserClient).toHaveBeenCalledTimes(1);
    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-publishable-key-value",
    );
    expect(client).toEqual({ kind: "browser" });
  });
});
