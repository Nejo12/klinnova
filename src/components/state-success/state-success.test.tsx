import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StateSuccess } from "@/components/state-success/state-success";

const stateSource = readFileSync(
  path.join(process.cwd(), "src/components/state-success/state-success.tsx"),
  "utf-8",
);

const stateStyles = readFileSync(
  path.join(
    process.cwd(),
    "src/components/state-success/state-success.module.scss",
  ),
  "utf-8",
);

describe("StateSuccess", () => {
  it("renders persistent consumer-provided result content", () => {
    const { container } = render(
      <StateSuccess title="Completed successfully">
        The requested action is complete.
      </StateSuccess>,
    );

    expect(screen.getByText("Completed successfully")).toBeInTheDocument();
    expect(
      screen.getByText("The requested action is complete."),
    ).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveAttribute("role");
    expect(container.firstElementChild).not.toHaveAttribute("aria-live");
  });

  it("opts into polite status announcement only when requested", () => {
    render(
      <StateSuccess title="Profile updated" announcement="polite">
        Your changes are now available.
      </StateSuccess>,
    );

    const state = screen.getByRole("status");
    expect(state).toHaveAttribute("aria-live", "polite");
    expect(state).toHaveAttribute("aria-atomic", "true");
  });

  it("hides the visual success mark from assistive technology", () => {
    const { container } = render(
      <StateSuccess title="Done">The action completed.</StateSuccess>,
    );

    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      "✓",
    );
  });

  it("renders a consumer-provided next step without invoking it", () => {
    const onAction = vi.fn();

    render(
      <StateSuccess
        title="Application submitted"
        action={
          <button type="button" onClick={onAction}>
            View application
          </button>
        }
      >
        Your application was sent.
      </StateSuccess>,
    );

    expect(onAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "View application" }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("preserves consumer-provided German content and layout class", () => {
    const { container } = render(
      <StateSuccess title="Erfolgreich abgeschlossen" className="flow-result">
        Deine Änderungen wurden gespeichert.
      </StateSuccess>,
    );

    expect(screen.getByText("Erfolgreich abgeschlossen")).toBeInTheDocument();
    expect(
      screen.getByText("Deine Änderungen wurden gespeichert."),
    ).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("flow-result");
  });

  it("remains a server component without embedded business copy", () => {
    expect(stateSource).not.toContain('"use client"');
    expect(stateSource).not.toMatch(/completed successfully|view application/i);
  });

  it("uses semantic paints and mobile-safe structural rules", () => {
    expect(stateStyles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(stateStyles).not.toMatch(/\brgba?\(/i);
    expect(stateStyles).toContain("var(--color-status-success-bg)");
    expect(stateStyles).toContain("var(--color-status-success)");
    expect(stateStyles).toContain("width: min(100%, 38.75rem)");
    expect(stateStyles).toContain("max-width: 100%");
    expect(stateStyles).toContain("overflow-wrap: anywhere");
    expect(stateStyles).toContain("@media (max-width: 30rem)");
  });
});
