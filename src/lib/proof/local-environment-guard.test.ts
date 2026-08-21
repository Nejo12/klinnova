import { describe, expect, it } from "vitest";

import {
  assertLocalProofEnvironment,
  assertLocalSupabaseApiUrl,
  assertNoHostedMutationIntent,
  assertNoServiceRoleExposure,
  assertOptionalLocalDatabaseUrl,
} from "@/lib/proof/local-environment-guard";

describe("local environment guard", () => {
  it("accepts the established local Supabase API URL", () => {
    expect(assertLocalSupabaseApiUrl("http://127.0.0.1:54321")).toEqual({
      ok: true,
    });
    expect(assertLocalSupabaseApiUrl("http://localhost:54321")).toEqual({
      ok: true,
    });
  });

  it("rejects hosted Supabase API URLs", () => {
    const result = assertLocalSupabaseApiUrl(
      "https://kvrzmzoszitdicjvrprt.supabase.co",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/hosted Supabase/i);
    }
  });

  it.each([
    "https://klinnova.com",
    "https://www.klinnova.com",
    "https://stint.company",
    "https://www.stint.company",
  ])("rejects Production site URL %s during local proof", (siteUrl) => {
    const result = assertLocalProofEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SITE_URL: siteUrl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Production/i);
    }
  });

  it("rejects remote database URLs even when the variable name contains local", () => {
    const result = assertOptionalLocalDatabaseUrl(
      "postgresql://postgres:postgres@db.example.supabase.co:5432/postgres",
      "MY_LOCAL_DATABASE_URL",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/hosted Supabase|not the local/i);
    }
  });

  it("accepts optional local database URL on port 54322", () => {
    expect(
      assertOptionalLocalDatabaseUrl(
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        "STINT_DATABASE_URL",
      ),
    ).toEqual({ ok: true });
  });

  it("rejects hosted mutation argv token sequences and flags", () => {
    expect(
      assertNoHostedMutationIntent(["supabase", "db", "push", "--linked"]).ok,
    ).toBe(false);
    expect(assertNoHostedMutationIntent(["supabase", "link"]).ok).toBe(false);
    expect(
      assertNoHostedMutationIntent(["supabase", "migration", "up"]).ok,
    ).toBe(false);
    expect(
      assertNoHostedMutationIntent(["supabase", "functions", "deploy"]).ok,
    ).toBe(false);
    expect(
      assertNoHostedMutationIntent(["supabase", "secrets", "set"]).ok,
    ).toBe(false);
    expect(assertNoHostedMutationIntent(["--linked"]).ok).toBe(false);
    expect(
      assertNoHostedMutationIntent([
        "postgresql://postgres:postgres@db.example.supabase.co:5432/postgres",
      ]).ok,
    ).toBe(false);
  });

  it("accepts empty argv and local proof script arguments", () => {
    expect(assertNoHostedMutationIntent([]).ok).toBe(true);
    expect(
      assertNoHostedMutationIntent(["node", "scripts/proof/slice4.mts"]).ok,
    ).toBe(true);
    expect(assertNoHostedMutationIntent(["pnpm", "supabase:db:reset"]).ok).toBe(
      true,
    );
    expect(assertNoHostedMutationIntent(["pnpm", "test:e2e:employer"]).ok).toBe(
      true,
    );
  });

  it("rejects NEXT_PUBLIC service-role exposure without logging the value", () => {
    const result = assertNoServiceRoleExposure({
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "sb_secret_example",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toMatch(/sb_secret_example/);
      expect(result.error).toMatch(/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
    }
  });

  it("accepts a clean local proof environment", () => {
    expect(
      assertLocalProofEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
      }),
    ).toEqual({ ok: true });
  });
});
