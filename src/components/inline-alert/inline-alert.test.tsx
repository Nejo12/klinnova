import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  InlineAlert,
  type InlineAlertTone,
} from "@/components/inline-alert/inline-alert";

const alertStyles = readFileSync(
  path.join(
    process.cwd(),
    "src/components/inline-alert/inline-alert.module.scss",
  ),
  "utf-8",
);

describe("InlineAlert", () => {
  it.each<InlineAlertTone>(["info", "success", "warning", "error"])(
    "renders the %s tone as persistent in-flow content",
    (tone) => {
      render(
        <InlineAlert tone={tone} title={`${tone} title`}>
          Feedback for {tone}
        </InlineAlert>,
      );

      const alert = screen.getByText(`${tone} title`).parentElement
        ?.parentElement;
      expect(alert).toHaveAttribute("data-tone", tone);
      expect(alert).not.toHaveAttribute("role");
      expect(alert).not.toHaveAttribute("aria-live");
      expect(alert).not.toHaveAttribute("aria-atomic");
      expect(alert).toHaveTextContent(`Feedback for ${tone}`);
    },
  );

  it.each<["polite" | "assertive", "status" | "alert"]>([
    ["polite", "status"],
    ["assertive", "alert"],
  ])(
    "exposes an explicitly requested %s announcement",
    (announcement, role) => {
      render(
        <InlineAlert title="Account update" announcement={announcement}>
          Review the new information.
        </InlineAlert>,
      );

      const alert = screen.getByRole(role);
      expect(alert).toHaveAttribute("aria-live", announcement);
      expect(alert).toHaveAttribute("aria-atomic", "true");
    },
  );

  it("keeps visual tone separate from announcement urgency", () => {
    const { rerender } = render(
      <InlineAlert tone="error" title="Persistent error">
        This existing message is not announced again.
      </InlineAlert>,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(
      <InlineAlert
        tone="info"
        title="Urgent information"
        announcement="assertive"
      >
        This newly inserted information needs immediate announcement.
      </InlineAlert>,
    );

    expect(screen.getByRole("alert")).toHaveAttribute("data-tone", "info");
  });

  it("renders a consumer-provided action without invoking it", () => {
    const onAction = vi.fn();

    render(
      <InlineAlert
        tone="warning"
        title="Check this"
        action={
          <button type="button" onClick={onAction}>
            Review details
          </button>
        }
      >
        Review the highlighted condition before continuing.
      </InlineAlert>,
    );

    expect(onAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Review details" }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renders consumer-provided German content without changing it", () => {
    render(
      <InlineAlert title="Aktion erforderlich" tone="error">
        Behebe dieses Problem, bevor du es erneut versuchst.
      </InlineAlert>,
    );

    expect(screen.getByText("Aktion erforderlich")).toBeInTheDocument();
    expect(
      screen.getByText("Behebe dieses Problem, bevor du es erneut versuchst."),
    ).toBeInTheDocument();
  });

  it("uses semantic paints and mobile-safe structural rules", () => {
    expect(alertStyles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(alertStyles).not.toMatch(/\brgba?\(/i);
    expect(alertStyles).toContain("width: 100%");
    expect(alertStyles).toContain("max-width: 100%");
    expect(alertStyles).toContain("overflow-wrap: anywhere");
    expect(alertStyles).toContain("@media (max-width: 25rem)");
    expect(alertStyles).toContain("var(--color-status-danger-bg)");
  });
});
