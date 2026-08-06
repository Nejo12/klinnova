import { describe, expect, it } from "vitest";

import { resolveJobDetailPageView } from "@/app/candidate/jobs/[vacancyId]/resolve-job-detail-view";
import type {
  PublicVacancy,
  PublicVacancyLanguage,
} from "@/lib/public-jobs/domain";

const VACANCY_ID = "22222222-2222-4222-8222-222222222201";

const vacancy: PublicVacancy = {
  vacancyId: VACANCY_ID,
  title: "Demo vacancy — Morning kitchen support",
  description: "Fictional demo hospitality role.",
  jobCategory: "hospitality",
  publicLocality: "Mitte",
  workplaceType: "shop",
  workFrequency: "recurring",
  cvRequired: false,
  interviewEnglishOk: true,
  source: "seed",
  employerDisplayName: "Demo Berlin Work Co",
  companyName: null,
  website: null,
  expiresAt: "2026-09-01T00:00:00Z",
};

const languages: PublicVacancyLanguage[] = [];

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

  it("maps unavailable to a safe unavailable view", () => {
    expect(
      resolveJobDetailPageView(VACANCY_ID, { status: "unavailable" }),
    ).toEqual({ kind: "unavailable" });
  });

  it("maps failure to a safe failure view", () => {
    expect(resolveJobDetailPageView(VACANCY_ID, { status: "failure" })).toEqual(
      { kind: "failure" },
    );
  });

  it("returns ready with eligible=true and no redirect", () => {
    expect(
      resolveJobDetailPageView(VACANCY_ID, {
        status: "ready",
        eligible: true,
        missingRequirements: [],
        vacancy,
        languages,
        application: null,
      }),
    ).toEqual({
      kind: "ready",
      eligible: true,
      missingRequirements: [],
      vacancy,
      languages,
      application: null,
    });
  });

  it("returns ready with eligible=false and ordered missing requirements, not a separate unavailable view", () => {
    expect(
      resolveJobDetailPageView(VACANCY_ID, {
        status: "ready",
        eligible: false,
        missingRequirements: ["category", "german"],
        vacancy,
        languages,
        application: null,
      }),
    ).toEqual({
      kind: "ready",
      eligible: false,
      missingRequirements: ["category", "german"],
      vacancy,
      languages,
      application: null,
    });
  });
});
