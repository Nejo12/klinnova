import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationInventoryList } from "@/components/candidate-applications/application-inventory-list";
import type { ApplicationInventoryRow } from "@/lib/applications/snapshot-schemas";

function buildRow(id: string, title: string): ApplicationInventoryRow {
  return {
    id,
    vacancy_id: "22222222-2222-4222-8222-222222222222",
    status: "submitted",
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

describe("ApplicationInventoryList", () => {
  it("renders every row in the order it was given, without re-sorting", () => {
    render(
      <ApplicationInventoryList
        applications={[
          buildRow("11111111-1111-4111-8111-111111111111", "Second submitted"),
          buildRow("33333333-3333-4333-8333-333333333333", "First submitted"),
        ]}
      />,
    );

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Second submitted",
      "First submitted",
    ]);
  });
});
