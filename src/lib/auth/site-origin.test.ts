import { describe, expect, it } from "vitest";

import {
  resolveRedirectOrigin,
  resolveSiteOrigin,
} from "@/lib/auth/site-origin";

describe("resolveSiteOrigin", () => {
  it("prefers configured site URL", () => {
    expect(
      resolveSiteOrigin({
        siteUrl: "https://klinnova.com/",
        vercelUrl: "preview.vercel.app",
      }),
    ).toBe("https://klinnova.com");
  });

  it("uses Vercel URL for Preview when site URL is absent", () => {
    expect(
      resolveSiteOrigin({
        siteUrl: undefined,
        vercelUrl: "stint-git-abc.vercel.app",
      }),
    ).toBe("https://stint-git-abc.vercel.app");
  });

  it("falls back to localhost", () => {
    expect(resolveSiteOrigin({})).toBe("http://localhost:3000");
  });
});

describe("resolveRedirectOrigin", () => {
  it("preserves allow-listed 127.0.0.1 host for cookie affinity", () => {
    expect(
      resolveRedirectOrigin({
        hostHeader: "127.0.0.1:3000",
        siteUrl: "https://klinnova.com",
      }),
    ).toBe("http://127.0.0.1:3000");
  });

  it("rejects arbitrary hosts", () => {
    expect(
      resolveRedirectOrigin({
        hostHeader: "evil.example",
        siteUrl: "https://klinnova.com",
      }),
    ).toBe("https://klinnova.com");
  });
});
