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

  it("returns German presentation labels without changing codes", () => {
    expect(workplaceTypeLabel("private_home", "de")).toBe("Privathaushalt");
    expect(workplaceTypeLabel("warehouse", "de")).toBe("Lager");
  });
});

describe("workFrequencyLabel", () => {
  it("returns the label for every allow-listed code", () => {
    for (const option of WORK_FREQUENCY_OPTIONS) {
      expect(workFrequencyLabel(option.code)).toBe(option.label);
    }
  });

  it("returns German presentation labels", () => {
    expect(workFrequencyLabel("one_off", "de")).toBe("Einmalig");
    expect(workFrequencyLabel("recurring", "de")).toBe("Wiederkehrend");
  });
});

describe("formatListingDate", () => {
  it("formats a valid ISO timestamp", () => {
    expect(formatListingDate("2026-09-01T00:00:00Z")).toMatch(/2026/);
  });

  it("formats a valid ISO timestamp for German", () => {
    expect(formatListingDate("2026-09-01T00:00:00Z", "de")).toContain(
      "September 2026",
    );
  });

  it("returns null for an invalid timestamp", () => {
    expect(formatListingDate("not-a-date")).toBeNull();
  });
});
