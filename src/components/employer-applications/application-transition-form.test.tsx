import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TransitionApplicationActionState } from "@/lib/employer/applications/transition-action-state";

const actionMock = vi.hoisted(() =>
  vi.fn(async (): Promise<TransitionApplicationActionState> => ({
    kind: "failure",
  })),
);

vi.mock(
  "@/app/employer/applications/[applicationId]/transition-actions",
  () => ({
    transitionEmployerApplicationAction: actionMock,
  }),
);

import { ApplicationTransitionForm } from "@/components/employer-applications/application-transition-form";

const applicationId = "11111111-1111-4111-8111-111111111111";

describe("ApplicationTransitionForm", () => {
  it("renders a terminal-state message and no form when there are no allowed transitions", () => {
    render(
      <ApplicationTransitionForm
        applicationId={applicationId}
        currentStatus="accepted"
        allowedTransitions={[]}
      />,
    );

    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText(/status is final/i)).toBeInTheDocument();
    expect(screen.getByText(/current status: accepted/i)).toBeInTheDocument();
  });

  it("renders only the database-approved allowed transitions as options", () => {
    render(
      <ApplicationTransitionForm
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={[
          "reviewing",
          "shortlisted",
          "accepted",
          "rejected",
        ]}
      />,
    );

    const select = screen.getByLabelText("New status");
    const options = Array.from(select.querySelectorAll("option")).map(
      (option) => option.getAttribute("value"),
    );
    expect(options).toEqual([
      "reviewing",
      "shortlisted",
      "accepted",
      "rejected",
    ]);
  });

  it("shows the reason field only when the target is rejected, and clears it when switching away", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationTransitionForm
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing", "rejected"]}
      />,
    );

    expect(screen.queryByLabelText(/reason/i)).toBeNull();

    await user.selectOptions(screen.getByLabelText("New status"), "rejected");
    const reasonField = screen.getByLabelText(/reason/i);
    await user.type(reasonField, "Not a fit");
    expect(reasonField).toHaveValue("Not a fit");

    await user.selectOptions(screen.getByLabelText("New status"), "reviewing");
    expect(screen.queryByLabelText(/reason/i)).toBeNull();

    await user.selectOptions(screen.getByLabelText("New status"), "rejected");
    expect(screen.getByLabelText(/reason/i)).toHaveValue("");
  });

  it("disables the submit button while pending", async () => {
    const user = userEvent.setup();
    let finish: ((value: TransitionApplicationActionState) => void) | undefined;
    actionMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    render(
      <ApplicationTransitionForm
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Update status" }));
    const pendingButton = await screen.findByRole("button", {
      name: "Updating…",
    });
    expect(pendingButton).toBeDisabled();

    finish?.({ kind: "updated", currentStatus: "reviewing" });
    expect(await screen.findByRole("status")).toHaveTextContent(/in review/i);
  });

  it("shows a stable already_in_state message, not a generic failure", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({
      kind: "already_in_state",
      currentStatus: "reviewing",
    });

    render(
      <ApplicationTransitionForm
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Update status" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /changed since the page loaded/i,
    );
  });

  it("shows a neutral invalid_transition alert", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({ kind: "invalid_transition" });

    render(
      <ApplicationTransitionForm
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Update status" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no longer available/i,
    );
  });

  it("shows a safe generic failure alert without internal details", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({ kind: "failure" });

    render(
      <ApplicationTransitionForm
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Update status" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/went wrong/i);
    expect(screen.queryByText(/postgres|permission denied/i)).toBeNull();
  });

  it("submits only applicationId, targetStatus, and reason as form fields", () => {
    render(
      <ApplicationTransitionForm
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing", "rejected"]}
      />,
    );

    const hidden = screen.getByDisplayValue(applicationId);
    const form = hidden.closest("form");
    expect(form).not.toBeNull();
    const names = Array.from(form?.querySelectorAll("[name]") ?? []).map((el) =>
      el.getAttribute("name"),
    );
    expect(new Set(names)).toEqual(new Set(["applicationId", "targetStatus"]));
  });
});
