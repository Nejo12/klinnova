import type {
  CandidateMatchingInput,
  VacancyMatchingInput,
} from "@/lib/matching/types";

export function makeCandidate(
  overrides: Partial<CandidateMatchingInput> = {},
): CandidateMatchingInput {
  return {
    city: "Berlin",
    germanComfort: "conversational",
    jobCategories: ["hospitality", "cleaning"],
    employmentTypes: ["part_time", "mini_job"],
    shiftPreferences: ["morning", "daytime"],
    availableFrom: "2026-08-01",
    languages: [
      { languageCode: "en", proficiency: "conversational" },
      { languageCode: "ar", proficiency: "native" },
    ],
    ...overrides,
  };
}

export function makeVacancy(
  overrides: Partial<VacancyMatchingInput> = {},
): VacancyMatchingInput {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    company: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Demo Cafe",
      slug: "demo-cafe",
    },
    title: "Cafe Helper",
    slug: "cafe-helper",
    summary: "Support the morning service.",
    city: "Berlin",
    jobCategory: "hospitality",
    employmentTypes: ["part_time"],
    shiftRequirements: ["morning"],
    germanRequirement: "basic",
    availableFrom: null,
    publishedAt: "2026-07-01T10:00:00+00:00",
    languageRequirements: [],
    ...overrides,
  };
}
