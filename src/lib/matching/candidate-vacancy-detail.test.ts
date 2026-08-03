import { describe, expect, it } from "vitest";

import { buildCandidateVacancyDetail } from "@/lib/matching/candidate-vacancy-detail";
import { matchCandidateToVacancy } from "@/lib/matching/match-candidate-to-vacancy";
import { makeCandidate, makeVacancy } from "@/lib/matching/test-fixtures";
import type { MatchReason } from "@/lib/matching/types";

describe("buildCandidateVacancyDetail", () => {
  it("maps schema-backed fields, privacy-safe city, and capped reasons", () => {
    const sevenReasons: MatchReason[] = [
      { code: "category_match", category: "hospitality" },
      { code: "employment_type_match", employmentTypes: ["part_time"] },
      { code: "shift_match", viaFlexible: true },
      { code: "german_requirement_met", germanRequirement: "basic" },
      { code: "additional_languages_met", languageCodes: ["en"] },
      { code: "availability_match", kind: "flexible_start" },
      { code: "berlin_job", city: "Berlin" },
    ];

    const match = matchCandidateToVacancy(
      makeCandidate({
        shiftPreferences: ["flexible"],
        germanComfort: "comfortable",
        languages: [
          { languageCode: "en", proficiency: "native" },
          { languageCode: "tr", proficiency: "basic" },
        ],
      }),
      makeVacancy({
        title: "Demo vacancy — Morning kitchen support",
        company: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Demo Berlin Work Co",
          slug: "demo-berlin-work-co",
        },
        availableFrom: null,
        languageRequirements: [
          { languageCode: "tr", minProficiency: "basic" },
          { languageCode: "en", minProficiency: "conversational" },
        ],
      }),
    );
    if (match === null) {
      throw new Error("Expected fixture match");
    }

    const detail = buildCandidateVacancyDetail({
      ...match,
      reasons: sevenReasons,
    });

    expect(detail.title).toBe("Demo vacancy — Morning kitchen support");
    expect(detail.employerDisplayName).toBe("Demo Berlin Work Co");
    expect(detail.demoLabel).toBe("Demo vacancy");
    expect(detail.city).toBe("Berlin");
    expect(detail.jobCategoryLabel).toBe("Hospitality");
    expect(detail.availableFromLabel).toBe("Flexible start");
    expect(detail.listedOnLabel).toBeTruthy();
    expect(
      detail.languageRequirements.map((item) => item.languageCode),
    ).toEqual(["en", "tr"]);
    expect(detail.matchReasons).toHaveLength(4);
    expect(detail.matchReasons[0]?.text).toMatch(/hospitality preference/i);
    expect(JSON.stringify(detail)).not.toMatch(
      /email|phone|cv|salary|exact_address|auth_user/i,
    );
  });

  it("formats fixed availability and omits empty language requirements", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({
        availableFrom: "2026-02-01",
        shiftPreferences: ["flexible"],
        germanComfort: "comfortable",
      }),
      makeVacancy({
        availableFrom: "2026-09-01",
        languageRequirements: [],
      }),
    );
    if (match === null) {
      throw new Error("Expected fixture match");
    }

    const detail = buildCandidateVacancyDetail(match);
    expect(detail.availableFromLabel).toBe("From 1 September 2026");
    expect(detail.languageRequirements).toEqual([]);
  });
});
