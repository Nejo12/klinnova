import { describe, expect, it } from "vitest";

import { buildCandidatePulseProfile } from "./candidate-profile";

describe("buildCandidatePulseProfile", () => {
  it("maps only real canonical matching inputs into candidate-facing labels", () => {
    expect(
      buildCandidatePulseProfile({
        profile: {
          germanComfort: "conversational",
          jobCategories: ["cleaning", "logistics"],
          availableFrom: "2026-09-01",
          employmentTypes: ["part_time"],
          shiftPreferences: ["morning", "flexible"],
        },
        languages: [
          { languageCode: "en", proficiency: "native" },
          { languageCode: "de", proficiency: "conversational" },
        ],
      }),
    ).toEqual([
      {
        key: "categories",
        label: "Roles",
        value: "Cleaning, Logistics",
        rawValues: ["cleaning", "logistics"],
      },
      {
        key: "employment",
        label: "Employment",
        value: "Part time",
        rawValues: ["part_time"],
      },
      {
        key: "shifts",
        label: "Shifts",
        value: "Morning, Flexible",
        rawValues: ["morning", "flexible"],
      },
      {
        key: "german",
        label: "German",
        value: "Conversational German",
        rawValue: "conversational",
      },
      {
        key: "languages",
        label: "Languages",
        value: "English, German",
        rawValues: ["en", "de"],
      },
      {
        key: "availability",
        label: "Available from",
        value: "1 Sept 2026",
        rawValue: "2026-09-01",
      },
    ]);
  });
});
