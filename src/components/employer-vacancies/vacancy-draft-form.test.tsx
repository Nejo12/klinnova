import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { EmployerVacancyActionState } from "@/app/employer/vacancies/actions";

const createEmployerVacancyDraftAction = vi.hoisted(() =>
  vi.fn(async (): Promise<EmployerVacancyActionState> => ({
    error: null,
    message: null,
  })),
);
const updateEmployerVacancyDraftAction = vi.hoisted(() =>
  vi.fn(async (): Promise<EmployerVacancyActionState> => ({
    error: null,
    message: null,
  })),
);

vi.mock("@/app/employer/vacancies/actions", () => ({
  createEmployerVacancyDraftAction,
  updateEmployerVacancyDraftAction,
}));

import { VacancyDraftForm } from "@/components/employer-vacancies/vacancy-draft-form";
import type { EmployerDraftDetail } from "@/lib/employer/vacancies/load-employer-draft";

const baseDraft: EmployerDraftDetail = {
  id: "22222222-2222-4222-8222-222222222299",
  title: "Cleaner",
  jobCategory: "cleaning",
  publicLocality: "Mitte",
  description: null,
  workplaceType: null,
  workFrequency: null,
  availableFrom: null,
  experienceNotes: null,
  cvRequired: null,
  interviewEnglishOk: null,
  employmentTypes: ["full_time"],
  shiftRequirements: ["morning", "evening"],
  salaryAmountCents: null,
  salaryCurrency: null,
  salaryPeriod: null,
  salaryIsGross: null,
  employerType: "private",
  companyName: null,
  publicationState: "draft",
  updatedAt: "2026-08-04T00:00:00Z",
  createdAt: "2026-08-04T00:00:00Z",
  languages: [],
  ready: false,
  checklist: [],
  readinessAvailable: true,
};

describe("VacancyDraftForm — D-M5-19 employment types / shift requirements", () => {
  it("renders every allow-listed checkbox, unchecked, for a new draft", () => {
    render(<VacancyDraftForm mode="create" />);

    expect(
      screen.getByRole("checkbox", { name: "Full time" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Mini-job" }),
    ).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Morning" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Weekend" })).not.toBeChecked();
    // Vacancy-side shift requirements have no "Flexible" option — that
    // remains a candidate-only matcher escape hatch (D-029/docs/20).
    expect(
      screen.queryByRole("checkbox", { name: "Flexible" }),
    ).not.toBeInTheDocument();
  });

  it("pre-populates checked state from the loaded draft in edit mode", () => {
    render(<VacancyDraftForm mode="edit" draft={baseDraft} />);

    expect(screen.getByRole("checkbox", { name: "Full time" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Part time" }),
    ).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Morning" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Evening" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Night" })).not.toBeChecked();
  });

  it("submits employmentTypes/shiftRequirements as repeated same-name form fields", () => {
    render(<VacancyDraftForm mode="edit" draft={baseDraft} />);

    const form = screen
      .getByRole("checkbox", { name: "Full time" })
      .closest("form");
    expect(form).not.toBeNull();

    const employmentInputs = Array.from(
      form?.querySelectorAll('input[name="employmentTypes"]') ?? [],
    );
    expect(employmentInputs.map((el) => el.getAttribute("value"))).toEqual([
      "full_time",
      "part_time",
      "mini_job",
      "temporary",
    ]);

    const shiftInputs = Array.from(
      form?.querySelectorAll('input[name="shiftRequirements"]') ?? [],
    );
    expect(shiftInputs.map((el) => el.getAttribute("value"))).toEqual([
      "morning",
      "daytime",
      "evening",
      "night",
      "weekend",
    ]);
  });
});
