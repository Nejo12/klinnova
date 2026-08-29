import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerDrafts = vi.hoisted(() => vi.fn());
const loadEmployerProfile = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const loadUnseenApplicationsCount = vi.hoisted(() => vi.fn());
const loadCurrentEmployerSuspensionStatus = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((href: string) => {
    throw new Error(href);
  }),
);

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
vi.mock("next/navigation", () => ({
  redirect: (href: string) => redirect(href),
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
    redirect.mockClear();
  });

  it("redirects unauthenticated visitors to login", async () => {
    loadEmployerDrafts.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
    });

    await expect(EmployerVacanciesPage()).rejects.toThrow(
      "/login?next=/employer/vacancies",
    );
    expect(redirect).toHaveBeenCalledWith("/login?next=/employer/vacancies");
  });

  it("redirects incomplete employers to onboarding", async () => {
    loadEmployerDrafts.mockResolvedValue({
      ok: false,
      reason: "incomplete",
    });

    await expect(EmployerVacanciesPage()).rejects.toThrow(
      "/employer/onboarding",
    );
    expect(redirect).toHaveBeenCalledWith("/employer/onboarding");
  });

  it("preserves employer header capability and unseen-application badge behaviour", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: { ...baseProfile, verificationState: "verified" },
      userId: "emp-1",
    });
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: true,
    });
    loadUnseenApplicationsCount.mockResolvedValue(2);

    render(await EmployerVacanciesPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Vacancies" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create draft" })).toHaveAttribute(
      "href",
      "/employer/vacancies/new",
    );
    expect(screen.getByRole("link", { name: "Candidate" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Applications/ }),
    ).toHaveTextContent("2");
  });

  it("shows the restricted notice when the employer is suspended", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: { ...baseProfile, verificationState: "verified" },
      userId: "emp-1",
    });
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: true,
    });

    render(await EmployerVacanciesPage());

    expect(
      screen.getByText(
        "Your employer account is temporarily restricted. Some employer actions are unavailable while the restriction is active.",
      ),
    ).toBeInTheDocument();
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

  it("does not call loadEmployerProfile when there are non-empty drafts (its result is only consumed by the zero-draft empty state)", async () => {
    loadEmployerDrafts.mockResolvedValue({
      ok: true,
      drafts: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Glasreiniger",
          jobCategory: "cleaning",
          publicLocality: "Mitte",
          employerType: "private" as const,
          companyName: null,
          publicationState: "draft" as const,
          expiresAt: null,
          isEffectivelyExpired: false,
          updatedAt: "2026-08-15T00:00:00Z",
          ready: false,
          checklist: [],
          pausedAt: null,
          filledAt: null,
          withdrawnAt: null,
          expiredAt: null,
        },
      ],
    });

    render(await EmployerVacanciesPage());

    expect(screen.getByText("Glasreiniger")).toBeInTheDocument();
    expect(loadEmployerProfile).not.toHaveBeenCalled();
  });
});
