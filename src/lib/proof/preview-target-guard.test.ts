import { describe, expect, it } from "vitest";

import { assertPreviewSupabaseTarget } from "@/lib/proof/preview-target-guard";

const PREVIEW_REF = "previewfakeref000000";
const PRODUCTION_REF = "productionfakeref9999";

function validInput(
  overrides: Partial<Parameters<typeof assertPreviewSupabaseTarget>[0]> = {},
) {
  return {
    supabaseUrl: `https://${PREVIEW_REF}.supabase.co`,
    databaseUrl: `postgresql://postgres:pw@db.${PREVIEW_REF}.supabase.co:5432/postgres`,
    expectedPreviewProjectRef: PREVIEW_REF,
    expectedProductionProjectRef: PRODUCTION_REF,
    ...overrides,
  };
}

describe("preview Supabase target guard", () => {
  it("accepts a Preview API URL and database URL that both match the configured Preview ref", () => {
    const result = assertPreviewSupabaseTarget(validInput());
    expect(result).toEqual({ ok: true, projectRef: PREVIEW_REF });
  });

  it("fails closed when expectedPreviewProjectRef is missing", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({ expectedPreviewProjectRef: undefined }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/expectedPreviewProjectRef is required/i);
    }
  });

  it("fails closed when expectedPreviewProjectRef is blank", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({ expectedPreviewProjectRef: "   " }),
    );
    expect(result.ok).toBe(false);
  });

  it("fails closed when expectedProductionProjectRef is missing", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({ expectedProductionProjectRef: undefined }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/expectedProductionProjectRef is required/i);
    }
  });

  it("fails closed when the Preview and Production refs are configured equal", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({ expectedProductionProjectRef: PREVIEW_REF }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/must not be equal/i);
    }
  });

  it("fails closed when the Preview API URL is missing", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({ supabaseUrl: undefined }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Preview Supabase API URL is required/i);
    }
  });

  it("rejects a Preview API URL that is not https", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({ supabaseUrl: `http://${PREVIEW_REF}.supabase.co` }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/must use https:/i);
    }
  });

  it("rejects a Preview API URL that is not a *.supabase.co hostname", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({ supabaseUrl: "https://stint.company" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/expected hosted Supabase hostname shape/i);
    }
  });

  it("rejects when the API URL resolves to the configured Production project ref", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({ supabaseUrl: `https://${PRODUCTION_REF}.supabase.co` }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/configured Production project ref/i);
    }
  });

  it("rejects when the API URL resolves to a project ref other than the configured Preview ref", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({ supabaseUrl: "https://someotherproject.supabase.co" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(
        /does not match the configured Preview project ref/i,
      );
    }
  });

  it("fails closed when the database URL is missing", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({ databaseUrl: undefined }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(
        /Preview Supabase database URL is required/i,
      );
    }
  });

  it("rejects a database URL that is not postgresql/postgres", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({ databaseUrl: `https://db.${PREVIEW_REF}.supabase.co` }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/must use postgresql: or postgres:/i);
    }
  });

  it("rejects when the database URL resolves to the configured Production project ref", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({
        databaseUrl: `postgresql://postgres:pw@db.${PRODUCTION_REF}.supabase.co:5432/postgres`,
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/configured Production project ref/i);
    }
  });

  it("rejects when the database URL resolves to a project ref other than the configured Preview ref", () => {
    const result = assertPreviewSupabaseTarget(
      validInput({
        databaseUrl:
          "postgresql://postgres:pw@db.someotherproject.supabase.co:5432/postgres",
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(
        /does not match the configured Preview project ref/i,
      );
    }
  });

  it("never treats the well-known Production Supabase project ref as an acceptable Preview target", () => {
    const result = assertPreviewSupabaseTarget({
      supabaseUrl: "https://kvrzmzoszitdicjvrprt.supabase.co",
      databaseUrl:
        "postgresql://postgres:pw@db.kvrzmzoszitdicjvrprt.supabase.co:5432/postgres",
      expectedPreviewProjectRef: "kvrzmzoszitdicjvrprt",
      expectedProductionProjectRef: "kvrzmzoszitdicjvrprt",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/must not be equal/i);
    }
  });
});
