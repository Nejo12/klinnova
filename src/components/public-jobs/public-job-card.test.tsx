import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicJobCard } from "@/components/public-jobs/public-job-card";
import type { PublicVacancyListItem } from "@/lib/public-jobs/load-public-vacancies";

const baseVacancy: PublicVacancyListItem["vacancy"] = {
  vacancyId: "11111111-1111-4111-8111-111111111111",
  title: "Evening cleaner",
  description: "Two hours, weekday evenings.",
  jobCategory: "cleaning",
  publicLocality: "Mitte",
  workplaceType: "private_home",
  workFrequency: "recurring",
  cvRequired: false,
  interviewEnglishOk: true,
  source: "employer",
  employerDisplayName: "Ada Lovelace",
  companyName: null,
  website: "https://example.test",
  expiresAt: "2026-09-01T00:00:00Z",
};

function makeItem(
  overrides: Partial<PublicVacancyListItem["vacancy"]> = {},
  languages: PublicVacancyListItem["languages"] = [],
): PublicVacancyListItem {
  return { vacancy: { ...baseVacancy, ...overrides }, languages };
}

describe("PublicJobCard", () => {
  it("renders title, employer display name, and category", () => {
    render(<PublicJobCard item={makeItem()} />);
    expect(
      screen.getByRole("heading", { name: "Evening cleaner" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText("Cleaning")).toBeInTheDocument();
  });

  it("renders the company name when present", () => {
    render(
      <PublicJobCard item={makeItem({ companyName: "Demo Logistics GmbH" })} />,
    );
    expect(screen.getByText(/Demo Logistics GmbH/)).toBeInTheDocument();
  });

  it("shows the Demo vacancy label only for source=seed", () => {
    const { rerender } = render(
      <PublicJobCard item={makeItem({ source: "employer" })} />,
    );
    expect(screen.queryByText("Demo vacancy")).not.toBeInTheDocument();

    rerender(<PublicJobCard item={makeItem({ source: "seed" })} />);
    expect(screen.getByText("Demo vacancy")).toBeInTheDocument();
  });

  it("omits location/workplace/frequency rows when null", () => {
    render(
      <PublicJobCard
        item={makeItem({
          publicLocality: null,
          workplaceType: null,
          workFrequency: null,
        })}
      />,
    );
    expect(screen.queryByText("Location")).not.toBeInTheDocument();
    expect(screen.queryByText("Workplace")).not.toBeInTheDocument();
    expect(screen.queryByText("Frequency")).not.toBeInTheDocument();
  });

  it("renders language requirement items", () => {
    render(
      <PublicJobCard
        item={makeItem({}, [{ languageCode: "en", minProficiency: "basic" }])}
      />,
    );
    expect(screen.getByText(/English/)).toBeInTheDocument();
  });

  it("renders an accessible detail link naming the job", () => {
    render(<PublicJobCard item={makeItem()} />);
    const link = screen.getByRole("link", {
      name: "View job: Evening cleaner",
    });
    expect(link).toHaveAttribute(
      "href",
      "/jobs/11111111-1111-4111-8111-111111111111",
    );
    expect(window.getComputedStyle(link).minHeight).toBe(
      "var(--touch-target-min)",
    );
  });

  it("renders the title as h2 by default", () => {
    render(<PublicJobCard item={makeItem()} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Evening cleaner" }),
    ).toBeInTheDocument();
  });

  it("renders the title as h3 when headingLevel is passed", () => {
    render(<PublicJobCard item={makeItem()} headingLevel="h3" />);
    expect(
      screen.getByRole("heading", { level: 3, name: "Evening cleaner" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });
});
