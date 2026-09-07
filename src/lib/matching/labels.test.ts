import { describe, expect, it } from "vitest";

import {
  employmentTypeLabel,
  formatIsoCalendarDate,
  germanRequirementLabel,
  jobCategoryLabel,
  joinLabels,
  languageLabel,
  languageProficiencyLabel,
  shiftLabel,
} from "@/lib/matching/labels";

describe("matching labels", () => {
  it("maps allow-list codes to readable labels", () => {
    expect(jobCategoryLabel("food_production")).toBe("Food production");
    expect(employmentTypeLabel("mini_job")).toBe("Mini-job");
    expect(employmentTypeLabel("full_time")).toBe("Full time");
    expect(shiftLabel("evening")).toBe("Evening");
    expect(languageLabel("en")).toBe("English");
    expect(languageProficiencyLabel("conversational")).toBe("Conversational");
    expect(germanRequirementLabel("conversational")).toBe(
      "Conversational German",
    );
  });

  it("maps structured labels to German without changing their codes", () => {
    expect(jobCategoryLabel("food_production", "de")).toBe(
      "Lebensmittelproduktion",
    );
    expect(employmentTypeLabel("mini_job", "de")).toBe("Minijob");
    expect(shiftLabel("evening", "de")).toBe("Abends");
    expect(languageLabel("en", "de")).toBe("Englisch");
    expect(languageProficiencyLabel("conversational", "de")).toBe(
      "Alltagssicher",
    );
    expect(germanRequirementLabel("conversational", "de")).toBe(
      "Alltagssicheres Deutsch",
    );
  });

  it("formats ISO calendar dates without timezone shift", () => {
    expect(formatIsoCalendarDate("2026-09-01")).toBe("1 September 2026");
    expect(formatIsoCalendarDate("2026-03-01")).toBe("1 March 2026");
  });

  it("joins labels for readable lists", () => {
    expect(joinLabels(["Part time"])).toBe("Part time");
    expect(joinLabels(["Part time", "Mini-job"])).toBe(
      "Part time and Mini-job",
    );
    expect(joinLabels(["Part time", "Mini-job", "Temporary"])).toBe(
      "Part time, Mini-job, and Temporary",
    );
  });

  it("joins German labels without changing list order", () => {
    expect(joinLabels(["Teilzeit", "Minijob"], "de")).toBe(
      "Teilzeit und Minijob",
    );
    expect(joinLabels(["Morgens", "Abends", "Wochenende"], "de")).toBe(
      "Morgens, Abends und Wochenende",
    );
  });
});
