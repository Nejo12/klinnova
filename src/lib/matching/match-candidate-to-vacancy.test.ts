import { describe, expect, it } from "vitest";

import { matchCandidateToVacancy } from "@/lib/matching/match-candidate-to-vacancy";
import { makeCandidate, makeVacancy } from "@/lib/matching/test-fixtures";
import type { GermanComfort, MatchReasonCode } from "@/lib/matching/types";

const REASON_CODES = (reasons: { code: MatchReasonCode }[]) =>
  reasons.map((reason) => reason.code);

describe("matchCandidateToVacancy — category", () => {
  it("matches exact category", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({ jobCategories: ["hospitality"] }),
      makeVacancy({ jobCategory: "hospitality" }),
    );
    expect(match).not.toBeNull();
    expect(match?.reasons[0]).toEqual({
      code: "category_match",
      category: "hospitality",
    });
  });

  it("rejects category mismatch", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({ jobCategories: ["cleaning"] }),
        makeVacancy({ jobCategory: "hospitality" }),
      ),
    ).toBeNull();
  });

  it("matches when candidate has multiple categories including vacancy category", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({ jobCategories: ["cleaning", "retail", "hospitality"] }),
        makeVacancy({ jobCategory: "retail" }),
      ),
    ).not.toBeNull();
  });
});

describe("matchCandidateToVacancy — employment", () => {
  it("matches one overlap", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({ employmentTypes: ["part_time", "full_time"] }),
      makeVacancy({ employmentTypes: ["mini_job", "part_time"] }),
    );
    expect(match).not.toBeNull();
    expect(
      match?.reasons.find((r) => r.code === "employment_type_match"),
    ).toEqual({
      code: "employment_type_match",
      employmentTypes: ["part_time"],
    });
  });

  it("returns multiple overlaps in allow-list order", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({
        employmentTypes: ["temporary", "full_time", "mini_job", "part_time"],
      }),
      makeVacancy({
        employmentTypes: ["mini_job", "temporary", "part_time"],
      }),
    );
    expect(
      match?.reasons.find((r) => r.code === "employment_type_match"),
    ).toEqual({
      code: "employment_type_match",
      employmentTypes: ["part_time", "mini_job", "temporary"],
    });
  });

  it("rejects no overlap", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({ employmentTypes: ["full_time"] }),
        makeVacancy({ employmentTypes: ["mini_job"] }),
      ),
    ).toBeNull();
  });

  it("stays deterministic with duplicate malformed employment input", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({
        employmentTypes: ["part_time", "part_time", "mini_job"],
      }),
      makeVacancy({
        employmentTypes: ["mini_job", "mini_job", "part_time"],
      }),
    );
    expect(
      match?.reasons.find((r) => r.code === "employment_type_match"),
    ).toEqual({
      code: "employment_type_match",
      employmentTypes: ["part_time", "mini_job"],
    });
  });
});

describe("matchCandidateToVacancy — shift", () => {
  it("matches concrete overlap", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({ shiftPreferences: ["evening", "night"] }),
      makeVacancy({ shiftRequirements: ["night"] }),
    );
    expect(match?.reasons.find((r) => r.code === "shift_match")).toEqual({
      code: "shift_match",
      viaFlexible: false,
      shifts: ["night"],
    });
  });

  it("rejects no concrete overlap", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({ shiftPreferences: ["morning"] }),
        makeVacancy({ shiftRequirements: ["night"] }),
      ),
    ).toBeNull();
  });

  it("passes any concrete vacancy shift when candidate is flexible", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({ shiftPreferences: ["flexible"] }),
      makeVacancy({ shiftRequirements: ["night", "weekend"] }),
    );
    expect(match).not.toBeNull();
    expect(match?.reasons.find((r) => r.code === "shift_match")).toEqual({
      code: "shift_match",
      viaFlexible: true,
    });
  });

  it("matches weekend overlap", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({ shiftPreferences: ["weekend", "morning"] }),
      makeVacancy({ shiftRequirements: ["daytime", "weekend"] }),
    );
    expect(match?.reasons.find((r) => r.code === "shift_match")).toEqual({
      code: "shift_match",
      viaFlexible: false,
      shifts: ["weekend"],
    });
  });

  it("rejects vacancy malformed flexible shift", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({ shiftPreferences: ["morning"] }),
        makeVacancy({
          shiftRequirements: ["flexible"] as unknown as ["morning"],
        }),
      ),
    ).toBeNull();
  });

  it("orders multiple concrete overlaps by allow-list", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({
        shiftPreferences: ["weekend", "night", "morning", "daytime"],
      }),
      makeVacancy({
        shiftRequirements: ["night", "morning", "weekend"],
      }),
    );
    expect(match?.reasons.find((r) => r.code === "shift_match")).toEqual({
      code: "shift_match",
      viaFlexible: false,
      shifts: ["morning", "night", "weekend"],
    });
  });
});

