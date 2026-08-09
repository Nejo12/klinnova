import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { EmployerVacancyLifecycleActionState } from "@/app/employer/vacancies/[vacancyId]/lifecycle-actions";

const publishEmployerVacancyAction = vi.hoisted(() =>
  vi.fn(async (): Promise<EmployerVacancyLifecycleActionState> => ({
    error: null,
    message: null,
  })),
);
const noopAction = vi.hoisted(() =>
  vi.fn(async (): Promise<EmployerVacancyLifecycleActionState> => ({
    error: null,
    message: null,
  })),
);

vi.mock("@/app/employer/vacancies/[vacancyId]/lifecycle-actions", () => ({
  publishEmployerVacancyAction,
  pauseEmployerVacancyAction: noopAction,
  resumeEmployerVacancyAction: noopAction,
  fillEmployerVacancyAction: noopAction,
  withdrawEmployerVacancyAction: noopAction,
  renewEmployerVacancyAction: noopAction,
  materializeEmployerVacancyExpiryAction: noopAction,
}));

import { VacancyLifecycleActions } from "@/components/employer-vacancies/vacancy-lifecycle-actions";

const vacancyId = "22222222-2222-4222-8222-222222222201";

describe("VacancyLifecycleActions", () => {
  it("D-M5-19: a failed publish attempt renders each checklist item's real complete state, not a hardcoded 'Missing' for every row", async () => {
    const user = userEvent.setup();
    publishEmployerVacancyAction.mockResolvedValueOnce({
      error: "This vacancy is not ready to publish yet.",
      message: null,
      missing: ["salary"],
    });

    render(
      <VacancyLifecycleActions
        vacancyId={vacancyId}
        publicationState="draft"
        isEffectivelyExpired={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Publish" }));

    const salaryItem = await screen.findByText("Salary (EUR gross)");
    const salaryRow = salaryItem.closest("li");
    expect(salaryRow).toHaveAttribute("data-complete", "false");
    expect(salaryRow).toHaveTextContent("Missing");

    // "title" is part of the fixed checklist order but was not returned in
    // `missing` — before the fix this row also rendered the hardcoded
    // "Missing" literal, directly contradicting its own complete state.
    const titleItem = screen.getByText("Title");
    const titleRow = titleItem.closest("li");
    expect(titleRow).toHaveAttribute("data-complete", "true");
    expect(titleRow).toHaveTextContent("Complete");
    expect(titleRow).not.toHaveTextContent("Missing");
  });
});
