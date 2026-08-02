import { describe, expect, it } from "vitest";

import {
  MatchingInvariantError,
  mapCandidateMatchingInput,
  mapVacanciesMatchingInput,
  type CandidateProfileRow,
} from "@/lib/matching/map-database-records";

const completeProfile: CandidateProfileRow = {
  city: "Berlin",
  german_comfort: "basic",
  job_categories: ["hospitality"],
  employment_types: ["part_time"],
  shift_preferences: ["morning", "flexible"],
  available_from: "2026-08-01",
  onboarding_completed_at: "2026-07-01T12:00:00+00:00",
};

const validVacancy = {
  id: "22222222-2222-4222-8222-222222222201",
  title: "Demo vacancy — Morning kitchen support",
  slug: "demo-morning-kitchen-support",
  summary: "Fictional demo hospitality role.",
  city: "Berlin",
  job_category: "hospitality",
  employment_types: ["part_time", "mini_job"],
  shift_requirements: ["morning", "daytime"],
  german_requirement: "basic",
  available_from: null,
  published_at: "2026-01-15T09:00:00+00:00",
  expires_at: "2027-12-31T23:59:59+00:00",
  source: "seed",
  publication_state: "published",
  companies: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Demo Berlin Work Co",
    slug: "demo-berlin-work-co",
    source: "seed",
  },
};

describe("mapCandidateMatchingInput", () => {
  it("maps a completed Berlin candidate", () => {
    const mapped = mapCandidateMatchingInput(completeProfile, [
      { language_code: "en", proficiency: "conversational" },
    ]);
    expect(mapped.city).toBe("Berlin");
    expect(mapped.languages).toEqual([
      { languageCode: "en", proficiency: "conversational" },
    ]);
  });

  it("rejects incomplete or non-Berlin profiles", () => {
    expect(() =>
      mapCandidateMatchingInput(
        { ...completeProfile, onboarding_completed_at: null },
        [],
      ),
    ).toThrow(MatchingInvariantError);

    expect(() =>
      mapCandidateMatchingInput({ ...completeProfile, city: "Munich" }, []),
    ).toThrow(MatchingInvariantError);
  });
});

describe("mapVacanciesMatchingInput", () => {
  it("maps seed published Berlin vacancies and groups languages", () => {
    const mapped = mapVacanciesMatchingInput(
      [validVacancy],
      [
        {
          vacancy_id: validVacancy.id,
          language_code: "en",
          min_proficiency: "basic",
        },
      ],
    );
    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.publishedAt).toBe(validVacancy.published_at);
    expect(mapped[0]?.languageRequirements).toEqual([
      { languageCode: "en", minProficiency: "basic" },
    ]);
  });

  it("rejects flexible vacancy shifts", () => {
    expect(() =>
      mapVacanciesMatchingInput(
        [
          {
            ...validVacancy,
            shift_requirements: ["flexible"],
          },
        ],
        [],
      ),
    ).toThrow(MatchingInvariantError);
  });

  it("rejects missing published_at, non-seed source, or withdrawn state", () => {
    expect(() =>
      mapVacanciesMatchingInput([{ ...validVacancy, published_at: null }], []),
    ).toThrow(MatchingInvariantError);

    expect(() =>
      mapVacanciesMatchingInput([{ ...validVacancy, source: "manual" }], []),
    ).toThrow(MatchingInvariantError);

    expect(() =>
      mapVacanciesMatchingInput(
        [{ ...validVacancy, publication_state: "withdrawn" }],
        [],
      ),
    ).toThrow(MatchingInvariantError);
  });

  it("rejects non-Berlin vacancy city", () => {
    expect(() =>
      mapVacanciesMatchingInput([{ ...validVacancy, city: "Hamburg" }], []),
    ).toThrow(MatchingInvariantError);
  });
});
