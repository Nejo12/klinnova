import { describe, expect, it } from "vitest";

import {
  APPLICATION_INTRODUCTION_MAX_LENGTH,
  buildApplicationIntroductionSuggestion,
  normalizeApplicationIntroduction,
} from "@/lib/applications/application-introduction";

const context = {
  employerDisplayName: "Berlin Work Co",
  vacancyTitle: "Morning kitchen support",
};

describe("application introduction", () => {
  it("builds deterministic EN/DE suggestions from job context only", () => {
    const english = buildApplicationIntroductionSuggestion("en", context);
    const german = buildApplicationIntroductionSuggestion("de", context);

    expect(english).toContain(context.vacancyTitle);
    expect(english).toContain(context.employerDisplayName);
    expect(german).toContain(context.vacancyTitle);
    expect(german).toContain(context.employerDisplayName);
    expect(buildApplicationIntroductionSuggestion("en", context)).toBe(english);
    expect(english.length).toBeLessThanOrEqual(
      APPLICATION_INTRODUCTION_MAX_LENGTH,
    );
    expect(german.length).toBeLessThanOrEqual(
      APPLICATION_INTRODUCTION_MAX_LENGTH,
    );
  });

  it("normalizes only surrounding whitespace", () => {
    expect(normalizeApplicationIntroduction("  My own\nwords.  ")).toBe(
      "My own\nwords.",
    );
    expect(normalizeApplicationIntroduction("   ")).toBe("");
  });
});
