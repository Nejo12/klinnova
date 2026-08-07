import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerProfile = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const loadCurrentEmployerSuspensionStatus = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/load-employer", () => ({ loadEmployerProfile }));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));
vi.mock("@/lib/employer/suspension-guard", () => ({
  loadCurrentEmployerSuspensionStatus,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({}),
}));

import EmployerOnboardingPage from "@/app/employer/onboarding/page";

const incompleteProfile = {
  id: "user-1",
  employerType: "private" as const,
  displayName: "Ada Employer",
  berlinLocality: "Mitte",
  phone: null,
  website: null,
  organisationLegalName: null,
  lawfulHiringDeclared: null,
  verificationState: "unverified",
  verificationRequestedAt: null,
  verificationReviewedAt: null,
  verificationReviewReason: null,
  onboardingCompletedAt: null,
  company: null,
  typeLocked: false,
};

describe("EmployerOnboardingPage suspended-state UX", () => {
  beforeEach(() => {
    loadEmployerProfile.mockReset();
    loadAccountCapabilities.mockReset();
    loadCurrentEmployerSuspensionStatus.mockReset();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: false,
      hasEmployerProfile: true,
    });
  });

  it("renders the shared restricted notice for a suspended existing employer, not the onboarding form", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: incompleteProfile,
      userId: "user-1",
    });
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: true,
    });

    render(await EmployerOnboardingPage());

    expect(
      screen.getByText(
        "Your employer account is temporarily restricted. Some employer actions are unavailable while the restriction is active.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /continue/i }),
    ).not.toBeInTheDocument();
  });

  it("never renders an operator-authored suspension reason", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: incompleteProfile,
      userId: "user-1",
    });
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: true,
    });

    render(await EmployerOnboardingPage());

    expect(screen.queryByText(/reason/i)).not.toBeInTheDocument();
  });

  it("renders the normal onboarding form for an unsuspended existing employer", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: incompleteProfile,
      userId: "user-1",
    });
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: false,
    });

    render(await EmployerOnboardingPage());

    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    expect(
      screen.queryByText(/temporarily restricted/i),
    ).not.toBeInTheDocument();
  });

  it("does not block or check suspension for a first-time caller with no employer profile yet", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: null,
      userId: "user-1",
    });

    render(await EmployerOnboardingPage());

    expect(loadCurrentEmployerSuspensionStatus).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/temporarily restricted/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Employer onboarding" }),
    ).toBeInTheDocument();
  });
});
