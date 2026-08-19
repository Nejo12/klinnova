import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StatusTransitionConfirmDialog } from "@/components/employer-applications/status-transition-confirm-dialog";
import { APPLICATION_REASON_MAX_LENGTH } from "@/lib/employer/applications/messages";

function renderInForm(
  ui: React.ReactElement,
  onSubmit: (formData: FormData) => void = () => {},
) {
  return render(
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter as
          HTMLElement | null | undefined;
        onSubmit(new FormData(event.currentTarget, submitter ?? undefined));
      }}
    >
      {ui}
    </form>,
  );
}

describe("StatusTransitionConfirmDialog", () => {
  it("renders the accept copy, note, and buttons for targetStatus='accepted'", () => {
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="accepted"
        pending={false}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("alertdialog", {
      name: "Accept this application?",
    });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText(/does not record a hire or an employment contract/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /this ends the application\. it cannot be changed afterwards\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accept application" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("renders the reject copy, note, optional reason field, and buttons for targetStatus='rejected'", () => {
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="rejected"
        pending={false}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("alertdialog", {
      name: "Reject this application?",
    });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText(/the application will be recorded as rejected/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/"Not selected"/)).toBeInTheDocument();
    expect(
      screen.getByText(/no reason is shared with them/i),
    ).toBeInTheDocument();

    const reasonField = screen.getByLabelText(/reason/i);
    expect(reasonField).toBeInTheDocument();
    expect(reasonField).toHaveAttribute("name", "reason");
    expect(reasonField).toHaveAttribute(
      "maxlength",
      String(APPLICATION_REASON_MAX_LENGTH),
    );

    expect(
      screen.getByRole("button", { name: "Reject application" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("moves focus into the dialog (to the heading) when it mounts", () => {
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="accepted"
        pending={false}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Accept this application?" }),
    ).toHaveFocus();
  });

  it("disables both buttons and the reason field while pending, and swaps the confirm label to the pending copy with aria-busy set", () => {
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="rejected"
        pending={true}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Reject application" }),
    ).toBeNull();
    const confirmButton = screen.getByRole("button", { name: "Recording…" });
    expect(confirmButton).toBeDisabled();
    expect(confirmButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByLabelText(/reason/i)).toBeDisabled();
  });

  it("shows the accept confirm label (not the pending copy) and no aria-busy when not pending", () => {
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="accepted"
        pending={false}
        onCancel={vi.fn()}
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: "Accept application",
    });
    expect(confirmButton).not.toBeDisabled();
    expect(confirmButton).not.toHaveAttribute("aria-busy", "true");
  });

  it("shows 'Recording…' as the pending confirm label for targetStatus='accepted' too", () => {
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="accepted"
        pending={true}
        onCancel={vi.fn()}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "Recording…" });
    expect(confirmButton).toBeDisabled();
    expect(confirmButton).toHaveAttribute("aria-busy", "true");
  });

  it("calls onCancel and does not submit when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="accepted"
        pending={false}
        onCancel={onCancel}
      />,
      onSubmit,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onCancel when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="accepted"
        pending={false}
        onCancel={onCancel}
      />,
    );

    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("traps Tab: from the last focusable element (confirm button) it wraps to the first (Cancel)", async () => {
    const user = userEvent.setup();
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="accepted"
        pending={false}
        onCancel={vi.fn()}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", {
      name: "Accept application",
    });

    confirmButton.focus();
    expect(confirmButton).toHaveFocus();

    await user.tab();

    expect(cancelButton).toHaveFocus();
  });

  it("traps Shift+Tab: from the first focusable element (Cancel) it wraps to the last (confirm button)", async () => {
    const user = userEvent.setup();
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="accepted"
        pending={false}
        onCancel={vi.fn()}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", {
      name: "Accept application",
    });

    cancelButton.focus();
    expect(cancelButton).toHaveFocus();

    await user.tab({ shift: true });

    expect(confirmButton).toHaveFocus();
  });

  it("traps Tab across the reason field for targetStatus='rejected': the reason textarea (first, DOM order) and confirm button (last) wrap to each other", async () => {
    const user = userEvent.setup();
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="rejected"
        pending={false}
        onCancel={vi.fn()}
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: "Reject application",
    });
    const reasonField = screen.getByLabelText(/reason/i);

    // DOM order inside the panel: reason textarea -> Cancel -> confirm.
    confirmButton.focus();
    await user.tab();
    expect(reasonField).toHaveFocus();

    await user.tab({ shift: true });
    expect(confirmButton).toHaveFocus();
  });

  it("submits targetStatus=accepted (and no reason field) when confirmed, inside the enclosing form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="accepted"
        pending={false}
        onCancel={vi.fn()}
      />,
      onSubmit,
    );

    await user.click(
      screen.getByRole("button", { name: "Accept application" }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const formData = onSubmit.mock.calls[0]?.[0] as FormData;
    expect(formData.get("targetStatus")).toBe("accepted");
    expect(formData.has("reason")).toBe(false);
  });

  it("submits targetStatus=rejected plus a typed optional reason when confirmed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderInForm(
      <StatusTransitionConfirmDialog
        targetStatus="rejected"
        pending={false}
        onCancel={vi.fn()}
      />,
      onSubmit,
    );

    await user.type(screen.getByLabelText(/reason/i), "Not a fit");
    await user.click(
      screen.getByRole("button", { name: "Reject application" }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const formData = onSubmit.mock.calls[0]?.[0] as FormData;
    expect(formData.get("targetStatus")).toBe("rejected");
    expect(formData.get("reason")).toBe("Not a fit");
  });
});
