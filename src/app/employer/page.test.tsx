import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerProfile = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const loadUnseenApplicationsCount = vi.hoisted(() =>
  vi.fn().mockResolvedValue(0),
);

vi.mock("@/lib/employer/load-employer", () => ({ loadEmployerProfile }));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));
vi.mock("@/lib/employer/applications/load-unseen-applications-count", () => ({
  loadUnseenApplicationsCount,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({}),
}));

import EmployerHomePage from "@/app/employer/page";

const completedProfile = {
  id: "emp-1",
  employerType: "private" as const,
  displayName: "Ada Employer",
  berlinLocality: "Mitte",
  phone: null,
  website: null,
  organisationLegalName: null,
  lawfulHiringDeclared: true,
  verificationState: "unverified",
  verificationRequestedAt: null,
  verificationReviewedAt: null,
  verificationReviewReason: null,
  onboardingCompletedAt: "2026-08-01T00:00:00Z",
  company: null,
  typeLocked: true,
};

describe("EmployerHomePage account-data export link", () => {
  beforeEach(() => {
    loadEmployerProfile.mockReset();
    loadAccountCapabilities.mockReset();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: false,
      hasEmployerProfile: true,
    });
    loadUnseenApplicationsCount.mockReset();
    loadUnseenApplicationsCount.mockResolvedValue(0);
  });

  it("shows a fixed employer data-download link for a completed employer", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: completedProfile,
      userId: "emp-1",
    });

    render(await EmployerHomePage());

    const downloadLink = screen.getByRole("link", {
      name: "Download employer data",
    });
    expect(downloadLink).toHaveAttribute("href", "/employer/account/export");
    expect(downloadLink.getAttribute("href")).not.toMatch(/\?/);
  });

  it("never claims GDPR compliance or legal completeness", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: completedProfile,
      userId: "emp-1",
    });

    render(await EmployerHomePage());

    expect(document.body.textContent ?? "").not.toMatch(
      /gdpr|legally required|fully compliant|right to portability/i,
    );
  });
});
