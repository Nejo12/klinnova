import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Toast, type ToastTone } from "@/components/toast/toast";

const toastStyles = readFileSync(
  path.join(process.cwd(), "src/components/toast/toast.module.scss"),
  "utf-8",
);

function FocusHarness() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setVisible(true)}>
        Show feedback
      </button>
      {visible ? (
        <Toast
          dismissLabel="Dismiss feedback"
          onDismiss={() => setVisible(false)}
        >
          Information updated.
        </Toast>
      ) : null}
    </>
  );
}

describe("Toast", () => {
  it.each<[ToastTone, "status" | "alert", "polite" | "assertive"]>([
    ["info", "status", "polite"],
    ["success", "status", "polite"],
    ["warning", "status", "polite"],
    ["error", "alert", "assertive"],
  ])(
    "exposes the %s tone with the intended live-region semantics",
    (tone, role, liveMode) => {
      render(
        <Toast tone={tone} dismissLabel="Dismiss" onDismiss={vi.fn()}>
          Feedback for {tone}
        </Toast>,
      );

      const toast = screen.getByRole(role);
      expect(toast).toHaveAttribute("data-tone", tone);
      expect(toast).toHaveAttribute("aria-live", liveMode);
      expect(toast).toHaveAttribute("aria-atomic", "true");
      expect(toast).toHaveTextContent(`Feedback for ${tone}`);
    },
  );

  it("keeps action and dismissal separate and explicit", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onDismiss = vi.fn();

    render(
      <Toast
        tone="success"
        dismissLabel="Close confirmation"
        onDismiss={onDismiss}
        action={{ label: "View details", onAction }}
      >
        Changes saved successfully.
      </Toast>,
    );

    expect(onAction).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "View details" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Close confirmation" }),
    );

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does not steal focus when feedback appears", async () => {
    const user = userEvent.setup();
    render(<FocusHarness />);

    const trigger = screen.getByRole("button", { name: "Show feedback" });
    await user.click(trigger);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("renders consumer-provided labels and content without changing them", () => {
    render(
      <Toast
        dismissLabel="Hinweis schließen"
        onDismiss={vi.fn()}
        action={{ label: "Details ansehen", onAction: vi.fn() }}
      >
        Deine Änderungen wurden gespeichert.
      </Toast>,
    );

    expect(
      screen.getByText("Deine Änderungen wurden gespeichert."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Details ansehen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hinweis schließen" }),
    ).toBeInTheDocument();
  });

  it("uses semantic paints and mobile-safe structural rules", () => {
    expect(toastStyles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(toastStyles).not.toMatch(/\brgba?\(/i);
    expect(toastStyles).toContain("width: min(100%, 27.5rem)");
    expect(toastStyles).toContain("max-width: 100%");
    expect(toastStyles).toContain("flex-wrap: wrap");
    expect(toastStyles).toContain("var(--touch-target-min)");
    expect(toastStyles).toContain("var(--shadow-sm)");
  });
});
