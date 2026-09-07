import { describe, expect, it } from "vitest";

import {
  resolvePostAuthDestination,
  shouldEnsureCandidateProfile,
} from "@/lib/employer/capability-routing";

describe("resolvePostAuthDestination", () => {
  it("prefers validated intent", () => {
    expect(
      resolvePostAuthDestination({
        intentPath: "/employer/onboarding",
        capabilities: {
          hasCandidateProfile: true,
          hasEmployerProfile: true,
        },
      }),
    ).toEqual({ kind: "redirect", href: "/employer/onboarding" });
  });

  it("requires role choice when both capabilities exist and no intent", () => {
    expect(
      resolvePostAuthDestination({
        intentPath: null,
        capabilities: {
          hasCandidateProfile: true,
          hasEmployerProfile: true,
        },
      }),
    ).toEqual({ kind: "role_choice" });
  });

  it("uses a valid active workspace for dual-capability accounts", () => {
    expect(
      resolvePostAuthDestination({
        intentPath: null,
        activeWorkspace: "employer",
        capabilities: {
          hasCandidateProfile: true,
          hasEmployerProfile: true,
        },
      }),
    ).toEqual({ kind: "redirect", href: "/employer" });
  });

  it("sends employer-only users to employer home", () => {
    expect(
      resolvePostAuthDestination({
        intentPath: null,
        capabilities: {
          hasCandidateProfile: false,
          hasEmployerProfile: true,
        },
      }),
    ).toEqual({ kind: "redirect", href: "/employer" });
  });
});

describe("shouldEnsureCandidateProfile", () => {
  it("skips ensure for employer intent and role choice", () => {
    expect(
      shouldEnsureCandidateProfile({
        intentPath: "/employer",
        destinationHref: "/employer",
      }),
    ).toBe(false);
    expect(
      shouldEnsureCandidateProfile({
        intentPath: null,
        destinationHref: "/account/choose",
      }),
    ).toBe(false);
  });

  it("ensures for candidate destinations", () => {
    expect(
      shouldEnsureCandidateProfile({
        intentPath: "/candidate",
        destinationHref: "/candidate",
      }),
    ).toBe(true);
  });
});
