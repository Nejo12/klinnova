import { describe, expect, it } from "vitest";

import {
  EMPLOYMENT_TYPE_CODES,
  GERMAN_COMFORT_CODES,
  JOB_CATEGORY_CODES,
  LANGUAGE_CODES,
  LANGUAGE_PROFICIENCY_CODES,
  SHIFT_PREFERENCE_CODES,
  TRAVEL_TIME_MINUTES,
  uniqueOrdered,
} from "@/lib/onboarding/allow-lists";

describe("D-025 allow-lists", () => {
  it("exposes expected german comfort codes without fluent", () => {
    expect([...GERMAN_COMFORT_CODES]).toEqual([
      "none",
      "basic",
      "conversational",
      "comfortable",
    ]);
    expect(GERMAN_COMFORT_CODES).not.toContain("fluent");
  });

  it("exposes travel times as minutes", () => {
    expect([...TRAVEL_TIME_MINUTES]).toEqual([15, 30, 45, 60]);
  });

  it("exposes job, employment, shift, language, and proficiency sets", () => {
    expect(JOB_CATEGORY_CODES).toContain("cleaning");
    expect(JOB_CATEGORY_CODES).not.toContain("other");
    expect(EMPLOYMENT_TYPE_CODES).toEqual([
      "full_time",
      "part_time",
      "mini_job",
      "temporary",
    ]);
    expect(SHIFT_PREFERENCE_CODES).toContain("flexible");
    expect(LANGUAGE_CODES).toContain("de");
    expect(LANGUAGE_CODES).toContain("other");
    expect(LANGUAGE_PROFICIENCY_CODES).toEqual([
      "basic",
      "conversational",
      "proficient",
      "native",
    ]);
  });

  it("deduplicates while preserving order", () => {
    expect(uniqueOrdered(["a", "b", "a", "c"])).toEqual(["a", "b", "c"]);
  });
});
