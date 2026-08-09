import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadCandidateOnboarding = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());

vi.mock("@/lib/onboarding/load-candidate", () => ({
  loadCandidateOnboarding,
}));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({}),
}));

import CandidatePage from "@/app/candidate/page";

const incompleteData = {
  displayName: "Ada Candidate",
  profile: {
    germanComfort: null,
    workAuthorisationDeclared: null,
    city: null,
    travelRadiusMinutes: null,
    jobCategories: [],
    availableFrom: null,
    employmentTypes: [],
    shiftPreferences: [],
    onboardingCompletedAt: null,
    workAuthorisationDeclaredAt: null,
  },
  languages: [],
  progress: {
    essentialsValid: false,
    firstIncompleteGroup: "languages" as const,
    completeCount: 0,
    totalGroups: 6,
  },
};

describe("CandidatePage", () => {
  beforeEach(() => {
    loadCandidateOnboarding.mockReset();
    loadAccountCapabilities.mockReset();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: false,
    });
  });

  it("links to the Account destination rather than exposing the export link directly (M5.1 Unit B)", async () => {
    loadCandidateOnboarding.mockResolvedValue({
      ok: true,
      data: incompleteData,
    });

    render(await CandidatePage());

    const accountLink = screen.getByRole("link", { name: "Account" });
    expect(accountLink).toHaveAttribute("href", "/candidate/account");
    expect(
      screen.queryByRole("link", { name: "Download candidate data" }),
    ).not.toBeInTheDocument();
  });

  it("never claims GDPR compliance or legal completeness", async () => {
    loadCandidateOnboarding.mockResolvedValue({
      ok: true,
      data: incompleteData,
    });

    render(await CandidatePage());

    expect(document.body.textContent ?? "").not.toMatch(
      /gdpr|legally required|fully compliant|right to portability/i,
    );
  });
});
