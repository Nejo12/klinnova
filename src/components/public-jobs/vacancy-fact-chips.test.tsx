import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VacancyFactChips } from "@/components/public-jobs/vacancy-fact-chips";
import type { PublicVacancy } from "@/lib/public-jobs/domain";

const baseVacancy: PublicVacancy = {
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

describe("VacancyFactChips", () => {
  it("renders category, location, workplace, and frequency rows when all fields are present", () => {
    render(<VacancyFactChips vacancy={baseVacancy} />);

    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Cleaning")).toBeInTheDocument();

    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Mitte, Berlin")).toBeInTheDocument();

    expect(screen.getByText("Workplace")).toBeInTheDocument();
    expect(screen.getByText("Private home")).toBeInTheDocument();

    expect(screen.getByText("Frequency")).toBeInTheDocument();
    expect(screen.getByText("Recurring")).toBeInTheDocument();
  });

  it("omits location and workplace rows when those fields are null, never rendering an empty chip", () => {
    render(
      <VacancyFactChips
        vacancy={{
          ...baseVacancy,
          publicLocality: null,
          workplaceType: null,
        }}
      />,
    );

    expect(screen.getByText("Category")).toBeInTheDocument();

    expect(screen.queryByText("Location")).not.toBeInTheDocument();
    expect(screen.queryByText("Mitte, Berlin")).not.toBeInTheDocument();

    expect(screen.queryByText("Workplace")).not.toBeInTheDocument();
    expect(screen.queryByText("Private home")).not.toBeInTheDocument();

    expect(screen.getByText("Frequency")).toBeInTheDocument();
    expect(screen.getByText("Recurring")).toBeInTheDocument();
  });

  it("omits the frequency row when workFrequency is null", () => {
    render(
      <VacancyFactChips vacancy={{ ...baseVacancy, workFrequency: null }} />,
    );

    expect(screen.queryByText("Frequency")).not.toBeInTheDocument();
  });
});
