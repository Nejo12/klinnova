import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EmployerApplicationListRow } from "@/lib/employer/applications/schemas";

const loadEmployerApplications = vi.hoisted(() => vi.fn());
const loadUnseenApplicationsCount = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const loadCurrentEmployerSuspensionStatus = vi.hoisted(() => vi.fn());
const loadEmployerVacancy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/applications/load-employer-applications", () => ({
  loadEmployerApplications,
}));
vi.mock("@/lib/employer/applications/load-unseen-applications-count", () => ({
  loadUnseenApplicationsCount,
}));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));
vi.mock("@/lib/employer/suspension-guard", () => ({
  loadCurrentEmployerSuspensionStatus,
}));
vi.mock("@/lib/employer/vacancies/load-employer-vacancy", () => ({
  loadEmployerVacancy,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({}),
}));

import EmployerApplicationsPage from "@/app/employer/applications/page";

function buildRow(
  overrides: Partial<EmployerApplicationListRow> = {},
): EmployerApplicationListRow {
  return {
    candidate_deleted: false,
    application_id: "11111111-1111-4111-8111-111111111111",
    vacancy_id: "22222222-2222-4222-8222-222222222222",
    vacancy_title: "Morning kitchen support",
    candidate_display_name: "J. Doe",
    job_category: "hospitality",
    german_comfort: "basic",
    available_from: "2026-09-01",
    current_status: "submitted",
    submitted_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    employer_seen_at: "2026-08-01T00:00:00Z",
    ...overrides,
  } as EmployerApplicationListRow;
}

function searchParams(params: Record<string, string> = {}) {
  return Promise.resolve(params);
}

describe("EmployerApplicationsPage empty states", () => {
  beforeEach(() => {
    loadEmployerApplications.mockReset();
    loadUnseenApplicationsCount.mockReset();
    loadUnseenApplicationsCount.mockResolvedValue(0);
    loadAccountCapabilities.mockReset();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: false,
      hasEmployerProfile: true,
    });
    loadCurrentEmployerSuspensionStatus.mockReset();
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: false,
    });
    loadEmployerVacancy.mockReset();
  });

  it("shows the generic empty state when there is no filter and zero applications", async () => {
    loadEmployerApplications.mockResolvedValue({ ok: true, applications: [] });

    render(await EmployerApplicationsPage({ searchParams: searchParams() }));

    expect(screen.getByText("No applications yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View vacancies" }),
    ).toHaveAttribute("href", "/employer/vacancies");
    expect(loadEmployerVacancy).not.toHaveBeenCalled();
  });

  it("renders the approved page hierarchy and preserves shared employer navigation", async () => {
    loadEmployerApplications.mockResolvedValue({
      ok: true,
      applications: [
        buildRow({
          application_id: "11111111-1111-4111-8111-111111111111",
          current_status: "submitted",
          employer_seen_at: null,
        }),
      ],
    });
    loadUnseenApplicationsCount.mockResolvedValue(3);
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: true,
    });

    render(await EmployerApplicationsPage({ searchParams: searchParams() }));

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Applications" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Review new applicants first, then keep open and decided work visible without mixing priorities.",
      ),
    ).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "Employer" });
    expect(
      within(nav).getByRole("link", { name: "Employer home" }),
    ).toHaveAttribute("href", "/employer");
    expect(
      within(nav).getByRole("link", { name: "Vacancies" }),
    ).toHaveAttribute("href", "/employer/vacancies");
    expect(
      within(nav).getByRole("link", { name: /^Applications\s*3\s*new$/ }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("link", { name: "Verification" }),
    ).toHaveAttribute("href", "/employer/verification");
  });

  it("passes real loaded applications through to in-memory summary counts", async () => {
    loadEmployerApplications.mockResolvedValue({
      ok: true,
      applications: [
        buildRow({
          application_id: "11111111-1111-4111-8111-111111111111",
          current_status: "submitted",
          employer_seen_at: null,
        }),
        buildRow({
          application_id: "22222222-2222-4222-8222-222222222222",
          current_status: "accepted",
          employer_seen_at: "2026-08-01T00:00:00Z",
        }),
      ],
    });

    render(await EmployerApplicationsPage({ searchParams: searchParams() }));

    expect(
      screen.getByRole("list", { name: "Application summary" }),
    ).toHaveTextContent("All vacanciesNeeds review 1Open 1Decided 1");
  });

  it("shows the filtered-empty state with the vacancy's title for a published vacancy with zero results", async () => {
    loadEmployerApplications.mockResolvedValue({ ok: true, applications: [] });
    loadEmployerVacancy.mockResolvedValue({
      ok: true,
      vacancy: {
        id: "vac-1",
        title: "Morning kitchen support",
        publicationState: "published",
        checklist: [],
      },
    });

    render(
      await EmployerApplicationsPage({
        searchParams: searchParams({
          vacancy: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "No applications for Morning kitchen support",
      }),
    ).toBeInTheDocument();
    expect(loadEmployerVacancy).toHaveBeenCalledWith(
      {},
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("shows the draft-specific filtered-empty state for a draft vacancy with zero results", async () => {
    loadEmployerApplications.mockResolvedValue({ ok: true, applications: [] });
    loadEmployerVacancy.mockResolvedValue({
      ok: true,
      vacancy: {
        id: "vac-1",
        title: "Morning kitchen support",
        publicationState: "draft",
        checklist: [
          { id: "salary", label: "Salary (EUR gross)", complete: false },
        ],
      },
    });

    render(
      await EmployerApplicationsPage({
        searchParams: searchParams({
          vacancy: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "This vacancy is a draft",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Finish this vacancy" }),
    ).toHaveAttribute(
      "href",
      "/employer/vacancies/11111111-1111-4111-8111-111111111111/edit",
    );
  });

  it("does not look up the filtered vacancy when the filtered result is non-empty", async () => {
    loadEmployerApplications.mockResolvedValue({
      ok: true,
      applications: [buildRow()],
    });

    render(
      await EmployerApplicationsPage({
        searchParams: searchParams({
          vacancy: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(loadEmployerVacancy).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Filtered to vacancy: Morning kitchen support/),
    ).toBeInTheDocument();
  });

  it("keeps the restricted state explicit without loading application rows", async () => {
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: true,
    });

    render(await EmployerApplicationsPage({ searchParams: searchParams() }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Applications" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Applications are unavailable while your employer account is restricted.",
      ),
    ).toBeInTheDocument();
    expect(loadEmployerApplications).not.toHaveBeenCalled();
  });
});
