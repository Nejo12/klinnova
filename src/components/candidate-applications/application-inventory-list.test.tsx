import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationInventoryList } from "@/components/candidate-applications/application-inventory-list";
import styles from "@/components/candidate-matches/candidate-matches.module.scss";
import type { ApplicationInventoryRow } from "@/lib/applications/snapshot-schemas";
import type { ApplicationStatus } from "@/lib/applications/status";

function buildRow(
  id: string,
  title: string,
  status: ApplicationStatus = "submitted",
): ApplicationInventoryRow {
  return {
    id,
    vacancy_id: "22222222-2222-4222-8222-222222222222",
    status,
    submitted_at: "2026-08-01T00:00:00.000Z",
    snapshot_version: 1,
    vacancy_snapshot: {
      vacancy_id: "22222222-2222-4222-8222-222222222222",
      title,
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
  };
}

const cardReducedEmphasisClass = styles.cardReducedEmphasis;
if (cardReducedEmphasisClass === undefined) {
  throw new Error(
    "cardReducedEmphasis class missing from candidate-matches.module.scss",
  );
}

describe("ApplicationInventoryList", () => {
  it("renders active rows in the order given, without re-sorting", () => {
    render(
      <ApplicationInventoryList
        active={[
          buildRow(
            "11111111-1111-4111-8111-111111111111",
            "Second submitted",
            "submitted",
          ),
          buildRow(
            "33333333-3333-4333-8333-333333333333",
            "First submitted",
            "reviewing",
          ),
        ]}
        closed={[]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Active" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Closed" }),
    ).toBeNull();

    const cardHeadings = screen.getAllByRole("heading", { level: 2 });
    // "Active" group heading, then the two card titles in given order.
    expect(cardHeadings.map((heading) => heading.textContent)).toEqual([
      "Active",
      "Second submitted",
      "First submitted",
    ]);
  });

  it("renders closed rows in the order given, without re-sorting", () => {
    render(
      <ApplicationInventoryList
        active={[]}
        closed={[
          buildRow(
            "11111111-1111-4111-8111-111111111111",
            "Second closed",
            "accepted",
          ),
          buildRow(
            "33333333-3333-4333-8333-333333333333",
            "First closed",
            "rejected",
          ),
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Closed" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Active" }),
    ).toBeNull();

    const cardHeadings = screen.getAllByRole("heading", { level: 2 });
    expect(cardHeadings.map((heading) => heading.textContent)).toEqual([
      "Closed",
      "Second closed",
      "First closed",
    ]);
  });

  it("omits the Active heading entirely when there are no active applications", () => {
    render(
      <ApplicationInventoryList
        active={[]}
        closed={[
          buildRow(
            "11111111-1111-4111-8111-111111111111",
            "Only closed",
            "accepted",
          ),
        ]}
      />,
    );

    expect(screen.queryByText("Active")).toBeNull();
    expect(screen.queryByLabelText("Active applications")).toBeNull();
  });

  it("omits the Closed heading entirely when there are no closed applications", () => {
    render(
      <ApplicationInventoryList
        active={[
          buildRow(
            "11111111-1111-4111-8111-111111111111",
            "Only active",
            "submitted",
          ),
        ]}
        closed={[]}
      />,
    );

    expect(screen.queryByText("Closed")).toBeNull();
    expect(screen.queryByLabelText("Closed applications")).toBeNull();
  });

  it("renders nothing at all when both groups are empty", () => {
    render(<ApplicationInventoryList active={[]} closed={[]} />);

    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  it("de-emphasizes closed cards but not active cards", () => {
    render(
      <ApplicationInventoryList
        active={[
          buildRow(
            "11111111-1111-4111-8111-111111111111",
            "Active card",
            "submitted",
          ),
        ]}
        closed={[
          buildRow(
            "33333333-3333-4333-8333-333333333333",
            "Closed card",
            "accepted",
          ),
        ]}
      />,
    );

    const [activeCard, closedCard] = screen.getAllByRole("article");
    expect(activeCard).not.toHaveClass(cardReducedEmphasisClass);
    expect(closedCard).toHaveClass(cardReducedEmphasisClass);
  });
});
