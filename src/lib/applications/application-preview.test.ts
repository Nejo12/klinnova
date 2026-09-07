import { describe, expect, it } from "vitest";

import { buildApplicationPreview } from "@/lib/applications/application-preview";
import { NO_ADDITIONAL_LANGUAGE_REQUIREMENTS } from "@/lib/applications/messages";
import { matchCandidateToVacancy } from "@/lib/matching/match-candidate-to-vacancy";
import { makeCandidate, makeVacancy } from "@/lib/matching/test-fixtures";

describe("buildApplicationPreview", () => {
  it("maps only approved preview fields with deterministic ordering", () => {
    const candidate = makeCandidate({
      germanComfort: "basic",
      employmentTypes: ["mini_job", "part_time", "full_time"],
      shiftPreferences: ["weekend", "morning", "daytime"],
      availableFrom: "2026-08-15",
      languages: [
        { languageCode: "tr", proficiency: "basic" },
        { languageCode: "en", proficiency: "native" },
        { languageCode: "ar", proficiency: "conversational" },
      ],
    });
    const vacancy = makeVacancy({
      title: "Demo vacancy — Morning kitchen support",
      company: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Demo Berlin Work Co",
        slug: "demo-berlin-work-co",
      },
      languageRequirements: [
        { languageCode: "en", minProficiency: "basic" },
        { languageCode: "tr", minProficiency: "basic" },
      ],
    });
    const match = matchCandidateToVacancy(candidate, vacancy);
    if (match === null) {
      throw new Error("Expected fixture match");
    }

    const preview = buildApplicationPreview({
      match,
      candidate,
      displayName: "Ada Candidate",
      workAuthorisationDeclared: true,
    });

    expect(preview).toEqual({
      vacancyId: vacancy.id,
      vacancyTitle: "Demo vacancy — Morning kitchen support",
      employerDisplayName: "Demo Berlin Work Co",
      candidateDisplayName: "Ada Candidate",
      matchedJobCategoryLabel: "Hospitality",
      matchedJobCategory: "hospitality",
      germanComfortLabel: "I can understand and use some basic German",
      germanComfort: "basic",
      relevantLanguages: [
        {
          languageCode: "en",
          languageLabel: "English",
          proficiencyLabel: "Native",
          proficiency: "native",
        },
        {
          languageCode: "tr",
          languageLabel: "Turkish",
          proficiencyLabel: "Basic",
          proficiency: "basic",
        },
      ],
      noAdditionalLanguagesLabel: null,
      workAuthorisationDeclaredLabel: "Yes",
      workAuthorisationDeclared: true,
      availableFromLabel: "15 August 2026",
      availableFrom: "2026-08-15",
      employmentPreferencesLabel: "Full time, Part time, and Mini-job",
      employmentPreferences: ["full_time", "part_time", "mini_job"],
      shiftPreferencesLabel: "Morning, Daytime, and Weekend",
      shiftPreferences: ["morning", "daytime", "weekend"],
    });

    const serialized = JSON.stringify(preview);
    expect(serialized).not.toMatch(/email|phone|cv|address|auth_|salary/i);
    expect(serialized).not.toContain("summary");
    expect(preview.relevantLanguages.map((item) => item.languageCode)).toEqual([
      "en",
      "tr",
    ]);
  });

  it("shows approved empty-language state when vacancy has none", () => {
    const candidate = makeCandidate({
      languages: [{ languageCode: "en", proficiency: "native" }],
    });
    const vacancy = makeVacancy({ languageRequirements: [] });
    const match = matchCandidateToVacancy(candidate, vacancy);
    if (match === null) {
      throw new Error("Expected fixture match");
    }

    const preview = buildApplicationPreview({
      match,
      candidate,
      displayName: "Sam",
      workAuthorisationDeclared: true,
    });

    expect(preview.relevantLanguages).toEqual([]);
    expect(preview.noAdditionalLanguagesLabel).toBe(
      NO_ADDITIONAL_LANGUAGE_REQUIREMENTS,
    );
  });

  it("filters unrelated candidate languages and uses Not sure vocabulary", () => {
    const candidate = makeCandidate({
      languages: [
        { languageCode: "en", proficiency: "native" },
        { languageCode: "fr", proficiency: "basic" },
      ],
    });
    const vacancy = makeVacancy({
      languageRequirements: [
        { languageCode: "en", minProficiency: "conversational" },
      ],
    });
    const match = matchCandidateToVacancy(candidate, vacancy);
    if (match === null) {
      throw new Error("Expected fixture match");
    }

    const preview = buildApplicationPreview({
      match,
      candidate,
      displayName: "Sam",
      workAuthorisationDeclared: false,
    });

    expect(preview.relevantLanguages.map((item) => item.languageCode)).toEqual([
      "en",
    ]);
    expect(preview.workAuthorisationDeclaredLabel).toBe("Not sure");
    expect(preview.noAdditionalLanguagesLabel).toBeNull();
  });

  it("omits blank availability rather than inventing a date", () => {
    const candidate = makeCandidate({ availableFrom: "" });
    const vacancy = makeVacancy({ availableFrom: null });
    // Bypass matcher date rules for presentation-only nullability coverage.
    const match = {
      vacancy,
      reasons: [{ code: "berlin_job" as const, city: "Berlin" as const }],
    };

    const preview = buildApplicationPreview({
      match,
      candidate,
      displayName: "Sam",
      workAuthorisationDeclared: true,
    });

    expect(preview.availableFromLabel).toBeNull();
  });
});
