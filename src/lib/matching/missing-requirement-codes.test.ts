import { describe, expect, it } from "vitest";

import {
  MISSING_REQUIREMENT_CODES,
  missingRequirementLabel,
  parseMissingRequirementCodes,
  type MissingRequirementCode,
} from "@/lib/matching/missing-requirement-codes";

describe("missingRequirementLabel", () => {
  it("provides a label for every canonical code", () => {
    for (const code of MISSING_REQUIREMENT_CODES) {
      expect(missingRequirementLabel(code).length).toBeGreaterThan(0);
    }
  });

  it("exposes exactly the six canonical codes in database evaluation order", () => {
    expect(MISSING_REQUIREMENT_CODES).toEqual([
      "category",
      "employment_type",
      "shift",
      "german",
      "language",
      "availability",
    ]);
  });

  it("never uses employer-rejection or permanent-ineligibility wording", () => {
    for (const code of MISSING_REQUIREMENT_CODES) {
      const label = missingRequirementLabel(code);
      expect(label).not.toMatch(/reject/i);
      expect(label).not.toMatch(/permanent/i);
      expect(label).not.toMatch(/never/i);
    }
  });
});

describe("parseMissingRequirementCodes", () => {
  it("parses a valid ordered array", () => {
    expect(parseMissingRequirementCodes(["category", "german"])).toEqual([
      "category",
      "german",
    ]);
  });

  it("parses an empty array", () => {
    expect(parseMissingRequirementCodes([])).toEqual([]);
  });

  it("preserves the exact order given, never re-sorting", () => {
    const input: MissingRequirementCode[] = ["availability", "category"];
    expect(parseMissingRequirementCodes(input)).toEqual([
      "availability",
      "category",
    ]);
  });

  it("rejects an unknown code", () => {
    expect(parseMissingRequirementCodes(["category", "not_a_code"])).toBeNull();
  });

  it("rejects a duplicate code", () => {
    expect(parseMissingRequirementCodes(["category", "category"])).toBeNull();
  });

  it("rejects a non-array value", () => {
    expect(parseMissingRequirementCodes("category")).toBeNull();
    expect(parseMissingRequirementCodes(null)).toBeNull();
    expect(parseMissingRequirementCodes(undefined)).toBeNull();
  });
});
