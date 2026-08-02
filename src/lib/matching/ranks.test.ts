import { describe, expect, it } from "vitest";

import {
  GERMAN_COMFORT_RANK,
  LANGUAGE_PROFICIENCY_RANK,
  meetsGermanRequirement,
  meetsLanguageProficiency,
} from "@/lib/matching/ranks";

describe("matching ranks", () => {
  it("defines canonical German ranks", () => {
    expect(GERMAN_COMFORT_RANK).toEqual({
      none: 0,
      basic: 1,
      conversational: 2,
      comfortable: 3,
    });
  });

  it("defines canonical language proficiency ranks", () => {
    expect(LANGUAGE_PROFICIENCY_RANK).toEqual({
      basic: 0,
      conversational: 1,
      proficient: 2,
      native: 3,
    });
  });

  it("compares German eligibility inclusively", () => {
    expect(meetsGermanRequirement("basic", "basic")).toBe(true);
    expect(meetsGermanRequirement("basic", "conversational")).toBe(false);
    expect(meetsGermanRequirement("comfortable", "none")).toBe(true);
  });

  it("compares language proficiency inclusively", () => {
    expect(meetsLanguageProficiency("proficient", "conversational")).toBe(true);
    expect(meetsLanguageProficiency("basic", "native")).toBe(false);
  });
});
