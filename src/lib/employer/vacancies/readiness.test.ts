import { describe, expect, it } from "vitest";

import {
  mapReadinessChecklist,
  readinessHeadline,
} from "@/lib/employer/vacancies/readiness";

describe("mapReadinessChecklist", () => {
  it("marks known missing items incomplete and keeps unknown identifiers", () => {
    const checklist = mapReadinessChecklist(["salary", "future_field"]);
    expect(checklist.find((item) => item.id === "salary")?.complete).toBe(
      false,
    );
    expect(checklist.find((item) => item.id === "title")?.complete).toBe(true);
    expect(
      checklist.find((item) => item.id === "future_field")?.label,
    ).toContain("future_field");
  });

  it("describes readiness without implying publication", () => {
    expect(readinessHeadline(true)).toMatch(/future publication/i);
    expect(readinessHeadline(false)).toMatch(/not ready/i);
  });

  it("labels PR 5.4 publish/resume missing-field codes precisely (not a generic fallback)", () => {
    const checklist = mapReadinessChecklist([
      "verification",
      "workplace_type",
      "work_frequency",
      "cv_required",
      "interview_english_ok",
      "expiry",
    ]);
    const labels = new Map(checklist.map((item) => [item.id, item.label]));
    expect(labels.get("verification")).toBe("Employer verification");
    expect(labels.get("workplace_type")).toBe("Workplace type");
    expect(labels.get("work_frequency")).toBe("Work frequency");
    expect(labels.get("cv_required")).toBe("CV requirement declaration");
    expect(labels.get("interview_english_ok")).toBe(
      "English-interview declaration",
    );
    expect(labels.get("expiry")).toContain("expiry");
    for (const item of checklist) {
      expect(item.label).not.toContain("Additional requirement");
    }
  });
});
