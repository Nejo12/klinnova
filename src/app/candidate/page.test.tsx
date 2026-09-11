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

  it("renders incomplete progress and preserves the Continue destination", async () => {
    loadCandidateOnboarding.mockResolvedValue({
      ok: true,
      data: incompleteData,
    });

    render(await CandidatePage());

    const progressBar = screen.getByRole("progressbar", {
      name: "Onboarding sections saved",
    });
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "6");
    expect(screen.getByText("0 of 6 sections saved.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue onboarding" }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=languages");
  });

  it("renders complete progress and preserves the Review destination", async () => {
    loadCandidateOnboarding.mockResolvedValue({
      ok: true,
      data: {
        ...incompleteData,
        progress: {
          essentialsValid: true,
          firstIncompleteGroup: null,
          completeCount: 6,
          totalGroups: 6,
        },
      },
    });

    render(await CandidatePage());

    const progressBar = screen.getByRole("progressbar", {
      name: "Onboarding sections saved",
    });
    expect(progressBar).toHaveAttribute("aria-valuenow", "6");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "6");
    expect(screen.getByText("6 of 6 sections saved.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review and confirm essentials" }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=review");
  });
});
