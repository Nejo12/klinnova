import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const createServerClient = vi.hoisted(() => vi.fn());
const getClaims = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient,
}));

vi.mock("@/lib/env/public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  }),
}));

import {
  copyCookies,
  isCandidatePath,
  updateSession,
} from "@/lib/supabase/proxy";

describe("isCandidatePath", () => {
  it("matches candidate routes only", () => {
    expect(isCandidatePath("/candidate")).toBe(true);
    expect(isCandidatePath("/candidate/x")).toBe(true);
    expect(isCandidatePath("/login")).toBe(false);
    expect(isCandidatePath("/candidates")).toBe(false);
  });
});

describe("copyCookies", () => {
  it("copies cookies onto the target response", () => {
    const from = NextResponse.next();
    from.cookies.set("sb-access-token", "refreshed", { path: "/" });
    const to = NextResponse.redirect(new URL("http://localhost/login"));
    copyCookies(from, to);
    expect(to.cookies.get("sb-access-token")?.value).toBe("refreshed");
  });
});

describe("updateSession", () => {
  beforeEach(() => {
    createServerClient.mockReset();
    getClaims.mockReset();
  });

  it("propagates refreshed cookies on a pass-through response", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-a" } },
      error: null,
    });

    createServerClient.mockImplementation((_url, _key, options) => {
      options.cookies.setAll([
        {
          name: "sb-access-token",
          value: "refreshed-token",
          options: { path: "/" },
        },
      ]);
      return { auth: { getClaims } };
    });

    const request = new NextRequest("http://localhost:3000/");
    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(response.cookies.get("sb-access-token")?.value).toBe(
      "refreshed-token",
    );
  });

  it("propagates refreshed cookies on an anonymous candidate redirect", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    createServerClient.mockImplementation((_url, _key, options) => {
      options.cookies.setAll([
        {
          name: "sb-access-token",
          value: "cleared-or-rotated",
          options: { path: "/" },
        },
      ]);
      return { auth: { getClaims } };
    });

    const request = new NextRequest("http://localhost:3000/candidate");
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.cookies.get("sb-access-token")?.value).toBe(
      "cleared-or-rotated",
    );
  });
});
