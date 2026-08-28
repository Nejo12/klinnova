import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const actionMock = vi.hoisted(() =>
  vi.fn(
    async (): Promise<{
      status:
        | "idle"
        | "validation_error"
        | "unavailable"
        | "ineligible"
        | "submitted"
        | "already_applied"
        | "failure";
      applicationId?: string;
      missingRequirements?: string[];
    }> => ({
      status: "failure",
    }),
  ),
);

vi.mock("@/app/candidate/jobs/[vacancyId]/actions", () => ({
  submitCandidateApplicationAction: actionMock,
}));

import { ApplicationSubmitForm } from "@/components/candidate-job-detail/application-submit-form";
import {
  APPLICATION_INELIGIBLE_HEADING,
  APPLICATION_SUBMIT_DISCLOSURE,
  APPLICATION_FAILURE_MESSAGE,
} from "@/lib/applications/messages";

const VACANCY_ID = "22222222-2222-4222-8222-222222222201";

describe("ApplicationSubmitForm", () => {
  it("submits only vacancyId and shows disclosure without a checkbox", () => {
    render(<ApplicationSubmitForm vacancyId={VACANCY_ID} />);

    expect(screen.getByText(APPLICATION_SUBMIT_DISCLOSURE)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();

    const vacancyInput = screen.getByDisplayValue(VACANCY_ID);
    expect(vacancyInput).toHaveAttribute("type", "hidden");
    expect(vacancyInput).toHaveAttribute("name", "vacancyId");

    const form = vacancyInput.closest("form");
    expect(form).not.toBeNull();
    expect(form?.querySelectorAll("input")).toHaveLength(1);

    expect(
      screen.getByRole("button", { name: "Apply with profile" }),
    ).toBeEnabled();
  });

  it("disables the button while pending", async () => {
    const user = userEvent.setup();
    let finish: ((value: { status: "failure" }) => void) | undefined;
    actionMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    render(<ApplicationSubmitForm vacancyId={VACANCY_ID} />);
    await user.click(
      screen.getByRole("button", { name: "Apply with profile" }),
    );

    const pendingButton = await screen.findByRole("button", {
      name: "Applying…",
    });
    expect(pendingButton).toBeDisabled();

    finish?.({ status: "failure" });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      APPLICATION_FAILURE_MESSAGE,
    );
  });

  it("does not show temporary submitted acknowledgement copy", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({
      status: "submitted",
      applicationId: "33333333-3333-4333-8333-333333333301",
    });

    render(<ApplicationSubmitForm vacancyId={VACANCY_ID} />);
    await user.click(
      screen.getByRole("button", { name: "Apply with profile" }),
    );

    expect(screen.queryByText("Application submitted.")).toBeNull();
    expect(screen.queryByText("Application already submitted.")).toBeNull();
    expect(
      screen.queryByText("33333333-3333-4333-8333-333333333301"),
    ).toBeNull();
  });

  it("shows an ineligible alert with labelled missing requirements and a review link", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({
      status: "ineligible",
      missingRequirements: ["category", "german"],
    });

    render(<ApplicationSubmitForm vacancyId={VACANCY_ID} />);
    await user.click(
      screen.getByRole("button", { name: "Apply with profile" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      APPLICATION_INELIGIBLE_HEADING,
    );
    expect(screen.getByText("Preferred job category")).toBeInTheDocument();
    expect(screen.getByText("German level")).toBeInTheDocument();
    expect(screen.queryByText("category")).toBeNull();
    expect(screen.queryByText("german")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Review your saved preferences" }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=review");
  });

  it("shows a safe failure alert without internal details", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({ status: "failure" });

    render(<ApplicationSubmitForm vacancyId={VACANCY_ID} />);
    await user.click(
      screen.getByRole("button", { name: "Apply with profile" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      APPLICATION_FAILURE_MESSAGE,
    );
    expect(screen.queryByText(/postgres|permission denied/i)).toBeNull();
  });
});