describe("matchCandidateToVacancy — German ordinals", () => {
  const levels: GermanComfort[] = [
    "none",
    "basic",
    "conversational",
    "comfortable",
  ];

  it.each([
    ["none", ["none"], ["basic", "conversational", "comfortable"]],
    ["basic", ["none", "basic"], ["conversational", "comfortable"]],
    ["conversational", ["none", "basic", "conversational"], ["comfortable"]],
    ["comfortable", levels, []],
  ] as const)(
    "candidate %s satisfies %j and fails %j",
    (candidateLevel, pass, fail) => {
      for (const required of pass) {
        expect(
          matchCandidateToVacancy(
            makeCandidate({ germanComfort: candidateLevel }),
            makeVacancy({ germanRequirement: required }),
          ),
          `${candidateLevel} should satisfy ${required}`,
        ).not.toBeNull();
      }
      for (const required of fail) {
        expect(
          matchCandidateToVacancy(
            makeCandidate({ germanComfort: candidateLevel }),
            makeVacancy({ germanRequirement: required }),
          ),
          `${candidateLevel} should fail ${required}`,
        ).toBeNull();
      }
    },
  );
});

describe("matchCandidateToVacancy — additional languages", () => {
  it("passes zero requirement rows without language reason", () => {
    const match = matchCandidateToVacancy(
      makeCandidate(),
      makeVacancy({ languageRequirements: [] }),
    );
    expect(match).not.toBeNull();
    expect(REASON_CODES(match!.reasons)).not.toContain(
      "additional_languages_met",
    );
  });

  it("matches exact proficiency", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({
        languages: [{ languageCode: "en", proficiency: "conversational" }],
      }),
      makeVacancy({
        languageRequirements: [
          { languageCode: "en", minProficiency: "conversational" },
        ],
      }),
    );
    expect(
      match?.reasons.find((r) => r.code === "additional_languages_met"),
    ).toEqual({
      code: "additional_languages_met",
      languageCodes: ["en"],
    });
  });

  it("matches candidate above minimum", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({
          languages: [{ languageCode: "en", proficiency: "native" }],
        }),
        makeVacancy({
          languageRequirements: [
            { languageCode: "en", minProficiency: "basic" },
          ],
        }),
      ),
    ).not.toBeNull();
  });

  it("fails below minimum", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({
          languages: [{ languageCode: "en", proficiency: "basic" }],
        }),
        makeVacancy({
          languageRequirements: [
            { languageCode: "en", minProficiency: "proficient" },
          ],
        }),
      ),
    ).toBeNull();
  });

  it("fails missing language", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({
          languages: [{ languageCode: "en", proficiency: "native" }],
        }),
        makeVacancy({
          languageRequirements: [
            { languageCode: "ar", minProficiency: "basic" },
          ],
        }),
      ),
    ).toBeNull();
  });

  it("matches English requirement", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({
          languages: [{ languageCode: "en", proficiency: "proficient" }],
        }),
        makeVacancy({
          languageRequirements: [
            { languageCode: "en", minProficiency: "conversational" },
          ],
        }),
      ),
    ).not.toBeNull();
  });

  it("matches non-English requirement", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({
          languages: [{ languageCode: "ar", proficiency: "conversational" }],
        }),
        makeVacancy({
          languageRequirements: [
            { languageCode: "ar", minProficiency: "basic" },
          ],
        }),
      ),
    ).not.toBeNull();
  });

  it("requires all multi-language rows", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({
          languages: [
            { languageCode: "en", proficiency: "proficient" },
            { languageCode: "ar", proficiency: "native" },
          ],
        }),
        makeVacancy({
          languageRequirements: [
            { languageCode: "ar", minProficiency: "basic" },
            { languageCode: "en", minProficiency: "conversational" },
          ],
        }),
      ),
    ).not.toBeNull();
  });

  it("fails multi-language when one is missing", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({
          languages: [{ languageCode: "en", proficiency: "native" }],
        }),
        makeVacancy({
          languageRequirements: [
            { languageCode: "en", minProficiency: "basic" },
            { languageCode: "tr", minProficiency: "basic" },
          ],
        }),
      ),
    ).toBeNull();
  });

  it("matches other only to other", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({
          languages: [{ languageCode: "other", proficiency: "native" }],
        }),
        makeVacancy({
          languageRequirements: [
            { languageCode: "other", minProficiency: "basic" },
          ],
        }),
      ),
    ).not.toBeNull();

    expect(
      matchCandidateToVacancy(
        makeCandidate({
          languages: [{ languageCode: "en", proficiency: "native" }],
        }),
        makeVacancy({
          languageRequirements: [
            { languageCode: "other", minProficiency: "basic" },
          ],
        }),
      ),
    ).toBeNull();
  });

  it("orders satisfied language codes by allow-list", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({
        languages: [
          { languageCode: "tr", proficiency: "native" },
          { languageCode: "en", proficiency: "native" },
          { languageCode: "ar", proficiency: "native" },
        ],
      }),
      makeVacancy({
        languageRequirements: [
          { languageCode: "tr", minProficiency: "basic" },
          { languageCode: "ar", minProficiency: "basic" },
          { languageCode: "en", minProficiency: "basic" },
        ],
      }),
    );
    expect(
      match?.reasons.find((r) => r.code === "additional_languages_met"),
    ).toEqual({
      code: "additional_languages_met",
      languageCodes: ["en", "ar", "tr"],
    });
  });

  it("uses highest proficiency when duplicate candidate languages are supplied", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({
          languages: [
            { languageCode: "en", proficiency: "basic" },
            { languageCode: "en", proficiency: "native" },
          ],
        }),
        makeVacancy({
          languageRequirements: [
            { languageCode: "en", minProficiency: "proficient" },
          ],
        }),
      ),
    ).not.toBeNull();
  });
});

