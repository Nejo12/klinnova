import { describe, expect, it } from "vitest";

import { resolveJobDetailPageView } from "@/app/candidate/jobs/[vacancyId]/resolve-job-detail-view";
import type { ApplicationPreview } from "@/lib/applications/application-preview";
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

const preview = {
  vacancyId: VACANCY_ID,
  vacancyTitle: "Demo vacancy — Morning kitchen support",
  employerDisplayName: "Demo Berlin Work Co",
  candidateDisplayName: "Ada",
  matchedJobCategoryLabel: "Hospitality",
  germanComfortLabel: "I can understand and use some basic German",
  relevantLanguages: [],
  noAdditionalLanguagesLabel: "No additional language requirements",
  workAuthorisationDeclaredLabel: "Yes",
  availableFromLabel: "4 August 2026",
  employmentPreferencesLabel: "Part time",
  shiftPreferencesLabel: "Morning",
} satisfies ApplicationPreview;

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

  it("returns ready detail and preview without redirects", () => {
    expect(
      resolveJobDetailPageView(VACANCY_ID, {
        status: "ready",
        detail,
        preview,
        application: null,
      }),
    ).toEqual({
      kind: "ready",
      detail,
      preview,
      application: null,
    });
  });
});
