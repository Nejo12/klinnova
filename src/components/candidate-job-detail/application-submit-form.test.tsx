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
        | "not_matching"
        | "submitted"
        | "already_applied"
        | "failure";
      applicationId?: string;
    }> => ({
      status: "submitted",
      applicationId: "33333333-3333-4333-8333-333333333301",
    }),
  ),
);

vi.mock("@/app/candidate/jobs/[vacancyId]/actions", () => ({
  submitCandidateApplicationAction: actionMock,
}));

import { ApplicationSubmitForm } from "@/components/candidate-job-detail/application-submit-form";
import {
  APPLICATION_ALREADY_APPLIED_BODY,
  APPLICATION_ALREADY_APPLIED_HEADING,
  APPLICATION_NOT_MATCHING_HEADING,
  APPLICATION_SUBMIT_DISCLOSURE,
  APPLICATION_SUBMITTED_BODY,
  APPLICATION_SUBMITTED_HEADING,
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
      screen.getByRole("button", { name: "Submit application" }),
    ).toBeEnabled();
  });

  it("disables the button while pending and shows submitted acknowledgement", async () => {
    const user = userEvent.setup();
    let finish:
      | ((value: { status: "submitted"; applicationId: string }) => void)
      | undefined;
    actionMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    render(<ApplicationSubmitForm vacancyId={VACANCY_ID} />);
    await user.click(
      screen.getByRole("button", { name: "Submit application" }),
    );

    const pendingButton = await screen.findByRole("button", {
      name: "Submitting…",
    });
    expect(pendingButton).toBeDisabled();

    finish?.({
      status: "submitted",
      applicationId: "33333333-3333-4333-8333-333333333301",
    });

    expect(
      await screen.findByText(APPLICATION_SUBMITTED_HEADING),
    ).toBeInTheDocument();
    expect(screen.getByText(APPLICATION_SUBMITTED_BODY)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.queryByText("33333333-3333-4333-8333-333333333301"),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Submit application" }),
    ).toBeNull();
  });

  it("shows already-applied acknowledgement without rendering the application id", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({
      status: "already_applied",
      applicationId: "33333333-3333-4333-8333-333333333301",
    });

    render(<ApplicationSubmitForm vacancyId={VACANCY_ID} />);
    await user.click(
      screen.getByRole("button", { name: "Submit application" }),
    );

    expect(
      await screen.findByText(APPLICATION_ALREADY_APPLIED_HEADING),
    ).toBeInTheDocument();
    expect(
      screen.getByText(APPLICATION_ALREADY_APPLIED_BODY),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("33333333-3333-4333-8333-333333333301"),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Submit application" }),
    ).toBeNull();
  });

  it("shows not-matching alert with a matches link", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({ status: "not_matching" });

    render(<ApplicationSubmitForm vacancyId={VACANCY_ID} />);
    await user.click(
      screen.getByRole("button", { name: "Submit application" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      APPLICATION_NOT_MATCHING_HEADING,
    );
    expect(
      screen.getByRole("link", { name: "Back to matches" }),
    ).toHaveAttribute("href", "/candidate/matches");
  });

  it("shows a safe failure alert without internal details", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({ status: "failure" });

    render(<ApplicationSubmitForm vacancyId={VACANCY_ID} />);
    await user.click(
      screen.getByRole("button", { name: "Submit application" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      APPLICATION_FAILURE_MESSAGE,
    );
    expect(screen.queryByText(/postgres|permission denied/i)).toBeNull();
  });
});
