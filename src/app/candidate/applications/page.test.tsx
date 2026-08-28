import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationInventoryRow } from "@/lib/applications/snapshot-schemas";

const loadCandidateApplicationInventory = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());

vi.mock("@/lib/applications/load-candidate-application-inventory", () => ({
  loadCandidateApplicationInventory,
}));

vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`);
  }),
}));

import CandidateApplicationsRoutePage from "@/app/candidate/applications/page";

function buildRow(
  overrides: Partial<ApplicationInventoryRow> = {},
): ApplicationInventoryRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    vacancy_id: "22222222-2222-4222-8222-222222222222",
    status: "submitted",
    submitted_at: "2026-08-01T00:00:00.000Z",
    snapshot_version: 1,
    vacancy_snapshot: {
      vacancy_id: "22222222-2222-4222-8222-222222222222",
      title: "Morning kitchen support",
      employer_display_name: "Demo Berlin Work Co",
      source: "seed",
      demo_label: "Demo vacancy",
      city: "Berlin",
      job_category: "hospitality",
      employment_types: ["part_time"],
      shift_requirements: ["morning"],
      german_requirement: "basic",
      language_requirements: [],
      available_from: null,
    },
    ...overrides,
  };
}

describe("CandidateApplicationsRoutePage", () => {
  beforeEach(() => {
    loadCandidateApplicationInventory.mockReset();
    loadAccountCapabilities.mockReset();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: false,
    });
  });

  it("renders the approved Applications page hierarchy and current candidate navigation", async () => {
    loadCandidateApplicationInventory.mockResolvedValue({
      status: "ready",
      applications: [buildRow()],
    });

    render(await CandidateApplicationsRoutePage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Applications" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your active and closed applications in one place."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Matches" })).toHaveAttribute(
      "href",
      "/candidate/matches",
    );
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute(
      "href",
      "/candidate/applications",
    );
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/candidate/account",
    );
  });

  it("preserves the truthful empty state without fake group headings or duplicate Matches CTAs", async () => {
    loadCandidateApplicationInventory.mockResolvedValue({
      status: "ready",
      applications: [],
    });

    render(await CandidateApplicationsRoutePage());

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "You haven't applied to any jobs yet",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Active" }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Closed" }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: "Browse matching jobs" }),
    ).toHaveAttribute("href", "/candidate/matches");
    expect(
      screen.queryByRole("link", { name: "Find more matches" }),
    ).toBeNull();
  });
});
