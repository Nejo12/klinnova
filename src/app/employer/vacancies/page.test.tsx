import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerDrafts = vi.hoisted(() => vi.fn());
const loadEmployerProfile = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const loadUnseenApplicationsCount = vi.hoisted(() => vi.fn());
const loadCurrentEmployerSuspensionStatus = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/vacancies/load-employer-drafts", () => ({
  loadEmployerDrafts,
}));
vi.mock("@/lib/employer/load-employer", () => ({ loadEmployerProfile }));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));
vi.mock("@/lib/employer/applications/load-unseen-applications-count", () => ({
  loadUnseenApplicationsCount,
}));
vi.mock("@/lib/employer/suspension-guard", () => ({
  loadCurrentEmployerSuspensionStatus,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({}),
}));

import EmployerVacanciesPage from "@/app/employer/vacancies/page";

const baseProfile = {
  id: "emp-1",
  employerType: "private" as const,
  displayName: "Ada Employer",
  berlinLocality: "Mitte",
  phone: null,
  website: null,
  organisationLegalName: null,
  lawfulHiringDeclared: true,
  verificationRequestedAt: null,
  verificationReviewedAt: null,
  verificationReviewReason: null,
  onboardingCompletedAt: "2026-08-01T00:00:00Z",
  company: null,
  typeLocked: true,
};

describe("EmployerVacanciesPage empty states", () => {
  beforeEach(() => {
    loadEmployerDrafts.mockReset();
    loadEmployerDrafts.mockResolvedValue({ ok: true, drafts: [] });
    loadEmployerProfile.mockReset();
    loadAccountCapabilities.mockReset();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: false,
      hasEmployerProfile: true,
    });
    loadUnseenApplicationsCount.mockReset();
    loadUnseenApplicationsCount.mockResolvedValue(0);
    loadCurrentEmployerSuspensionStatus.mockReset();
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: false,
    });
  });

  it("shows the generic 'No vacancies yet' state when verified with zero drafts", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: { ...baseProfile, verificationState: "verified" },
      userId: "emp-1",
    });

    render(await EmployerVacanciesPage());

    expect(screen.getByText(/You have no vacancies yet/)).toBeInTheDocument();
    expect(
      screen.queryByText("Verification not finished"),
    ).not.toBeInTheDocument();
  });

  it("shows the 'Verification not finished' state instead of the generic one when unverified with zero drafts", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: { ...baseProfile, verificationState: "unverified" },
      userId: "emp-1",
    });

    render(await EmployerVacanciesPage());

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Verification not finished",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue verification" }),
    ).toHaveAttribute("href", "/employer/verification");
    expect(
      screen.queryByText(/You have no vacancies yet/),
    ).not.toBeInTheDocument();
  });

  it("falls back to the generic empty state when the profile load fails, without redirecting", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: false,
      reason: "failed",
      error: "Could not load your employer profile.",
    });

    render(await EmployerVacanciesPage());

    expect(screen.getByText(/You have no vacancies yet/)).toBeInTheDocument();
  });
});
