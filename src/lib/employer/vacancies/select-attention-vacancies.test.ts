import { describe, expect, it } from "vitest";

import { selectAttentionVacancies } from "@/lib/employer/vacancies/select-attention-vacancies";
import type { EmployerDraftListItem } from "@/lib/employer/vacancies/load-employer-drafts";

function draft(
  overrides: Partial<EmployerDraftListItem>,
): EmployerDraftListItem {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Glasreiniger",
    jobCategory: "cleaning",
    publicLocality: "Mitte",
    employerType: "organisation",
    companyName: "Hauswerk Berlin",
    publicationState: "draft",
    expiresAt: null,
    isEffectivelyExpired: false,
    updatedAt: "2026-08-15T00:00:00Z",
    ready: false,
    checklist: [],
    ...overrides,
  };
}

describe("selectAttentionVacancies", () => {
  it("includes a not-ready draft as draft_incomplete", () => {
    const result = selectAttentionVacancies([draft({ ready: false })]);
    expect(result).toEqual([
      {
        vacancyId: "11111111-1111-4111-8111-111111111111",
        title: "Glasreiniger",
        reason: "draft_incomplete",
      },
    ]);
  });

  it("excludes a ready draft and any non-draft vacancy", () => {
    const result = selectAttentionVacancies([
      draft({ id: "id-a", ready: true }),
      draft({ id: "id-b", publicationState: "published", ready: null }),
      draft({ id: "id-c", publicationState: "paused", ready: null }),
    ]);
    expect(result).toEqual([]);
  });
});
