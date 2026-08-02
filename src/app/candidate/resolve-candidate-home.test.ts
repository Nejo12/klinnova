import { describe, expect, it } from "vitest";

import { resolveCandidateHomeView } from "@/app/candidate/resolve-candidate-home";

describe("resolveCandidateHomeView", () => {
  it("redirects completed candidates to matches", () => {
    expect(
      resolveCandidateHomeView({
        onboardingCompleted: true,
        continueHref: "/candidate/onboarding?group=review",
      }),
    ).toEqual({ kind: "redirect", href: "/candidate/matches" });
  });

  it("keeps incomplete candidates on home with an onboarding continuation href", () => {
    expect(
      resolveCandidateHomeView({
        onboardingCompleted: false,
        continueHref: "/candidate/onboarding?group=languages",
      }),
    ).toEqual({
      kind: "incomplete",
      continueHref: "/candidate/onboarding?group=languages",
    });
  });
});
