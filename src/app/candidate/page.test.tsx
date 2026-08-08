import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadCandidateOnboarding = vi.hoisted(() => vi.fn());

vi.mock("@/lib/onboarding/load-candidate", () => ({
  loadCandidateOnboarding,
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

describe("CandidatePage account-data export link", () => {
  beforeEach(() => {
    loadCandidateOnboarding.mockReset();
  });

  it("shows a fixed candidate data-download link for an incomplete candidate", async () => {
    loadCandidateOnboarding.mockResolvedValue({
      ok: true,
      data: incompleteData,
    });

    render(await CandidatePage());

    const downloadLink = screen.getByRole("link", {
      name: "Download candidate data",
    });
    expect(downloadLink).toHaveAttribute("href", "/candidate/account/export");
    expect(downloadLink.getAttribute("href")).not.toMatch(/\?/);
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
