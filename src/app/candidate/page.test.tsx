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

  it("renders a segment for every onboarding group with none filled when nothing is complete", async () => {
    loadCandidateOnboarding.mockResolvedValue({
      ok: true,
      data: incompleteData,
    });

    const { container } = render(await CandidatePage());

    const progressBar = screen.getByRole("progressbar", {
      name: "Onboarding sections saved",
    });
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "6");

    const segments = container.querySelectorAll("[data-state]");
    expect(segments).toHaveLength(6);
    expect(
      container.querySelectorAll('[data-state="complete"]'),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll('[data-state="upcoming"]'),
    ).toHaveLength(6);

    expect(screen.getByText("0 of 6 sections saved.")).toBeInTheDocument();
  });

  it("fills exactly completeCount segments when some sections are complete", async () => {
    loadCandidateOnboarding.mockResolvedValue({
      ok: true,
      data: {
        ...incompleteData,
        progress: {
          essentialsValid: false,
          firstIncompleteGroup: "languages" as const,
          completeCount: 3,
          totalGroups: 6,
        },
      },
    });

    const { container } = render(await CandidatePage());

    const progressBar = screen.getByRole("progressbar", {
      name: "Onboarding sections saved",
    });
    expect(progressBar).toHaveAttribute("aria-valuenow", "3");
    expect(progressBar).toHaveAttribute("aria-valuemax", "6");

    expect(
      container.querySelectorAll('[data-state="complete"]'),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll('[data-state="upcoming"]'),
    ).toHaveLength(3);

    expect(screen.getByText("3 of 6 sections saved.")).toBeInTheDocument();
  });
});
