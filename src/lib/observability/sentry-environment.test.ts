import { describe, expect, it } from "vitest";

import { resolveSentryEnvironment } from "@/lib/observability/sentry-environment";

describe("resolveSentryEnvironment", () => {
  it("passes through each allowed Vercel environment value", () => {
    expect(resolveSentryEnvironment("preview")).toBe("preview");
    expect(resolveSentryEnvironment("production")).toBe("production");
    expect(resolveSentryEnvironment("development")).toBe("development");
  });

  it("falls back to development when VERCEL_ENV is unset", () => {
    expect(resolveSentryEnvironment(undefined)).toBe("development");
  });

  it("falls back to development for an unrecognized value, never guessing production", () => {
    expect(resolveSentryEnvironment("staging")).toBe("development");
    expect(resolveSentryEnvironment("")).toBe("development");
    expect(resolveSentryEnvironment("Production")).toBe("development");
  });
});
