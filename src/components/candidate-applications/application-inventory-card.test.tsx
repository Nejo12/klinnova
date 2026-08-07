import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationInventoryCard } from "@/components/candidate-applications/application-inventory-card";
import type { ApplicationInventoryRow } from "@/lib/applications/snapshot-schemas";

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

describe("ApplicationInventoryCard", () => {
  it("renders title, employer, city, status, submitted timestamp, and a detail link", () => {
    render(<ApplicationInventoryCard application={buildRow()} />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Morning kitchen support",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Demo Berlin Work Co")).toBeInTheDocument();
    expect(screen.getByText("Berlin")).toBeInTheDocument();
    expect(screen.getAllByText("Submitted").length).toBeGreaterThan(0);
    expect(screen.getByText(/1 August 2026/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "View application: Morning kitchen support",
      }),
    ).toHaveAttribute(
      "href",
      "/candidate/applications/11111111-1111-4111-8111-111111111111",
    );
  });

  it("renders the live status label, not a hardcoded Submitted", () => {
    render(
      <ApplicationInventoryCard
        application={buildRow({ status: "shortlisted" })}
      />,
    );
    expect(screen.getByText("Shortlisted")).toBeInTheDocument();
  });

  it("never renders internal vacancy id or candidate id", () => {
    render(<ApplicationInventoryCard application={buildRow()} />);
    expect(
      screen.queryByText("22222222-2222-4222-8222-222222222222"),
    ).toBeNull();
  });
});
