import { describe, expect, it } from "vitest";

import { resolveMatchesPageView } from "@/app/candidate/matches/resolve-matches-view";
import { makeCandidate, makeVacancy } from "@/lib/matching/test-fixtures";
import { matchCandidateToVacancy } from "@/lib/matching/match-candidate-to-vacancy";

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
    expect(resolveMatchesPageView({ status: "onboarding_incomplete" })).toEqual(
      {
        kind: "redirect",
        href: "/candidate/onboarding",
      },
    );
  });

  it("returns success matches and empty success distinctly from failure", () => {
    const match = matchCandidateToVacancy(makeCandidate(), makeVacancy());
    expect(match).not.toBeNull();
    expect(
      resolveMatchesPageView({ status: "success", matches: [match!] }),
    ).toEqual({
      kind: "success",
      matches: [match],
    });
    expect(resolveMatchesPageView({ status: "success", matches: [] })).toEqual({
      kind: "success",
      matches: [],
    });
    expect(
      resolveMatchesPageView({ status: "failure", reason: "load" }),
    ).toEqual({
      kind: "failure",
    });
  });
});
