import { describe, expect, it } from "vitest";

import { resolveMatchesPageView } from "@/app/candidate/matches/resolve-matches-view";
import type { PublicVacancy } from "@/lib/public-jobs/domain";

const vacancy: PublicVacancy = {
  vacancyId: "11111111-1111-4111-8111-111111111111",
  title: "Evening cleaner",
  description: "Two hours, weekday evenings.",
  jobCategory: "cleaning",
  publicLocality: "Mitte",
  workplaceType: "private_home",
  workFrequency: "recurring",
  cvRequired: false,
  interviewEnglishOk: true,
  source: "employer",
  employerDisplayName: "Ada Lovelace",
  companyName: null,
  website: "https://example.test",
  expiresAt: "2026-09-01T00:00:00Z",
};

describe("resolveMatchesPageView", () => {
  it("routes unauthenticated users to login with safe next path", () => {
    expect(resolveMatchesPageView({ status: "unauthenticated" })).toEqual({
      kind: "redirect",
      href: "/login?next=/candidate/matches",
    });
  });

  it("routes missing profiles to the existing recovery destination", () => {
    expect(resolveMatchesPageView({ status: "profile_missing" })).toEqual({
      kind: "redirect",
      href: "/auth/error?reason=profile",
    });
  });

  it("routes incomplete onboarding to onboarding", () => {
    expect(resolveMatchesPageView({ status: "incomplete" })).toEqual({
      kind: "redirect",
      href: "/candidate/onboarding",
    });
  });

  it("returns success vacancies and empty success distinctly from failure", () => {
    const applicationsByVacancyId = new Map();
    expect(
      resolveMatchesPageView({
        status: "success",
        vacancies: [vacancy],
        applicationsByVacancyId,
      }),
    ).toEqual({
      kind: "success",
      vacancies: [vacancy],
      applicationsByVacancyId,
    });
    expect(
      resolveMatchesPageView({
        status: "success",
        vacancies: [],
        applicationsByVacancyId,
      }),
    ).toEqual({
      kind: "success",
      vacancies: [],
      applicationsByVacancyId,
    });
    expect(resolveMatchesPageView({ status: "failure" })).toEqual({
      kind: "failure",
    });
  });
});
