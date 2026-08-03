import { describe, expect, it } from "vitest";

import { resolveJobDetailPageView } from "@/app/candidate/jobs/[vacancyId]/resolve-job-detail-view";
import type { CandidateVacancyDetail } from "@/lib/matching/candidate-vacancy-detail";

const VACANCY_ID = "22222222-2222-4222-8222-222222222201";

const detail = {
  vacancyId: VACANCY_ID,
  title: "Demo vacancy — Morning kitchen support",
  employerDisplayName: "Demo Berlin Work Co",
  demoLabel: "Demo vacancy",
  city: "Berlin",
  jobCategoryLabel: "Hospitality",
  employmentTypesLabel: "Part time",
  shiftRequirementsLabel: "Morning",
  germanRequirementLabel: "Basic German",
  languageRequirements: [],
  availableFromLabel: "Flexible start",
  listedOnLabel: "15 January 2026",
  matchReasons: [{ key: "berlin_job", text: "Based in Berlin" }],
} satisfies CandidateVacancyDetail;

describe("resolveJobDetailPageView", () => {
  it("redirects unauthenticated visitors to login with next", () => {
    expect(
      resolveJobDetailPageView(VACANCY_ID, { status: "unauthenticated" }),
    ).toEqual({
      kind: "redirect",
      href: `/login?next=${encodeURIComponent(`/candidate/jobs/${VACANCY_ID}`)}`,
    });
  });

  it("redirects incomplete candidates to onboarding", () => {
    expect(
      resolveJobDetailPageView(VACANCY_ID, { status: "incomplete" }),
    ).toEqual({
      kind: "redirect",
      href: "/candidate/onboarding",
    });
  });

  it("maps unavailable and not_matching to safe unavailable views", () => {
    expect(
      resolveJobDetailPageView(VACANCY_ID, { status: "unavailable" }),
    ).toEqual({
      kind: "unavailable",
      reason: "unavailable",
    });
    expect(
      resolveJobDetailPageView(VACANCY_ID, { status: "not_matching" }),
    ).toEqual({
      kind: "unavailable",
      reason: "not_matching",
    });
  });

  it("returns ready detail without redirects", () => {
    expect(
      resolveJobDetailPageView(VACANCY_ID, { status: "ready", detail }),
    ).toEqual({
      kind: "ready",
      detail,
    });
  });
});
