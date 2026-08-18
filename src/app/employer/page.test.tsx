import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EmployerDraftListItem } from "@/lib/employer/vacancies/load-employer-drafts";

const loadEmployerProfile = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const loadUnseenApplicationsCount = vi.hoisted(() =>
  vi.fn().mockResolvedValue(0),
);
const loadEmployerDrafts = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/load-employer", () => ({ loadEmployerProfile }));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));
vi.mock("@/lib/employer/applications/load-unseen-applications-count", () => ({
  loadUnseenApplicationsCount,
}));
vi.mock("@/lib/employer/vacancies/load-employer-drafts", () => ({
  loadEmployerDrafts,
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
  verificationState: "verified",
  verificationRequestedAt: null,
  verificationReviewedAt: null,
  verificationReviewReason: null,
  onboardingCompletedAt: "2026-08-01T00:00:00Z",
  company: null,
  typeLocked: true,
};

const unverifiedProfile = {
  ...completedProfile,
  verificationState: "unverified" as const,
};

function draft(
  overrides: Partial<EmployerDraftListItem>,
): EmployerDraftListItem {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Glasreiniger",
    jobCategory: "cleaning",
    publicLocality: "Mitte",
    employerType: "private",
    companyName: null,
    publicationState: "draft",
    expiresAt: null,
    isEffectivelyExpired: false,
    updatedAt: "2026-08-15T00:00:00Z",
    ready: false,
    checklist: [],
    ...overrides,
  };
}

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
    loadEmployerDrafts.mockReset();
    loadEmployerDrafts.mockResolvedValue({ ok: true, drafts: [] });
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

describe("EmployerHomePage attention slot", () => {
  beforeEach(() => {
    loadEmployerProfile.mockReset();
    loadAccountCapabilities.mockReset();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: false,
      hasEmployerProfile: true,
    });
    loadUnseenApplicationsCount.mockReset();
    loadUnseenApplicationsCount.mockResolvedValue(0);
    loadEmployerDrafts.mockReset();
    loadEmployerDrafts.mockResolvedValue({ ok: true, drafts: [] });
  });

  it("shows the unseen-applications card when there are unopened applications, and not the verification notice", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: unverifiedProfile,
      userId: "emp-1",
    });
    loadUnseenApplicationsCount.mockResolvedValue(3);

    render(await EmployerHomePage());

    expect(
      screen.getByRole("link", {
        name: "3 applications you have not opened",
      }),
    ).toHaveAttribute("href", "/employer/applications");
    expect(document.body.textContent ?? "").not.toMatch(
      /Verification is required before a vacancy can be published/,
    );
  });

  it("shows the verification notice when unverified and there are zero unseen applications", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: unverifiedProfile,
      userId: "emp-1",
    });
    loadUnseenApplicationsCount.mockResolvedValue(0);

    render(await EmployerHomePage());

    expect(
      screen.getByText(
        "Your employer profile is complete. Verification is required before a vacancy can be published.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/applications you have not opened/),
    ).not.toBeInTheDocument();
  });

  it("shows neither card when verified and there are zero unseen applications", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: completedProfile,
      userId: "emp-1",
    });
    loadUnseenApplicationsCount.mockResolvedValue(0);

    render(await EmployerHomePage());

    expect(
      screen.queryByText(/applications you have not opened/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Verification is required/),
    ).not.toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(
      /all caught up|you're all set|nothing to do/i,
    );
  });
});

describe("EmployerHomePage needs-your-action side card and vacancy mini-list", () => {
  beforeEach(() => {
    loadEmployerProfile.mockReset();
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: completedProfile,
      userId: "emp-1",
    });
    loadAccountCapabilities.mockReset();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: false,
      hasEmployerProfile: true,
    });
    loadUnseenApplicationsCount.mockReset();
    loadUnseenApplicationsCount.mockResolvedValue(0);
    loadEmployerDrafts.mockReset();
  });

  it("lists a not-ready draft in the side card with a plain-words reason drawn from its checklist", async () => {
    loadEmployerDrafts.mockResolvedValue({
      ok: true,
      drafts: [
        draft({
          id: "draft-1",
          title: "Glasreiniger",
          ready: false,
          checklist: [
            { id: "salary", label: "Salary (EUR gross)", complete: false },
            { id: "title", label: "Title", complete: true },
          ],
        }),
      ],
    });

    render(await EmployerHomePage());

    expect(screen.getByText("Needs your action")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName.toLowerCase() === "p" &&
          /Glasreiniger\s+is a draft, missing Salary \(EUR gross\)/.test(
            element.textContent ?? "",
          ),
      ),
    ).toBeInTheDocument();
  });

  it("omits the side card when no draft is missing fields", async () => {
    loadEmployerDrafts.mockResolvedValue({
      ok: true,
      drafts: [
        draft({ id: "draft-1", ready: true }),
        draft({ id: "draft-2", publicationState: "published", ready: null }),
      ],
    });

    render(await EmployerHomePage());

    expect(screen.queryByText("Needs your action")).not.toBeInTheDocument();
  });

  it("renders the vacancy mini-list with title, locality, and lifecycle state, and no application-count figures", async () => {
    loadEmployerDrafts.mockResolvedValue({
      ok: true,
      drafts: [
        draft({
          id: "draft-1",
          title: "Glasreiniger",
          publicLocality: "Mitte",
          publicationState: "published",
          ready: null,
        }),
      ],
    });

    render(await EmployerHomePage());

    expect(screen.getByText("Your vacancies")).toBeInTheDocument();
    expect(screen.getByText("Glasreiniger")).toBeInTheDocument();
    expect(screen.getByText(/Locality: Mitte/)).toBeInTheDocument();
    expect(screen.getByText(/Status: Published/)).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/\d+\s+applications?/);
    expect(screen.getByRole("link", { name: "All vacancies" })).toHaveAttribute(
      "href",
      "/employer/vacancies",
    );
  });

  it("shows the empty-list message when there are no vacancies", async () => {
    loadEmployerDrafts.mockResolvedValue({ ok: true, drafts: [] });

    render(await EmployerHomePage());

    expect(screen.getByText(/You have no vacancies yet/)).toBeInTheDocument();
  });
});
