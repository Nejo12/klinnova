import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validUrl = "https://example.supabase.co";
const validKey = "test-publishable-key-value";

async function loadPublicEnvModule() {
  return import("@/lib/env/public");
}

function clearPublicEnvVars() {
  Reflect.deleteProperty(process.env, "NEXT_PUBLIC_SUPABASE_URL");
  Reflect.deleteProperty(process.env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

describe("getPublicEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    clearPublicEnvVars();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearPublicEnvVars();
    vi.resetModules();
  });

  it("returns validated URL and publishable key", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", validUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", validKey);

    const { getPublicEnv } = await loadPublicEnvModule();
    const env = getPublicEnv();

    expect(env).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: validUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: validKey,
    });
  });

  it("fails when the URL is missing and names the variable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", validKey);
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_SUPABASE_URL");

    const { getPublicEnv } = await loadPublicEnvModule();

    expect(() => getPublicEnv()).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => getPublicEnv()).toThrowError(
      /Invalid input: expected string, received undefined/,
    );
  });

  it("fails when the URL is malformed and names the variable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", validKey);

    const { getPublicEnv } = await loadPublicEnvModule();

    expect(() => getPublicEnv()).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => getPublicEnv()).toThrowError(/Invalid URL/);
  });

  it("fails when the publishable key is missing and names the variable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", validUrl);
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

    const { getPublicEnv } = await loadPublicEnvModule();

    expect(() => getPublicEnv()).toThrowError(
      /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
    expect(() => getPublicEnv()).toThrowError(
      /Invalid input: expected string, received undefined/,
    );
  });

  it("does not include supplied key values in error output", async () => {
    const secretKey = "super-secret-publishable-should-not-leak";
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", secretKey);

    const { getPublicEnv } = await loadPublicEnvModule();

    expect(() => getPublicEnv()).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);

    try {
      getPublicEnv();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain(secretKey);
      expect(message).not.toContain("not-a-url");
    }
  });

  it("returns a stable cached object on repeated access", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", validUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", validKey);

    const { getPublicEnv } = await loadPublicEnvModule();
    const first = getPublicEnv();
    const second = getPublicEnv();

    expect(second).toBe(first);
  });
});
