import { describe, expect, it } from "vitest";

import { resolveEmployerHomeView } from "@/lib/employer/resolve-employer-home";

describe("resolveEmployerHomeView", () => {
  it("redirects incomplete employers to onboarding", () => {
    expect(
      resolveEmployerHomeView({
        hasProfile: false,
        onboardingCompleted: false,
        displayName: null,
        employerType: null,
        companyName: null,
        verificationState: null,
      }),
    ).toEqual({ kind: "redirect", href: "/employer/onboarding" });
  });

  it("shows home for completed employers without verified claims", () => {
    expect(
      resolveEmployerHomeView({
        hasProfile: true,
        onboardingCompleted: true,
        displayName: "Ada",
        employerType: "organisation",
        companyName: "Ada Care",
        verificationState: "unverified",
      }),
    ).toEqual({
      kind: "home",
      displayName: "Ada",
      employerTypeLabel: "Organisation",
      companyName: "Ada Care",
      verificationState: "unverified",
    });
  });
});
