import { describe, expect, it } from "vitest";

import {
  publicVacancyLanguageRowSchema,
  publicVacancyRowSchema,
} from "@/lib/public-jobs/schemas";

const employerRow = {
  vacancy_id: "11111111-1111-4111-8111-111111111111",
  title: "Evening cleaner",
  description: "Two hours, weekday evenings.",
  job_category: "cleaning",
  public_locality: "Mitte",
  workplace_type: "private_home",
  work_frequency: "recurring",
  cv_required: false,
  interview_english_ok: true,
  source: "employer",
  employer_type: "private",
  employer_display_name: "Ada Lovelace",
  company_name: null,
  website: "https://example.test",
  published_at: "2026-08-01T00:00:00Z",
  expires_at: "2026-09-01T00:00:00Z",
};

const seedRow = {
  vacancy_id: "22222222-2222-4222-8222-222222222222",
  title: "Warehouse picker",
  description: null,
  job_category: "warehousing",
  public_locality: null,
  workplace_type: null,
  work_frequency: null,
  cv_required: null,
  interview_english_ok: null,
  source: "seed",
  employer_type: null,
  employer_display_name: "Demo Logistics GmbH",
  company_name: "Demo Logistics GmbH",
  website: null,
  published_at: "2026-08-01T00:00:00Z",
  expires_at: "2026-09-01T00:00:00Z",
};

describe("publicVacancyRowSchema", () => {
  it("parses a full employer row", () => {
    expect(publicVacancyRowSchema.safeParse(employerRow).success).toBe(true);
  });

  it("parses a seed row with the documented nullable fields null", () => {
    const result = publicVacancyRowSchema.safeParse(seedRow);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.description).toBeNull();
    expect(result.data.workplace_type).toBeNull();
    expect(result.data.employer_type).toBeNull();
  });

  it("fails when a required field is missing", () => {
    const rest: Partial<typeof employerRow> = { ...employerRow };
    delete rest.title;
    expect(publicVacancyRowSchema.safeParse(rest).success).toBe(false);
  });

  it("fails on an unknown job_category", () => {
    expect(
      publicVacancyRowSchema.safeParse({
        ...employerRow,
        job_category: "not-a-category",
      }).success,
    ).toBe(false);
  });

  it("fails on an unknown workplace_type", () => {
    expect(
      publicVacancyRowSchema.safeParse({
        ...employerRow,
        workplace_type: "castle",
      }).success,
    ).toBe(false);
  });

  it("fails on a malformed vacancy_id", () => {
    expect(
      publicVacancyRowSchema.safeParse({
        ...employerRow,
        vacancy_id: "not-a-uuid",
      }).success,
    ).toBe(false);
  });
});

describe("publicVacancyLanguageRowSchema", () => {
  it("parses a valid language row", () => {
    expect(
      publicVacancyLanguageRowSchema.safeParse({
        language_code: "en",
        min_proficiency: "basic",
      }).success,
    ).toBe(true);
  });

  it("fails on an unknown language_code", () => {
    expect(
      publicVacancyLanguageRowSchema.safeParse({
        language_code: "xx",
        min_proficiency: "basic",
      }).success,
    ).toBe(false);
  });
});