describe("matchCandidateToVacancy — availability", () => {
  it("passes vacancy null flexible start", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({ availableFrom: "2026-12-01" }),
      makeVacancy({ availableFrom: null }),
    );
    expect(match?.reasons.find((r) => r.code === "availability_match")).toEqual(
      {
        code: "availability_match",
        kind: "flexible_start",
      },
    );
  });

  it("passes candidate earlier than fixed start", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({ availableFrom: "2026-08-01" }),
      makeVacancy({ availableFrom: "2026-09-01" }),
    );
    expect(match?.reasons.find((r) => r.code === "availability_match")).toEqual(
      {
        code: "availability_match",
        kind: "fixed_start",
        candidateAvailableFrom: "2026-08-01",
        vacancyAvailableFrom: "2026-09-01",
      },
    );
  });

  it("passes same date", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({ availableFrom: "2026-09-01" }),
        makeVacancy({ availableFrom: "2026-09-01" }),
      ),
    ).not.toBeNull();
  });

  it("fails candidate later than fixed start", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({ availableFrom: "2026-10-01" }),
        makeVacancy({ availableFrom: "2026-09-01" }),
      ),
    ).toBeNull();
  });

  it("compares ISO calendar dates without timezone shift", () => {
    // Lexical YYYY-MM-DD; must not depend on local TZ Date parsing.
    expect(
      matchCandidateToVacancy(
        makeCandidate({ availableFrom: "2026-03-01" }),
        makeVacancy({ availableFrom: "2026-03-01" }),
      ),
    ).not.toBeNull();
    expect(
      matchCandidateToVacancy(
        makeCandidate({ availableFrom: "2026-03-02" }),
        makeVacancy({ availableFrom: "2026-03-01" }),
      ),
    ).toBeNull();
  });

  it("rejects malformed dates safely", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({ availableFrom: "2026-13-40" }),
        makeVacancy({ availableFrom: null }),
      ),
    ).toBeNull();
    expect(
      matchCandidateToVacancy(
        makeCandidate({ availableFrom: "2026-08-01" }),
        makeVacancy({ availableFrom: "not-a-date" }),
      ),
    ).toBeNull();
  });
});

describe("matchCandidateToVacancy — Berlin", () => {
  it("passes Berlin/Berlin", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({ city: "Berlin" }),
        makeVacancy({ city: "Berlin" }),
      ),
    ).not.toBeNull();
  });

  it("rejects non-Berlin candidate", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({ city: "Munich" as "Berlin" }),
        makeVacancy({ city: "Berlin" }),
      ),
    ).toBeNull();
  });

  it("rejects non-Berlin vacancy", () => {
    expect(
      matchCandidateToVacancy(
        makeCandidate({ city: "Berlin" }),
        makeVacancy({ city: "Hamburg" as "Berlin" }),
      ),
    ).toBeNull();
  });
});

