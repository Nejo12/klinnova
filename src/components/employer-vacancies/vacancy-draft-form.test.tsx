import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  germanRequirement: "none",
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

describe("VacancyDraftForm — unsaved state", () => {
  it("initializes persisted edit values across control types", () => {
    render(
      <VacancyDraftForm
        mode="edit"
        draft={{
          ...baseDraft,
          id: "22222222-2222-4222-8222-222222222266",
          description: "Persisted description",
          availableFrom: "2026-12-01",
          salaryAmountCents: 2150,
          salaryPeriod: "hourly",
          germanRequirement: "comfortable",
        }}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "Persisted description",
    );
    expect(screen.getByLabelText("Available from")).toHaveValue("2026-12-01");
    expect(screen.getByRole("textbox", { name: "Amount in EUR" })).toHaveValue(
      "21.50",
    );
    expect(screen.getByRole("combobox", { name: "Period" })).toHaveValue(
      "hourly",
    );
    expect(
      screen.getByRole("radio", { name: "Comfortable German" }),
    ).toBeChecked();
  });

  it("retains every kind of dirty field after validation and focuses the first invalid field", async () => {
    updateEmployerVacancyDraftAction.mockResolvedValueOnce({
      error: "Title is required.",
      message: null,
      fieldErrors: { title: "Title is required." },
    });
    const draft = { ...baseDraft, id: "22222222-2222-4222-8222-222222222288" };
    render(<VacancyDraftForm mode="edit" draft={draft} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Berlin public locality" }),
      {
        target: { value: "Kreuzberg" },
      },
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
      target: { value: "A careful description" },
    });
    fireEvent.change(screen.getByLabelText("Available from"), {
      target: { value: "2026-11-01" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Amount in EUR" }), {
      target: { value: "20.50" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Period" }), {
      target: { value: "hourly" },
    });
    expect(screen.getByRole("combobox", { name: "Period" })).toHaveValue(
      "hourly",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Job category" }), {
      target: { value: "cleaning" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Part time" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Weekend" }));
    fireEvent.click(screen.getByRole("radio", { name: "Comfortable German" }));

    fireEvent.submit(
      screen.getByRole("button", { name: "Save draft" }).closest("form")!,
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    expect(screen.getByRole("textbox", { name: "Title" })).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveAttribute(
      "aria-describedby",
      "title-error",
    );
    expect(
      screen.getByRole("textbox", { name: "Berlin public locality" }),
    ).toHaveValue("Kreuzberg");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "A careful description",
    );
    expect(screen.getByLabelText("Available from")).toHaveValue("2026-11-01");
    expect(screen.getByRole("textbox", { name: "Amount in EUR" })).toHaveValue(
      "20.50",
    );
    expect(screen.getByRole("combobox", { name: "Period" })).toHaveValue(
      "hourly",
    );
    expect(screen.getByRole("combobox", { name: "Job category" })).toHaveValue(
      "cleaning",
    );
    expect(screen.getByRole("checkbox", { name: "Part time" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Weekend" })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Comfortable German" }),
    ).toBeChecked();
  });

  it("retains dirty edit fields through a readiness remount", () => {
    const draft = { ...baseDraft, id: "22222222-2222-4222-8222-222222222277" };
    const view = render(<VacancyDraftForm mode="edit" draft={draft} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Unsaved job" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Part time" }));
    view.unmount();
    render(<VacancyDraftForm mode="edit" draft={{ ...draft, ready: true }} />);
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Unsaved job",
    );
    expect(screen.getByRole("checkbox", { name: "Part time" })).toBeChecked();
  });

  it("uses the newly persisted draft after a successful save and remount", async () => {
    updateEmployerVacancyDraftAction.mockResolvedValueOnce({
      error: null,
      message: "Draft changes saved.",
    });
    const draft = { ...baseDraft, id: "22222222-2222-4222-8222-222222222255" };
    const view = render(<VacancyDraftForm mode="edit" draft={draft} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Saved title" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Save draft" }).closest("form")!,
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Draft changes saved.",
      ),
    );
    view.unmount();
    render(
      <VacancyDraftForm
        mode="edit"
        draft={{ ...draft, title: "Server title" }}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Server title",
    );
  });
});
