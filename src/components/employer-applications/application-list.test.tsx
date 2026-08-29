import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationList } from "@/components/employer-applications/application-list";
import type { EmployerApplicationListRow } from "@/lib/employer/applications/schemas";
import { APPLICATION_EMPTY_LIST } from "@/lib/employer/applications/messages";

type LiveRow = Extract<
  EmployerApplicationListRow,
  { candidate_deleted: false }
>;
type DeletedRow = Extract<
  EmployerApplicationListRow,
  { candidate_deleted: true }
>;

function buildRow(overrides: Partial<LiveRow> = {}): LiveRow {
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
  };
}

function buildDeletedRow(overrides: Partial<DeletedRow> = {}): DeletedRow {
  return {
    candidate_deleted: true,
    application_id: "44444444-4444-4444-8444-444444444444",
    vacancy_id: "22222222-2222-4222-8222-222222222222",
    vacancy_title: "Morning kitchen support",
    candidate_display_name: "Deleted candidate",
    job_category: null,
    german_comfort: null,
    available_from: null,
    current_status: "submitted",
    submitted_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    employer_seen_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("ApplicationList", () => {
  it("shows an empty-state message when there are no applications", () => {
    render(<ApplicationList applications={[]} />);
    expect(
      screen.getByRole("list", { name: "Application summary" }),
    ).toHaveTextContent("All vacancies 0Needs review 0Open 0Decided 0");
    expect(screen.getByText(APPLICATION_EMPTY_LIST)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View vacancies" }),
    ).toHaveAttribute("href", "/employer/vacancies");
  });

  it("shows the filtered-empty state with the vacancy's title when a vacancy filter has zero results", () => {
    render(
      <ApplicationList
        applications={[]}
        filteredVacancy={{
          id: "vac-1",
          title: "Morning kitchen support",
          publicationState: "published",
          checklist: [],
        }}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "No applications for Morning kitchen support",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(APPLICATION_EMPTY_LIST)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View vacancy" })).toHaveAttribute(
      "href",
      "/employer/vacancies/vac-1",
    );
  });

  it("falls back to a titleless filtered-empty heading when the vacancy lookup failed", () => {
    render(
      <ApplicationList
        applications={[]}
        filteredVacancy={{
          id: "vac-1",
          title: null,
          publicationState: null,
          checklist: [],
        }}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "No applications for this vacancy",
      }),
    ).toBeInTheDocument();
  });

  it("shows the draft-specific filtered-empty state, deriving the reason from the real readiness checklist", () => {
    render(
      <ApplicationList
        applications={[]}
        filteredVacancy={{
          id: "vac-1",
          title: "Morning kitchen support",
          publicationState: "draft",
          checklist: [
            { id: "salary", label: "Salary (EUR gross)", complete: false },
            { id: "title", label: "Title", complete: true },
          ],
        }}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "This vacancy is a draft",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Salary (EUR gross) still needed before publishing. Nothing is visible to candidates until you publish.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Finish this vacancy" }),
    ).toHaveAttribute("href", "/employer/vacancies/vac-1/edit");
  });

  it("falls back to the generic draft reason when readiness is unavailable for the filtered draft", () => {
    render(
      <ApplicationList
        applications={[]}
        filteredVacancy={{
          id: "vac-1",
          title: "Morning kitchen support",
          publicationState: "draft",
          checklist: [],
        }}
      />,
    );
    expect(
      screen.getByText(
        "Missing required details before publishing. Nothing is visible to candidates until you publish.",
      ),
    ).toBeInTheDocument();
  });

  it("shows 'Everything reviewed' inside Needs review when nothing is unseen but applications are still open", () => {
    render(
      <ApplicationList
        applications={[
          buildRow({
            application_id: "11111111-1111-4111-8111-111111111111",
            current_status: "submitted",
            employer_seen_at: "2026-08-01T00:00:00Z",
          }),
          buildRow({
            application_id: "22222222-2222-4222-8222-222222222222",
            current_status: "shortlisted",
            employer_seen_at: "2026-08-01T00:00:00Z",
          }),
        ]}
      />,
    );

    const needsReviewSection = screen
      .getByRole("heading", { level: 2, name: "Needs review" })
      .closest("section");
    expect(needsReviewSection).not.toBeNull();
    expect(
      within(needsReviewSection as HTMLElement).getByText(
        "Nothing needs first review right now. 2 applications are still open.",
      ),
    ).toBeInTheDocument();
  });

  it("uses singular phrasing for exactly one open application in the 'Everything reviewed' state", () => {
    render(
      <ApplicationList
        applications={[
          buildRow({
            current_status: "reviewing",
            employer_seen_at: "2026-08-01T00:00:00Z",
          }),
        ]}
      />,
    );
    expect(
      screen.getByText(
        "Nothing needs first review right now. 1 application is still open.",
      ),
    ).toBeInTheDocument();
  });

  it("does not show the 'Everything reviewed' state when Needs review is empty because nothing is open either", () => {
    render(
      <ApplicationList
        applications={[
          buildRow({
            current_status: "accepted",
            employer_seen_at: "2026-08-01T00:00:00Z",
          }),
        ]}
      />,
    );
    expect(
      screen.queryByText(/Nothing needs first review right now/),
    ).not.toBeInTheDocument();
  });

  it("renders every row in the order it was given, without re-sorting, within its group", () => {
    const rowB = buildRow({
      application_id: "33333333-3333-4333-8333-333333333333",
      candidate_display_name: "A. Later",
    });
    render(<ApplicationList applications={[buildRow(), rowB]} />);

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "J. Doe",
      "A. Later",
    ]);
  });

  it("renders a Review link to the detail route", () => {
    render(<ApplicationList applications={[buildRow()]} />);
    expect(
      screen.getAllByRole("link", {
        name: "Review J. Doe for Morning kitchen support",
      })[0],
    ).toHaveAttribute(
      "href",
      "/employer/applications/11111111-1111-4111-8111-111111111111",
    );
  });

  it("never renders a candidate id, auth id, or actor identity", () => {
    render(<ApplicationList applications={[buildRow()]} />);
    expect(screen.queryByText(/actor/i)).toBeNull();
  });

  it("renders a deleted candidate as 'Deleted candidate' with no fabricated attributes", () => {
    render(<ApplicationList applications={[buildDeletedRow()]} />);
    expect(
      screen.getByRole("heading", { level: 3, name: "Deleted candidate" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Matched category/i)).toBeNull();
    expect(screen.queryByText(/German comfort/i)).toBeNull();
    expect(screen.queryByText(/Available from/i)).toBeNull();
    expect(
      screen.getAllByText("Candidate data has been removed.")[0],
    ).toBeInTheDocument();
  });

  it("renders real informational summary counts without fake group filter links", () => {
    render(
      <ApplicationList
        applications={[
          buildRow({
            application_id: "11111111-1111-4111-8111-111111111111",
            current_status: "submitted",
            employer_seen_at: "2026-08-01T00:00:00Z",
          }),
        ]}
      />,
    );

    const summary = screen.getByRole("list", { name: "Application summary" });
    expect(summary).toHaveTextContent(
      "All vacancies 1Needs review 0Open 1Decided 0",
    );
    expect(within(summary).queryByRole("link")).toBeNull();
  });

  it("renders the three group headings with their own real counts", () => {
    render(
      <ApplicationList
        applications={[
          buildRow({
            application_id: "11111111-1111-4111-8111-111111111111",
            current_status: "submitted",
            employer_seen_at: "2026-08-01T00:00:00Z",
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Needs review" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Open" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Decided" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { level: 2, name: "Needs review" })
        .nextElementSibling,
    ).toHaveTextContent("0");
    expect(
      screen.getByRole("heading", { level: 2, name: "Open" })
        .nextElementSibling,
    ).toHaveTextContent("1");
    expect(
      screen.getByRole("heading", { level: 2, name: "Decided" })
        .nextElementSibling,
    ).toHaveTextContent("0");
  });

  it("puts an unseen row's card in both Needs review and its status group", () => {
    const row = buildRow({
      application_id: "11111111-1111-4111-8111-111111111111",
      candidate_display_name: "J. Doe",
      current_status: "accepted",
      employer_seen_at: null,
    });
    render(<ApplicationList applications={[row]} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Needs review" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Decided" }),
    ).toBeInTheDocument();
    // The candidate's own heading renders twice — once inside each group.
    expect(
      screen.getAllByRole("heading", { level: 3, name: "J. Doe" }),
    ).toHaveLength(2);
  });

  it("renders no list under a group with zero rows", () => {
    const row = buildRow({
      current_status: "submitted",
      employer_seen_at: "2026-08-01T00:00:00Z",
    });
    render(<ApplicationList applications={[row]} />);

    const decidedHeading = screen.getByRole("heading", {
      level: 2,
      name: "Decided",
    });
    expect(decidedHeading.parentElement?.querySelector("ul")).toBeNull();
  });

  it("renders compact real row facts, stable submitted timestamp, status, and review action", () => {
    render(<ApplicationList applications={[buildRow()]} />);

    expect(
      screen.getAllByText("Morning kitchen support")[0],
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Hospitality · Basic German · Available 1 September 2026",
      )[0],
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        (_content, element) =>
          element?.textContent?.startsWith("Submitted 1 Aug 2026") === true,
      )[0],
    ).toBeInTheDocument();
    expect(screen.getAllByText("Submitted")[0]).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", {
        name: "Review J. Doe for Morning kitchen support",
      })[0],
    ).toHaveAttribute(
      "href",
      "/employer/applications/11111111-1111-4111-8111-111111111111",
    );
  });
});
