import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Tooltip, type TooltipPlacement } from "@/components/tooltip/tooltip";

const tooltipStyles = readFileSync(
  path.join(process.cwd(), "src/components/tooltip/tooltip.module.scss"),
  "utf-8",
);

describe("Tooltip", () => {
  it("opens on pointer hover and remains associated with the trigger", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Helpful context">
        <button type="button">More information</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "More information" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.hover(trigger);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Helpful context");
    expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);

    await user.unhover(trigger);

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens on keyboard focus and closes when focus leaves", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Tooltip content="Keyboard context" placement="bottom">
          <button type="button">Focus target</button>
        </Tooltip>
        <button type="button">Next control</button>
      </>,
    );

    await user.tab();

    expect(screen.getByRole("tooltip")).toHaveAttribute(
      "data-placement",
      "bottom",
    );

    await user.tab();

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("keeps a focused tooltip open after the pointer leaves", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Persistent while focused">
        <button type="button">Combined target</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Combined target" });
    await user.tab();
    await user.hover(trigger);
    await user.unhover(trigger);

    expect(trigger).toHaveFocus();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("dismisses on Escape without moving focus", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Dismissible context">
        <button type="button">Escape target</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Escape target" });
    await user.tab();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("preserves an existing trigger description and event handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <span id="existing-description">Existing context</span>
        <Tooltip content="Additional context">
          <button
            type="button"
            aria-describedby="existing-description"
            onClick={onClick}
          >
            Described target
          </button>
        </Tooltip>
      </>,
    );

    const trigger = screen.getByRole("button", { name: "Described target" });
    expect(trigger).toHaveAttribute("aria-describedby", "existing-description");

    await user.hover(trigger);

    const tooltip = screen.getByRole("tooltip");
    expect(trigger.getAttribute("aria-describedby")?.split(" ")).toEqual([
      "existing-description",
      tooltip.id,
    ]);

    await user.click(trigger);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each<TooltipPlacement>(["top", "bottom", "left", "right"])(
    "supports the %s placement",
    async (placement) => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Placement context" placement={placement}>
          <button type="button">Placement target</button>
        </Tooltip>,
      );

      await user.hover(
        screen.getByRole("button", { name: "Placement target" }),
      );

      expect(screen.getByRole("tooltip")).toHaveAttribute(
        "data-placement",
        placement,
      );
    },
  );

  it("renders consumer-provided German content without changing it", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Zusätzlicher hilfreicher Kontext">
        <button type="button">Weitere Informationen</button>
      </Tooltip>,
    );

    await user.hover(
      screen.getByRole("button", { name: "Weitere Informationen" }),
    );

    expect(
      screen.getByText("Zusätzlicher hilfreicher Kontext"),
    ).toBeInTheDocument();
  });

  it("uses semantic paints and narrow-screen placement rules", () => {
    expect(tooltipStyles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(tooltipStyles).not.toMatch(/\brgba?\(/i);
    expect(tooltipStyles).toContain("var(--color-bg-inverse)");
    expect(tooltipStyles).toContain("var(--color-text-inverse)");
    expect(tooltipStyles).toContain("var(--z-dropdown)");
    expect(tooltipStyles).toContain("pointer-events: none");
    expect(tooltipStyles).toContain("@media (max-width: 40rem)");
    expect(tooltipStyles).toContain('data-placement="left"');
    expect(tooltipStyles).toContain('data-placement="right"');
  });
});
