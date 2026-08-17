import { describe, expect, it } from "vitest";

import { formatReviewRow } from "@/lib/onboarding/review-values";

const profile = {
  germanComfort: "basic",
  workAuthorisationDeclared: true,
  city: "Berlin",
  travelRadiusMinutes: 30,
  jobCategories: ["cleaning", "logistics"],
  availableFrom: "2026-09-01",
  employmentTypes: ["part_time"],
  shiftPreferences: ["morning", "weekend"],
};

describe("formatReviewRow", () => {
  it("formats all 6 groups with real labels, never a district", () => {
    expect(formatReviewRow("languages", profile, [])).toEqual({
      label: "Languages and German comfort",
      value: "I can understand and use some basic German",
    });
    expect(formatReviewRow("work_authorisation", profile, [])).toEqual({
      label: "Work authorisation",
      value: "Yes",
    });
    expect(formatReviewRow("location", profile, [])).toEqual({
      label: "Berlin and travel time",
      value: "Berlin · up to 30 minutes travel",
    });
    expect(formatReviewRow("categories", profile, [])).toEqual({
      label: "Job categories",
      value: "Cleaning, Logistics",
    });
    expect(formatReviewRow("employment", profile, [])).toEqual({
      label: "Employment types and shifts",
      value: "Part time · Morning, Weekend",
    });
  });

  it("never renders a district — location value never contains a comma-separated place name beyond Berlin", () => {
    const row = formatReviewRow("location", profile, []);
    expect(row.value).not.toMatch(/wedding|mitte|kreuzberg|neuk[oö]lln/i);
  });

  it("reports work authorisation as not answered when null, never fabricating a status", () => {
    expect(
      formatReviewRow(
        "work_authorisation",
        { ...profile, workAuthorisationDeclared: null },
        [],
      ),
    ).toEqual({ label: "Work authorisation", value: "Not answered" });
  });

  it("formats availability as a human-readable date, not raw ISO string", () => {
    expect(formatReviewRow("availability", profile, [])).toEqual({
      label: "Earliest availability",
      value: "1 September 2026",
    });
  });
});
