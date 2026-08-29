import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerProfile = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const loadUnseenApplicationsCount = vi.hoisted(() => vi.fn());
const loadCurrentEmployerSuspensionStatus = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((href: string) => {
    throw new Error(href);
  }),
);

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

import EmployerVerificationPage from "@/app/employer/verification/page";

const baseProfile = {
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

describe("EmployerVerificationPage", () => {
  beforeEach(() => {
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
    loadEmployerProfile.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
    });

    await expect(EmployerVerificationPage()).rejects.toThrow(
      "/login?next=/employer/verification",
    );
  });

  it("redirects to onboarding when there is no employer profile", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: null,
      userId: "emp-1",
    });

    await expect(EmployerVerificationPage()).rejects.toThrow(
      "/employer/onboarding",
    );
  });

  it("renders header, one H1, and the unverified request surface", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: baseProfile,
      userId: "emp-1",
    });

    render(await EmployerVerificationPage());

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Verification" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verification" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("status", { name: "Not requested" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Request verification" }),
    ).toBeInTheDocument();
  });

  it("formats requested timestamps in Europe/Berlin", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: {
        ...baseProfile,
        verificationState: "pending",
        verificationRequestedAt: "2026-08-01T00:00:00Z",
      },
      userId: "emp-1",
    });

    render(await EmployerVerificationPage());

    expect(screen.getByText("1 Aug 2026, 02:00")).toBeInTheDocument();
  });

  it("shows the restricted notice and hides Request verification when suspended", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: baseProfile,
      userId: "emp-1",
    });
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: true,
    });

    render(await EmployerVerificationPage());

    expect(
      screen.getByText(
        "Verification requests are unavailable while your employer account is restricted.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Not requested" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Revoked")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Request verification" }),
    ).toBeNull();
  });
});
