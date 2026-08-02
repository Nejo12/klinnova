import { describe, expect, it } from "vitest";

import {
  MAX_DISPLAYED_MATCH_REASONS,
  presentMatchReasons,
} from "@/lib/matching/present-reasons";
import type { MatchReason } from "@/lib/matching/types";

const allReasons: MatchReason[] = [
  { code: "category_match", category: "cleaning" },
  {
    code: "employment_type_match",
    employmentTypes: ["part_time", "mini_job"],
  },
  { code: "shift_match", viaFlexible: true },
  { code: "german_requirement_met", germanRequirement: "basic" },
  { code: "additional_languages_met", languageCodes: ["en", "ar"] },
  { code: "availability_match", kind: "flexible_start" },
  { code: "berlin_job", city: "Berlin" },
];

describe("presentMatchReasons", () => {
  it("caps at four reasons and preserves priority order", () => {
    const presented = presentMatchReasons(allReasons);
    expect(presented).toHaveLength(MAX_DISPLAYED_MATCH_REASONS);
    expect(presented.map((reason) => reason.text)).toEqual([
      "Matches your cleaning preference",
      "Part time and Mini-job work matches your preference",
      "Your flexible shift preference fits",
      "Your German level meets the requirement",
    ]);
    expect(presented.every((reason) => !reason.text.includes("_"))).toBe(true);
    expect(presented.map((reason) => reason.text).join(" ")).not.toMatch(
      /\b(score|percent|travel)\b/i,
    );
  });

  it("handles fewer than four reasons", () => {
    expect(
      presentMatchReasons([
        { code: "category_match", category: "retail" },
        { code: "berlin_job", city: "Berlin" },
      ]).map((reason) => reason.text),
    ).toEqual(["Matches your retail preference", "Based in Berlin"]);
  });

  it("renders concrete shifts and language metadata", () => {
    expect(
      presentMatchReasons([
        {
          code: "shift_match",
          viaFlexible: false,
          shifts: ["morning", "weekend"],
        },
        {
          code: "additional_languages_met",
          languageCodes: ["en"],
        },
      ]).map((reason) => reason.text),
    ).toEqual([
      "Morning and Weekend shifts fit your preference",
      "Your listed English meets the requirement",
    ]);
  });
});
