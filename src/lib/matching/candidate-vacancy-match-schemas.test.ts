import { describe, expect, it } from "vitest";

import {
  candidateVacancyMatchListSchema,
  candidateVacancyMatchRowSchema,
} from "@/lib/matching/candidate-vacancy-match-schemas";

const eligibleRow = {
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
  eligible: true,
  missing_requirements: [],
};

describe("candidateVacancyMatchRowSchema", () => {
  it("parses a well-formed eligible row", () => {
    expect(candidateVacancyMatchRowSchema.safeParse(eligibleRow).success).toBe(
      true,
    );
  });

  it("rejects eligible: false as a contract violation", () => {
    expect(
      candidateVacancyMatchRowSchema.safeParse({
        ...eligibleRow,
        eligible: false,
      }).success,
    ).toBe(false);
  });

  it("rejects a non-empty missing_requirements array as a contract violation", () => {
    expect(
      candidateVacancyMatchRowSchema.safeParse({
        ...eligibleRow,
        missing_requirements: ["category"],
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown missing-requirement code", () => {
    expect(
      candidateVacancyMatchRowSchema.safeParse({
        ...eligibleRow,
        missing_requirements: ["not_a_code"],
      }).success,
    ).toBe(false);
  });
});

describe("candidateVacancyMatchListSchema", () => {
  it("parses a list of valid rows", () => {
    const result = candidateVacancyMatchListSchema.safeParse([eligibleRow]);
    expect(result.success).toBe(true);
  });

  it("fails the whole list when one row is malformed", () => {
    const malformed = { ...eligibleRow, vacancy_id: "not-a-uuid" };
    const result = candidateVacancyMatchListSchema.safeParse([
      eligibleRow,
      malformed,
    ]);
    expect(result.success).toBe(false);
  });

  it("parses an empty list", () => {
    expect(candidateVacancyMatchListSchema.safeParse([]).success).toBe(true);
  });
});
