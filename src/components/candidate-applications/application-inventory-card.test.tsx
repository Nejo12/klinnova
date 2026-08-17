import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationInventoryCard } from "@/components/candidate-applications/application-inventory-card";
import styles from "@/components/candidate-matches/candidate-matches.module.scss";
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

const cardReducedEmphasisClass = styles.cardReducedEmphasis;
if (cardReducedEmphasisClass === undefined) {
  throw new Error(
    "cardReducedEmphasis class missing from candidate-matches.module.scss",
  );
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
    // The status rail also renders a static "Shortlisted" node label for
    // every card regardless of current status, so the live status value is
    // scoped to its own element rather than a page-wide text query.
    expect(screen.getByTestId("application-status-value")).toHaveTextContent(
      "Shortlisted",
    );
  });

  it('shows "Not selected" — not "Rejected" — for a rejected-status application', () => {
    render(
      <ApplicationInventoryCard
        application={buildRow({ status: "rejected" })}
      />,
    );
    expect(screen.getByTestId("application-status-value")).toHaveTextContent(
      "Not selected",
    );
    expect(
      screen.queryByTestId("application-status-value"),
    ).not.toHaveTextContent("Rejected");
  });

  it("renders the application status rail", () => {
    render(<ApplicationInventoryCard application={buildRow()} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("never renders internal vacancy id or candidate id", () => {
    render(<ApplicationInventoryCard application={buildRow()} />);
    expect(
      screen.queryByText("22222222-2222-4222-8222-222222222222"),
    ).toBeNull();
  });

  it('applies the reduced-emphasis class when emphasis="reduced"', () => {
    render(
      <ApplicationInventoryCard application={buildRow()} emphasis="reduced" />,
    );
    expect(screen.getByRole("article")).toHaveClass(cardReducedEmphasisClass);
  });

  it("does not apply the reduced-emphasis class by default (no emphasis prop)", () => {
    render(<ApplicationInventoryCard application={buildRow()} />);
    expect(screen.getByRole("article")).not.toHaveClass(
      cardReducedEmphasisClass,
    );
  });
});
