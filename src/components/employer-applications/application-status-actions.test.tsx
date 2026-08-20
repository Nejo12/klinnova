import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TransitionApplicationActionState } from "@/lib/employer/applications/transition-action-state";

const actionMock = vi.hoisted(() =>
  vi.fn(
    async (
      _prev: TransitionApplicationActionState,
      _formData: FormData,
    ): Promise<TransitionApplicationActionState> => ({
      kind: "failure",
    }),
  ),
);

vi.mock(
  "@/app/employer/applications/[applicationId]/transition-actions",
  () => ({
    transitionEmployerApplicationAction: actionMock,
  }),
);

import { ApplicationStatusActions } from "@/components/employer-applications/application-status-actions";

const applicationId = "11111111-1111-4111-8111-111111111111";

describe("ApplicationStatusActions", () => {
  it("renders a terminal-state message and no controls when there are no allowed transitions", () => {
    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="accepted"
        allowedTransitions={[]}
      />,
    );

    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/status is final/i)).toBeInTheDocument();
    expect(screen.getByText(/current status: accepted/i)).toBeInTheDocument();
  });

  it("renders one discrete button per allowed transition, with the correct action-verb label", () => {
    render(
      <ApplicationStatusActions
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

    expect(
      screen.getByRole("button", { name: "Start reviewing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Shortlist" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reject application" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("orders ordinary transitions before terminal transitions, with a divider between them", () => {
    render(
      <ApplicationStatusActions
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

    const form = screen
      .getByRole("button", { name: "Start reviewing" })
      .closest("form");
    expect(form).not.toBeNull();
    const divider = form?.querySelector("hr");
    expect(divider).not.toBeNull();

    const walker = Array.from(form?.querySelectorAll("button, hr") ?? []);
    const order = walker.map((el) =>
      el.tagName === "HR" ? "divider" : el.textContent,
    );
    expect(order).toEqual([
      "Start reviewing",
      "Shortlist",
      "divider",
      "Accept",
      "Reject application",
    ]);
  });

  it("does not render a divider when there are no terminal transitions allowed", () => {
    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );
    const form = screen
      .getByRole("button", { name: "Start reviewing" })
      .closest("form");
    expect(form?.querySelector("hr")).toBeNull();
  });

  it("submits an ordinary transition button immediately, with applicationId and targetStatus only", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start reviewing" }));

    expect(actionMock).toHaveBeenCalledTimes(1);
    const formData = actionMock.mock.calls[0]?.[1] as FormData;
    expect(formData.get("applicationId")).toBe(applicationId);
    expect(formData.get("targetStatus")).toBe("reviewing");
    expect(Array.from(formData.keys())).toEqual(
      expect.arrayContaining(["applicationId", "targetStatus"]),
    );
    expect(formData.has("reason")).toBe(false);
  });

  it("clicking a terminal transition button opens the confirm dialog without submitting", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="shortlisted"
        allowedTransitions={["accepted", "rejected"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Accept" }));

    expect(actionMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", { name: "Accept this application?" }),
    ).toBeInTheDocument();
  });

  it("clicking the dialog's Cancel closes it without submitting", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="shortlisted"
        allowedTransitions={["accepted", "rejected"]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Reject application" }),
    );
    const dialog = screen.getByRole("alertdialog", {
      name: "Reject this application?",
    });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(actionMock).not.toHaveBeenCalled();
  });

  it("clicking the dialog's confirm button submits with the correct targetStatus", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="shortlisted"
        allowedTransitions={["accepted", "rejected"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Accept" }));
    const dialog = screen.getByRole("alertdialog", {
      name: "Accept this application?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Accept application" }),
    );

    expect(actionMock).toHaveBeenCalledTimes(1);
    const formData = actionMock.mock.calls[0]?.[1] as FormData;
    expect(formData.get("applicationId")).toBe(applicationId);
    expect(formData.get("targetStatus")).toBe("accepted");
  });

  it("submits the optional reason typed in the reject dialog as the reason field", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="shortlisted"
        allowedTransitions={["accepted", "rejected"]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Reject application" }),
    );
    const dialog = screen.getByRole("alertdialog", {
      name: "Reject this application?",
    });
    await user.type(within(dialog).getByLabelText(/reason/i), "Not a fit");
    await user.click(
      within(dialog).getByRole("button", { name: "Reject application" }),
    );

    expect(actionMock).toHaveBeenCalledTimes(1);
    const formData = actionMock.mock.calls[0]?.[1] as FormData;
    expect(formData.get("targetStatus")).toBe("rejected");
    expect(formData.get("reason")).toBe("Not a fit");
  });

  it("submits an empty reason (normalized server-side to null by the schema's optional-reason transform) when left blank", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="shortlisted"
        allowedTransitions={["accepted", "rejected"]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Reject application" }),
    );
    const dialog = screen.getByRole("alertdialog", {
      name: "Reject this application?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Reject application" }),
    );

    expect(actionMock).toHaveBeenCalledTimes(1);
    const formData = actionMock.mock.calls[0]?.[1] as FormData;
    expect(formData.get("targetStatus")).toBe("rejected");
    expect(formData.get("reason")).toBe("");
  });

  it("submits no reason field at all for an ordinary (non-terminal) transition", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing", "rejected"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start reviewing" }));

    expect(actionMock).toHaveBeenCalledTimes(1);
    const formData = actionMock.mock.calls[0]?.[1] as FormData;
    expect(new Set(Array.from(formData.keys()))).toEqual(
      new Set(["applicationId", "targetStatus"]),
    );
  });

  it("disables the transition buttons while pending", async () => {
    const user = userEvent.setup();
    let finish: ((value: TransitionApplicationActionState) => void) | undefined;
    actionMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start reviewing" }));
    expect(
      await screen.findByRole("button", { name: "Starting review…" }),
    ).toBeDisabled();

    finish?.({ kind: "updated", currentStatus: "reviewing" });
    expect(await screen.findByRole("status")).toHaveTextContent(/in review/i);
  });

  it("shows the pressed button's pending label and aria-busy while its request is in flight, reverting once it resolves", async () => {
    const user = userEvent.setup();
    let finish: ((value: TransitionApplicationActionState) => void) | undefined;
    actionMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start reviewing" }));

    const pendingButton = await screen.findByRole("button", {
      name: "Starting review…",
    });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute("aria-busy", "true");
    expect(
      screen.queryByRole("button", { name: "Start reviewing" }),
    ).toBeNull();

    finish?.({ kind: "updated", currentStatus: "reviewing" });

    expect(await screen.findByRole("status")).toHaveTextContent(/in review/i);
    // `allowedTransitions` is caller-controlled and unchanged by this
    // resolution in the test, so the button reappears, enabled, with its
    // ordinary (non-pending) label and no aria-busy.
    const revertedButton = await screen.findByRole("button", {
      name: "Start reviewing",
    });
    expect(revertedButton).not.toBeDisabled();
    expect(revertedButton).not.toHaveAttribute("aria-busy");
  });

  it("shows only the pressed button's pending label while a disabled sibling keeps its ordinary label and gains no aria-busy", async () => {
    const user = userEvent.setup();
    let finish: ((value: TransitionApplicationActionState) => void) | undefined;
    actionMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing", "shortlisted"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start reviewing" }));

    const pressedButton = await screen.findByRole("button", {
      name: "Starting review…",
    });
    expect(pressedButton).toHaveAttribute("aria-busy", "true");

    const siblingButton = screen.getByRole("button", { name: "Shortlist" });
    expect(siblingButton).toBeDisabled();
    expect(siblingButton).not.toHaveAttribute("aria-busy");
    expect(screen.queryByRole("button", { name: "Shortlisting…" })).toBeNull();

    finish?.({ kind: "updated", currentStatus: "reviewing" });
    await screen.findByRole("status");
  });

  it("shows a stable already_in_state message, not a generic failure", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({
      kind: "already_in_state",
      currentStatus: "reviewing",
    });

    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Start reviewing" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /changed since the page loaded/i,
    );
  });

  it("shows a neutral invalid_transition alert", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({ kind: "invalid_transition" });

    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Start reviewing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no longer available/i,
    );
  });

  it("shows the unavailable alert", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({ kind: "unavailable" });

    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Start reviewing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /not available/i,
    );
  });

  it("shows the employer_unavailable alert", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({ kind: "employer_unavailable" });

    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Start reviewing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /finish employer onboarding/i,
    );
  });

  it("shows a safe generic failure alert without internal details", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({ kind: "failure" });

    render(
      <ApplicationStatusActions
        applicationId={applicationId}
        currentStatus="submitted"
        allowedTransitions={["reviewing"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Start reviewing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/went wrong/i);
    expect(screen.queryByText(/postgres|permission denied/i)).toBeNull();
  });
});
