import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Menu, Popover } from "@/components/popover-menu/popover-menu";

const overlayStyles = readFileSync(
  path.join(
    process.cwd(),
    "src/components/popover-menu/popover-menu.module.scss",
  ),
  "utf-8",
);

describe("Popover", () => {
  it("opens a labelled non-modal surface and focuses its first action", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <Popover
        trigger={<button type="button">Why this matters</button>}
        title="Context title"
        action={
          <button type="button" onClick={onAction}>
            Learn more
          </button>
        }
      >
        Richer supplemental context.
      </Popover>,
    );

    const trigger = screen.getByRole("button", { name: "Why this matters" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(onAction).not.toHaveBeenCalled();

    await user.click(trigger);

    const popover = screen.getByRole("dialog", { name: "Context title" });
    expect(popover).not.toHaveAttribute("aria-modal");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", popover.id);
    expect(screen.getByRole("button", { name: "Learn more" })).toHaveFocus();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(
      <Popover
        trigger={<button type="button">Open context</button>}
        title="Context title"
      >
        Supplemental context.
      </Popover>,
    );

    const trigger = screen.getByRole("button", { name: "Open context" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("light-dismisses on an outside pointer without invoking its action", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <>
        <Popover
          trigger={<button type="button">Open popover</button>}
          title="Popover title"
          action={<button onClick={onAction}>Optional action</button>}
        >
          Popover body.
        </Popover>
        <button type="button">Outside control</button>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Open popover" }));
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Outside control" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(onAction).not.toHaveBeenCalled();
  });

  it("preserves consumer trigger behavior and German content", async () => {
    const user = userEvent.setup();
    const onTrigger = vi.fn();
    render(
      <Popover
        trigger={
          <button type="button" onClick={onTrigger}>
            Warum ist das wichtig?
          </button>
        }
        title="Zusätzlicher Kontext"
      >
        Diese Information ergänzt den aktuellen Inhalt.
      </Popover>,
    );

    await user.click(
      screen.getByRole("button", { name: "Warum ist das wichtig?" }),
    );

    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Zusätzlicher Kontext")).toBeInTheDocument();
    expect(
      screen.getByText("Diese Information ergänzt den aktuellen Inhalt."),
    ).toBeInTheDocument();
  });
});

describe("Menu", () => {
  function renderMenu(
    actions: [() => void, () => void, () => void] = [vi.fn(), vi.fn(), vi.fn()],
  ) {
    render(
      <Menu
        trigger={<button type="button">More actions</button>}
        items={[
          { id: "view", label: "View details", onSelect: actions[0] },
          {
            id: "duplicate",
            label: "Duplicate",
            onSelect: actions[1],
            disabled: true,
          },
          {
            id: "delete",
            label: "Delete",
            onSelect: actions[2],
            tone: "danger",
            shortcut: "⌫",
          },
        ]}
      />,
    );
    return actions;
  }

  it("opens with menu-button semantics and focuses the first enabled item", async () => {
    const user = userEvent.setup();
    const actions = renderMenu();
    const trigger = screen.getByRole("button", { name: "More actions" });

    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);

    const menu = screen.getByRole("menu");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", menu.id);
    expect(
      screen.getByRole("menuitem", { name: "View details" }),
    ).toHaveFocus();
    actions.forEach((action) => expect(action).not.toHaveBeenCalled());
  });

  it("uses managed arrow focus, skips disabled items, and wraps", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "More actions" }));

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitem", { name: "View details" }),
    ).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  });

  it("supports Home and End navigation", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "More actions" }));

    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(
      screen.getByRole("menuitem", { name: "View details" }),
    ).toHaveFocus();
  });

  it("activates only the explicit selected item and returns focus", async () => {
    const user = userEvent.setup();
    const actions = renderMenu();
    const trigger = screen.getByRole("button", { name: "More actions" });
    await user.click(trigger);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(actions[0]).not.toHaveBeenCalled();
    expect(actions[1]).not.toHaveBeenCalled();
    expect(actions[2]).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on Escape without selecting an action", async () => {
    const user = userEvent.setup();
    const actions = renderMenu();
    const trigger = screen.getByRole("button", { name: "More actions" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    actions.forEach((action) => expect(action).not.toHaveBeenCalled());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("opens from Arrow Up at the final enabled item", async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole("button", { name: "More actions" });
    trigger.focus();

    await user.keyboard("{ArrowUp}");

    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  });

  it("marks destructive and disabled items without hiding their labels", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "More actions" }));

    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
      "data-tone",
      "danger",
    );
    expect(screen.getByText("⌫")).toHaveAttribute("aria-hidden", "true");
  });

  it("exposes optional selected items with radio-menu semantics", async () => {
    const user = userEvent.setup();
    render(
      <Menu
        trigger={<button type="button">Appearance</button>}
        items={[
          {
            id: "system",
            label: "System",
            onSelect: vi.fn(),
            selected: false,
          },
          {
            id: "dark",
            label: "Dark",
            onSelect: vi.fn(),
            selected: true,
            shortcut: "✓",
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Appearance" }));

    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      screen.getByRole("menuitemradio", { name: "System" }),
    ).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toHaveFocus();
  });
});

describe("Popover / Menu styles", () => {
  it("uses semantic paints, bounded surfaces, and narrow-screen rules", () => {
    expect(overlayStyles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(overlayStyles).not.toMatch(/\brgba?\(/i);
    expect(overlayStyles).toContain("var(--color-bg-surface)");
    expect(overlayStyles).toContain("var(--color-status-danger)");
    expect(overlayStyles).toContain("var(--shadow-md)");
    expect(overlayStyles).toContain("var(--z-dropdown)");
    expect(overlayStyles).toContain("var(--touch-target-min)");
    expect(overlayStyles).toContain("max-width: calc(100vw - var(--space-8))");
    expect(overlayStyles).toContain("@media (max-width: 30rem)");
  });
});
