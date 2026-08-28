import { render, screen, within } from "@testing-library/react";
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
    pausedAt: null,
    filledAt: null,
    withdrawnAt: null,
    expiredAt: null,
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

  it("keeps employer account deletion explicit", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: completedProfile,
      userId: "emp-1",
    });

    render(await EmployerHomePage());

    expect(
      screen.getByRole("link", { name: "Delete my Klinnova account" }),
    ).toHaveAttribute("href", "/employer/account/delete");
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
      screen.getByText("3 new applications are waiting to be opened."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review applications" }),
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
      screen.queryByText(/new applications? (is|are) waiting/),
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

  it("truncates a long missing-field list to a count rather than a run-on comma list", async () => {
    loadEmployerDrafts.mockResolvedValue({
      ok: true,
      drafts: [
        draft({
          id: "draft-1",
          title: "Glasreiniger",
          ready: false,
          checklist: [
            { id: "salary", label: "Salary (EUR gross)", complete: false },
            { id: "frequency", label: "Work frequency", complete: false },
            { id: "languages", label: "Languages", complete: false },
            { id: "description", label: "Description", complete: false },
            { id: "title", label: "Title", complete: true },
          ],
        }),
      ],
    });

    render(await EmployerHomePage());

    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName.toLowerCase() === "p" &&
          /Glasreiniger\s+is a draft, missing 4 required details/.test(
            element.textContent ?? "",
          ),
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(
      /Salary \(EUR gross\), Work frequency, Languages, Description/,
    );
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
    expect(screen.getByText(/Mitte\s+·\s+Cleaning/)).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/\d+\s+applications?/);
    expect(screen.getByRole("link", { name: "Manage" })).toHaveAttribute(
      "href",
      "/employer/vacancies/draft-1",
    );
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

  it("uses the draft edit route and real readiness consequence for draft rows", async () => {
    loadEmployerDrafts.mockResolvedValue({
      ok: true,
      drafts: [
        draft({
          id: "draft-1",
          title: "Warehouse Helper",
          jobCategory: "logistics",
          publicLocality: "Neukölln",
          publicationState: "draft",
          ready: false,
          checklist: [
            { id: "salary", label: "Salary (EUR gross)", complete: false },
            { id: "title", label: "Title", complete: true },
          ],
        }),
      ],
    });

    render(await EmployerHomePage());

    const vacancies = screen.getByRole("region", { name: "Your vacancies" });
    expect(within(vacancies).getByText("Warehouse Helper")).toBeInTheDocument();
    expect(
      within(vacancies).getByText(/Neukölln\s+·\s+Logistics/),
    ).toBeInTheDocument();
    expect(within(vacancies).getByText("Private draft")).toBeInTheDocument();
    expect(
      within(vacancies).getByText(
        "Salary (EUR gross) still needed before publishing.",
      ),
    ).toBeInTheDocument();
    expect(
      within(vacancies).getByRole("link", { name: "Continue draft" }),
    ).toHaveAttribute("href", "/employer/vacancies/draft-1/edit");
  });

  it.each([
    ["paused", "Paused"],
    ["filled", "Filled"],
    ["expired", "Expired"],
    ["withdrawn", "Withdrawn"],
  ] as const)(
    "represents %s lifecycle rows truthfully",
    async (state, label) => {
      loadEmployerDrafts.mockResolvedValue({
        ok: true,
        drafts: [
          draft({
            id: `${state}-1`,
            title: `${label} role`,
            publicationState: state,
            ready: null,
          }),
        ],
      });

      render(await EmployerHomePage());

      expect(screen.getByText(`${label} role`)).toBeInTheDocument();
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Manage" })).toHaveAttribute(
        "href",
        `/employer/vacancies/${state}-1`,
      );
    },
  );
});

describe("EmployerHomePage navigation and hero", () => {
  beforeEach(() => {
    loadEmployerProfile.mockReset();
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: completedProfile,
      userId: "emp-1",
    });
    loadAccountCapabilities.mockReset();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: true,
    });
    loadUnseenApplicationsCount.mockReset();
    loadUnseenApplicationsCount.mockResolvedValue(4);
    loadEmployerDrafts.mockReset();
    loadEmployerDrafts.mockResolvedValue({ ok: true, drafts: [] });
  });

  it("renders one H1 with the real display name and the approved operational lead", async () => {
    render(await EmployerHomePage());

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome, Ada Employer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your hiring workspace: new applications first, vacancy readiness second.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps all employer destinations, aria-current, unseen badge, capability switcher, and logout", async () => {
    render(await EmployerHomePage());

    const nav = screen.getByRole("navigation", { name: "Employer" });
    expect(
      screen.getByRole("navigation", { name: "Account spaces" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: "Employer home" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("link", { name: "Vacancies" }),
    ).toHaveAttribute("href", "/employer/vacancies");
    expect(
      within(nav).getByRole("link", { name: /^Applications\s*4\s*new$/ }),
    ).toHaveAttribute("href", "/employer/applications");
    expect(
      within(nav).getByRole("link", { name: "Verification" }),
    ).toHaveAttribute("href", "/employer/verification");
  });

  it("shows Verified only when the authoritative verification state is verified", async () => {
    render(await EmployerHomePage());
    expect(screen.getByText("Verified")).toBeInTheDocument();

    loadEmployerProfile.mockResolvedValue({
      ok: true,
      data: unverifiedProfile,
      userId: "emp-1",
    });

    render(await EmployerHomePage());
    expect(screen.getAllByText("Verified")).toHaveLength(1);
  });
});
