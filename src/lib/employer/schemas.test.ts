import { describe, expect, it } from "vitest";

import {
  companySlugSchema,
  organisationEmployerProfileSchema,
  privateEmployerProfileSchema,
  selectEmployerTypeSchema,
} from "@/lib/employer/schemas";

describe("selectEmployerTypeSchema", () => {
  it("accepts private and organisation", () => {
    expect(
      selectEmployerTypeSchema.safeParse({ employerType: "private" }).success,
    ).toBe(true);
    expect(
      selectEmployerTypeSchema.safeParse({ employerType: "organisation" })
        .success,
    ).toBe(true);
  });

  it("rejects unknown types", () => {
    expect(
      selectEmployerTypeSchema.safeParse({ employerType: "admin" }).success,
    ).toBe(false);
  });
});

describe("privateEmployerProfileSchema", () => {
  it("trims required fields and allows optional blanks", () => {
    const parsed = privateEmployerProfileSchema.safeParse({
      displayName: " Ada ",
      berlinLocality: " Mitte ",
      phone: "",
      website: "",
      lawfulHiringDeclared: "yes",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.displayName).toBe("Ada");
      expect(parsed.data.berlinLocality).toBe("Mitte");
      expect(parsed.data.phone).toBeNull();
      expect(parsed.data.website).toBeNull();
      expect(parsed.data.lawfulHiringDeclared).toBe(true);
    }
  });

  it("rejects blank required values", () => {
    expect(
      privateEmployerProfileSchema.safeParse({
        displayName: "   ",
        berlinLocality: "Mitte",
      }).success,
    ).toBe(false);
  });
});

describe("organisationEmployerProfileSchema", () => {
  it("requires company slug and legal name", () => {
    const parsed = organisationEmployerProfileSchema.safeParse({
      displayName: "Ada",
      organisationLegalName: "Ada GmbH",
      berlinLocality: "Kreuzberg",
      companyName: "Ada Care",
      companySlug: "ada-care",
      phone: "+49 30 123456",
      website: "ada.example",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.website).toBe("https://ada.example");
    }
  });
});

describe("companySlugSchema", () => {
  it("accepts lowercase hyphenated slugs", () => {
    expect(companySlugSchema.safeParse("demo-co").success).toBe(true);
  });

  it("rejects uppercase and spaces", () => {
    expect(companySlugSchema.safeParse("Demo Co").success).toBe(false);
  });
});