describe("matchCandidateToVacancy — combined", () => {
  it("returns all applicable reasons in closed priority order", () => {
    const match = matchCandidateToVacancy(
      makeCandidate({
        shiftPreferences: ["flexible"],
        languages: [
          { languageCode: "en", proficiency: "native" },
          { languageCode: "ar", proficiency: "conversational" },
        ],
      }),
      makeVacancy({
        availableFrom: "2026-09-01",
        languageRequirements: [{ languageCode: "en", minProficiency: "basic" }],
      }),
    );
    expect(REASON_CODES(match!.reasons)).toEqual([
      "category_match",
      "employment_type_match",
      "shift_match",
      "german_requirement_met",
      "additional_languages_met",
      "availability_match",
      "berlin_job",
    ]);
  });

  it("does not return partial matches, scores, travel, or work-authorisation reasons", () => {
    const match = matchCandidateToVacancy(makeCandidate(), makeVacancy());
    expect(match).not.toBeNull();
    const codes = REASON_CODES(match!.reasons);
    expect(codes).not.toContain("work_authorisation");
    expect(codes).not.toContain("travel");
    expect(JSON.stringify(match)).not.toMatch(/score|percent|weight/i);

    expect(
      matchCandidateToVacancy(
        makeCandidate({ jobCategories: ["moving"] }),
        makeVacancy({ jobCategory: "hospitality" }),
      ),
    ).toBeNull();
  });

  it("lets each hard filter exclude independently", () => {
    const baseCandidate = makeCandidate();
    const baseVacancy = makeVacancy();
    expect(matchCandidateToVacancy(baseCandidate, baseVacancy)).not.toBeNull();

    expect(
      matchCandidateToVacancy(
        { ...baseCandidate, jobCategories: ["moving"] },
        baseVacancy,
      ),
    ).toBeNull();
    expect(
      matchCandidateToVacancy(
        { ...baseCandidate, employmentTypes: ["full_time"] },
        baseVacancy,
      ),
    ).toBeNull();
    expect(
      matchCandidateToVacancy(
        { ...baseCandidate, shiftPreferences: ["night"] },
        baseVacancy,
      ),
    ).toBeNull();
    expect(
      matchCandidateToVacancy(
        { ...baseCandidate, germanComfort: "none" },
        { ...baseVacancy, germanRequirement: "comfortable" },
      ),
    ).toBeNull();
    expect(
      matchCandidateToVacancy(
        { ...baseCandidate, languages: [] },
        {
          ...baseVacancy,
          languageRequirements: [
            { languageCode: "en", minProficiency: "basic" },
          ],
        },
      ),
    ).toBeNull();
    expect(
      matchCandidateToVacancy(
        { ...baseCandidate, availableFrom: "2027-01-01" },
        { ...baseVacancy, availableFrom: "2026-01-01" },
      ),
    ).toBeNull();
  });
});

describe("matchCandidateToVacancy — fixture-shaped cases", () => {
  it("covers zero-language, English, Arabic, multi-language, flexible/fixed start, German levels, flexible shift", () => {
    const flexibleCandidate = makeCandidate({
      jobCategories: [
        "hospitality",
        "warehousing",
        "retail",
        "cleaning",
        "logistics",
      ],
      employmentTypes: ["part_time", "mini_job", "full_time", "temporary"],
      shiftPreferences: ["flexible"],
      germanComfort: "comfortable",
      availableFrom: "2026-08-01",
      languages: [
        { languageCode: "en", proficiency: "native" },
        { languageCode: "ar", proficiency: "native" },
        { languageCode: "tr", proficiency: "conversational" },
      ],
    });

    const zeroLang = makeVacancy({
      id: "22222222-2222-4222-8222-222222222201",
      jobCategory: "hospitality",
      languageRequirements: [],
      availableFrom: null,
      germanRequirement: "basic",
    });
    expect(matchCandidateToVacancy(flexibleCandidate, zeroLang)).not.toBeNull();

    const english = makeVacancy({
      languageRequirements: [
        { languageCode: "en", minProficiency: "conversational" },
      ],
    });
    expect(matchCandidateToVacancy(flexibleCandidate, english)).not.toBeNull();

    const arabic = makeVacancy({
      languageRequirements: [{ languageCode: "ar", minProficiency: "basic" }],
    });
    expect(matchCandidateToVacancy(flexibleCandidate, arabic)).not.toBeNull();

    const multi = makeVacancy({
      languageRequirements: [
        { languageCode: "en", minProficiency: "basic" },
        { languageCode: "ar", minProficiency: "basic" },
      ],
    });
    expect(matchCandidateToVacancy(flexibleCandidate, multi)).not.toBeNull();

    const fixed = makeVacancy({
      id: "22222222-2222-4222-8222-222222222202",
      jobCategory: "warehousing",
      employmentTypes: ["full_time"],
      shiftRequirements: ["evening", "night"],
      germanRequirement: "none",
      availableFrom: "2026-09-01",
    });
    expect(matchCandidateToVacancy(flexibleCandidate, fixed)).not.toBeNull();

    for (const level of [
      "none",
      "basic",
      "conversational",
      "comfortable",
    ] as const) {
      expect(
        matchCandidateToVacancy(
          flexibleCandidate,
          makeVacancy({ germanRequirement: level }),
        ),
      ).not.toBeNull();
    }
  });
});
