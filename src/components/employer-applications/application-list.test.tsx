import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationList } from "@/components/employer-applications/application-list";
import type { EmployerApplicationListRow } from "@/lib/employer/applications/schemas";
import { APPLICATION_EMPTY_LIST } from "@/lib/employer/applications/messages";

function buildRow(
  overrides: Partial<EmployerApplicationListRow> = {},
): EmployerApplicationListRow {
  return {
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
    ...overrides,
  };
}

describe("ApplicationList", () => {
  it("shows an empty-state message when there are no applications", () => {
    render(<ApplicationList applications={[]} />);
    expect(screen.getByText(APPLICATION_EMPTY_LIST)).toBeInTheDocument();
  });

  it("renders every row in the order it was given, without re-sorting", () => {
    const rowB = buildRow({
      application_id: "33333333-3333-4333-8333-333333333333",
      candidate_display_name: "A. Later",
    });
    render(<ApplicationList applications={[buildRow(), rowB]} />);

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "J. Doe",
      "A. Later",
    ]);
  });

  it("renders a Review link to the detail route", () => {
    render(<ApplicationList applications={[buildRow()]} />);
    expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute(
      "href",
      "/employer/applications/11111111-1111-4111-8111-111111111111",
    );
  });

  it("never renders a candidate id, auth id, or actor identity", () => {
    render(<ApplicationList applications={[buildRow()]} />);
    expect(screen.queryByText(/actor/i)).toBeNull();
  });
});
