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
});
