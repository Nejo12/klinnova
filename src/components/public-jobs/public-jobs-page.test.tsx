import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicJobsPage } from "@/components/public-jobs/public-jobs-page";
import type { PublicVacancyListItem } from "@/lib/public-jobs/load-public-vacancies";

function makeItem(id: string, title: string): PublicVacancyListItem {
  return {
    vacancy: {
      vacancyId: id,
      title,
      description: null,
      jobCategory: "cleaning",
      publicLocality: null,
      workplaceType: null,
      workFrequency: null,
      cvRequired: null,
      interviewEnglishOk: null,
      source: "employer",
      employerDisplayName: "Ada Lovelace",
      companyName: null,
      website: null,
      expiresAt: "2026-09-01T00:00:00Z",
    },
    languages: [],
  };
}

describe("PublicJobsPage", () => {
  it("renders heading, count, and one card per item on success", () => {
    render(
      <PublicJobsPage
        status="success"
        items={[
          makeItem("11111111-1111-4111-8111-111111111111", "Evening cleaner"),
          makeItem("22222222-2222-4222-8222-222222222222", "Warehouse picker"),
        ]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Jobs in Berlin", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 open jobs")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Evening cleaner" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Warehouse picker" }),
    ).toBeInTheDocument();
  });

  it("renders the empty state for zero items, not a card list", () => {
    render(<PublicJobsPage status="success" items={[]} />);
    expect(
      screen.getByRole("heading", { name: "No jobs are open right now" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders the failure state without the count or list", () => {
    render(<PublicJobsPage status="failure" />);
    expect(
      screen.getByRole("heading", { name: "Jobs are unavailable" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^\d+ open jobs?$/)).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
