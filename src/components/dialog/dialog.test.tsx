import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Dialog, type DialogProps } from "@/components/dialog/dialog";

type WithoutDialogState<T> = T extends DialogProps
  ? Omit<T, "open" | "onClose">
  : never;

type DialogHarnessProps = WithoutDialogState<DialogProps>;

function DialogHarness(props: DialogHarnessProps) {
  const [open, setOpen] = useState(false);
  const dialog =
    props.type === "confirmation" ? (
      <Dialog {...props} open={open} onClose={() => setOpen(false)} />
    ) : props.type === "destructive" ? (
      <Dialog {...props} open={open} onClose={() => setOpen(false)} />
    ) : (
      <Dialog {...props} open={open} onClose={() => setOpen(false)} />
    );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <button type="button">Background action</button>
      {dialog}
    </>
  );
}

function installDialogMethods() {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      writable: true,
      value: vi.fn(function showModal(this: HTMLDialogElement) {
        this.setAttribute("open", "");
      }),
    },
    close: {
      configurable: true,
      writable: true,
      value: vi.fn(function close(this: HTMLDialogElement) {
        this.removeAttribute("open");
      }),
    },
  });
}

describe("Dialog", () => {
  beforeEach(() => {
    installDialogMethods();
    document.body.style.removeProperty("overflow");
  });

  it("opens an accessible info dialog, focuses its action, and closes on Escape", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(
      <DialogHarness
        title="Important information"
        description="Review this information before continuing."
        action={{ label: "Got it", onAction: action }}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "Important information",
    });
    expect(dialog).toHaveAccessibleDescription(
      "Review this information before continuing.",
    );
    expect(screen.getByRole("button", { name: "Got it" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    expect(action).not.toHaveBeenCalled();

    fireEvent(dialog, new Event("cancel", { cancelable: true }));

    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("requires a separate explicit confirmation action", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(
      <DialogHarness
        type="confirmation"
        title="Confirm this action"
        description="Nothing happens until you confirm."
        cancelLabel="Cancel"
        action={{ label: "Confirm", onAction: action }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open dialog" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });

  it("keeps destructive action explicit and exposes a working cancel path", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(
      <DialogHarness
        type="destructive"
        size="medium"
        title="Delete this item?"
        description="This action cannot be undone."
        destructiveContext="Permanent action"
        cancelLabel="Keep item"
        action={{ label: "Delete", onAction: action }}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Delete this item?" });
    expect(dialog).toHaveAttribute("data-type", "destructive");
    expect(dialog).toHaveAttribute("data-size", "medium");
    expect(screen.getByText("Permanent action")).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(action).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute("open");

    await user.click(screen.getByRole("button", { name: "Keep item" }));

    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    expect(action).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
  });

  it("wraps focus within the modal action controls", async () => {
    const user = userEvent.setup();

    render(
      <DialogHarness
        type="confirmation"
        title="Confirm this action"
        cancelLabel="Cancel"
        action={{ label: "Confirm", onAction: vi.fn() }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open dialog" }));

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(cancel).toHaveFocus();

    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();

    await user.tab();
    expect(cancel).toHaveFocus();
  });

  it("does not dismiss a mandatory acknowledgement through Escape", async () => {
    const user = userEvent.setup();

    render(
      <DialogHarness
        title="Required acknowledgement"
        cancellable={false}
        action={{ label: "Acknowledge", onAction: vi.fn() }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = screen.getByRole("dialog");

    fireEvent(dialog, new Event("cancel", { cancelable: true }));

    expect(dialog).toHaveAttribute("open");
  });
});
