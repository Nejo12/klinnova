import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validApiKey = "re_test_1234567890";
const validFrom = "Klinnova <notifications@example.com>";

async function loadMailEnvModule() {
  return import("@/lib/mail/env");
}

function clearMailEnvVars() {
  Reflect.deleteProperty(process.env, "MAIL_TRANSPORT");
  Reflect.deleteProperty(process.env, "RESEND_API_KEY");
  Reflect.deleteProperty(process.env, "MAIL_FROM_ADDRESS");
}

describe("getMailEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    clearMailEnvVars();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearMailEnvVars();
    vi.resetModules();
  });

  it("returns validated config with the resend transport default", async () => {
    vi.stubEnv("RESEND_API_KEY", validApiKey);
    vi.stubEnv("MAIL_FROM_ADDRESS", validFrom);

    const { getMailEnv } = await loadMailEnvModule();
    const env = getMailEnv();

    expect(env.RESEND_API_KEY).toBe(validApiKey);
    expect(env.MAIL_FROM_ADDRESS).toBe(validFrom);
    expect(env.MAIL_TRANSPORT).toBe("resend");
  });

  it("fails when RESEND_API_KEY is missing and names the variable", async () => {
    vi.stubEnv("MAIL_FROM_ADDRESS", validFrom);
    Reflect.deleteProperty(process.env, "RESEND_API_KEY");

    const { getMailEnv } = await loadMailEnvModule();

    expect(() => getMailEnv()).toThrowError(/RESEND_API_KEY/);
  });

  it("fails when MAIL_FROM_ADDRESS is missing and names the variable", async () => {
    vi.stubEnv("RESEND_API_KEY", validApiKey);
    Reflect.deleteProperty(process.env, "MAIL_FROM_ADDRESS");

    const { getMailEnv } = await loadMailEnvModule();

    expect(() => getMailEnv()).toThrowError(/MAIL_FROM_ADDRESS/);
  });

  it("rejects an unrecognized MAIL_TRANSPORT value", async () => {
    vi.stubEnv("RESEND_API_KEY", validApiKey);
    vi.stubEnv("MAIL_FROM_ADDRESS", validFrom);
    vi.stubEnv("MAIL_TRANSPORT", "sendgrid");

    const { getMailEnv } = await loadMailEnvModule();

    expect(() => getMailEnv()).toThrowError(/MAIL_TRANSPORT/);
  });

  it("does not include the supplied API key value in error output", async () => {
    const secretKey = "re_should_not_leak_into_error_message";
    vi.stubEnv("RESEND_API_KEY", secretKey);
    Reflect.deleteProperty(process.env, "MAIL_FROM_ADDRESS");

    const { getMailEnv } = await loadMailEnvModule();

    try {
      getMailEnv();
      expect.unreachable("expected getMailEnv to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain(secretKey);
    }
  });

  it("returns a stable cached object on repeated access", async () => {
    vi.stubEnv("RESEND_API_KEY", validApiKey);
    vi.stubEnv("MAIL_FROM_ADDRESS", validFrom);

    const { getMailEnv } = await loadMailEnvModule();
    const first = getMailEnv();
    const second = getMailEnv();

    expect(second).toBe(first);
  });

  it("resetMailEnvCache clears the cached config", async () => {
    vi.stubEnv("RESEND_API_KEY", validApiKey);
    vi.stubEnv("MAIL_FROM_ADDRESS", validFrom);

    const { getMailEnv, resetMailEnvCache } = await loadMailEnvModule();
    const first = getMailEnv();
    resetMailEnvCache();
    const second = getMailEnv();

    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });
});
