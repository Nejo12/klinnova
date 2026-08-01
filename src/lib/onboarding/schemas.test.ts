import { describe, expect, it } from "vitest";

import {
  availabilityGroupSchema,
  berlinTodayIso,
  categoriesGroupSchema,
  employmentGroupSchema,
  languagesGroupSaveSchema,
  locationGroupSchema,
  mapWorkAuthorisationToBoolean,
  workAuthorisationGroupSchema,
} from "@/lib/onboarding/schemas";

describe("onboarding schemas", () => {
  it("accepts languages group with german comfort and unique languages", () => {
    const parsed = languagesGroupSaveSchema.safeParse({
      germanComfort: "basic",
      languages: [
        { languageCode: "de", proficiency: "native" },
        { languageCode: "en", proficiency: "conversational" },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects duplicate languages", () => {
    const parsed = languagesGroupSaveSchema.safeParse({
      germanComfort: "basic",
      languages: [
        { languageCode: "de", proficiency: "native" },
        { languageCode: "de", proficiency: "basic" },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("maps work authorisation yes/not_sure", () => {
    expect(mapWorkAuthorisationToBoolean("yes")).toBe(true);
    expect(mapWorkAuthorisationToBoolean("not_sure")).toBe(false);
    expect(
      workAuthorisationGroupSchema.safeParse({
        workAuthorisationDeclared: "yes",
      }).success,
    ).toBe(true);
  });

  it("requires Berlin and allow-listed travel minutes", () => {
    expect(
      locationGroupSchema.safeParse({
        city: "Berlin",
        travelRadiusMinutes: "30",
      }).success,
    ).toBe(true);
    expect(
      locationGroupSchema.safeParse({
        city: "Berlin",
        travelRadiusMinutes: "20",
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate categories and empty selection", () => {
    expect(
      categoriesGroupSchema.safeParse({
        jobCategories: ["cleaning", "cleaning"],
      }).success,
    ).toBe(false);
    expect(categoriesGroupSchema.safeParse({ jobCategories: [] }).success).toBe(
      false,
    );
  });

  it("rejects past available_from dates", () => {
    const today = berlinTodayIso();
    expect(
      availabilityGroupSchema.safeParse({ availableFrom: today }).success,
    ).toBe(true);
    expect(
      availabilityGroupSchema.safeParse({ availableFrom: "2020-01-01" })
        .success,
    ).toBe(false);
  });

  it("requires employment types and shifts without duplicates", () => {
    expect(
      employmentGroupSchema.safeParse({
        employmentTypes: ["full_time"],
        shiftPreferences: ["morning", "night"],
      }).success,
    ).toBe(true);
    expect(
      employmentGroupSchema.safeParse({
        employmentTypes: ["full_time", "full_time"],
        shiftPreferences: ["morning"],
      }).success,
    ).toBe(false);
  });
});
