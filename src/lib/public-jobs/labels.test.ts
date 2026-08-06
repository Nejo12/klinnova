import { describe, expect, it } from "vitest";

import {
  WORK_FREQUENCY_OPTIONS,
  WORKPLACE_TYPE_OPTIONS,
} from "@/lib/employer/vacancies/allow-lists";
import {
  formatListingDate,
  workFrequencyLabel,
  workplaceTypeLabel,
} from "@/lib/public-jobs/labels";

describe("workplaceTypeLabel", () => {
  it("returns the label for every allow-listed code", () => {
    for (const option of WORKPLACE_TYPE_OPTIONS) {
      expect(workplaceTypeLabel(option.code)).toBe(option.label);
    }
  });
});

describe("workFrequencyLabel", () => {
  it("returns the label for every allow-listed code", () => {
    for (const option of WORK_FREQUENCY_OPTIONS) {
      expect(workFrequencyLabel(option.code)).toBe(option.label);
    }
  });
});

describe("formatListingDate", () => {
  it("formats a valid ISO timestamp", () => {
    expect(formatListingDate("2026-09-01T00:00:00Z")).toMatch(/2026/);
  });

  it("returns null for an invalid timestamp", () => {
    expect(formatListingDate("not-a-date")).toBeNull();
  });
});
