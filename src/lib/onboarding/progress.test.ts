import { describe, expect, it } from "vitest";

import {
  computeOnboardingProgress,
  isGroupComplete,
} from "@/lib/onboarding/progress";

const emptyProfile = {
  germanComfort: null,
  workAuthorisationDeclared: null,
  city: null,
  travelRadiusMinutes: null,
  jobCategories: [] as string[],
  availableFrom: null,
  employmentTypes: [] as string[],
  shiftPreferences: [] as string[],
};

const completeProfile = {
  germanComfort: "comfortable",
  workAuthorisationDeclared: true,
  city: "Berlin",
  travelRadiusMinutes: 30,
  jobCategories: ["cleaning"],
  availableFrom: "2099-01-01",
  employmentTypes: ["full_time"],
  shiftPreferences: ["daytime"],
};

const completeLanguages = [
  { languageCode: "de", proficiency: "native" },
  { languageCode: "en", proficiency: "proficient" },
];

describe("computeOnboardingProgress", () => {
  it("treats a fresh profile as fully incomplete", () => {
    const progress = computeOnboardingProgress(emptyProfile, []);
    expect(progress.completeCount).toBe(0);
    expect(progress.firstIncompleteGroup).toBe("languages");
    expect(progress.essentialsValid).toBe(false);
  });

  it("marks work authorisation incomplete for not-sure (false)", () => {
    expect(
      isGroupComplete(
        "work_authorisation",
        { ...completeProfile, workAuthorisationDeclared: false },
        completeLanguages,
      ),
    ).toBe(false);
  });

  it("reports essentialsValid only when every group is complete", () => {
    const progress = computeOnboardingProgress(
      completeProfile,
      completeLanguages,
      "2099-01-01",
    );
    expect(progress.completeCount).toBe(6);
    expect(progress.firstIncompleteGroup).toBeNull();
    expect(progress.essentialsValid).toBe(true);
  });

  it("does not treat past available_from as complete", () => {
    expect(
      isGroupComplete(
        "availability",
        { ...completeProfile, availableFrom: "2020-01-01" },
        completeLanguages,
        "2026-08-01",
      ),
    ).toBe(false);
  });
});
