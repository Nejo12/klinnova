import { readFileSync } from "node:fs";
import path from "node:path";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/i18n/locale-provider";
import { FloatingAppearanceControl } from "@/components/theme/floating-appearance-control";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme/theme";

const mockUsePathname = vi.fn(() => "/jobs");

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

const controlStyles = readFileSync(
  path.join(
    process.cwd(),
    "src/components/theme/floating-appearance-control.module.scss",
  ),
  "utf-8",
);

function installMatchMedia(prefersDark = false) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({
      matches: prefersDark,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList),
  });
}

function renderControl(
  preference: ThemePreference = "system",
  locale: "en" | "de" = "en",
) {
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme =
    preference === "dark" ? "dark" : "light";
  document.documentElement.dataset.locale = locale;

  return render(
    <LocaleProvider>
      <ThemeProvider>
        <FloatingAppearanceControl />
      </ThemeProvider>
    </LocaleProvider>,
  );
}

describe("FloatingAppearanceControl", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/jobs");
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-preference");
    document.documentElement.removeAttribute("data-locale");
    document.documentElement.style.removeProperty("color-scheme");
    installMatchMedia();
  });

  it.each([
    ["system", "Appearance: System"],
    ["light", "Appearance: Light"],
    ["dark", "Appearance: Dark"],
  ] as const)("reflects the stored %s preference", (preference, label) => {
    renderControl(preference);

    const trigger = screen.getByRole("button", { name: label });
    expect(trigger.querySelector("svg")).toHaveAttribute(
      "data-theme-icon",
      preference,
    );
  });

  it("opens without mutating the preference and exposes three radio-menu options", async () => {
    const user = userEvent.setup();
    renderControl("dark");

    await user.click(screen.getByRole("button", { name: "Appearance: Dark" }));

    expect(screen.getAllByRole("menuitemradio")).toHaveLength(3);
    expect(
      screen.getByRole("menuitemradio", { name: "System" }),
    ).toHaveAttribute("aria-checked", "false");
    expect(
      screen.getByRole("menuitemradio", { name: "Light" }),
    ).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toHaveFocus();
    expect(document.documentElement.dataset.themePreference).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("opens from the keyboard and selects the focused option with Space", async () => {
    const user = userEvent.setup();
    renderControl("system");
    const trigger = screen.getByRole("button", { name: "Appearance: System" });

    trigger.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown} ");

    expect(document.documentElement.dataset.themePreference).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it.each([
    ["system", "System"],
    ["light", "Light"],
    ["dark", "Dark"],
  ] as const)(
    "selects and persists %s explicitly",
    async (preference, label) => {
      const user = userEvent.setup();
      renderControl(preference === "dark" ? "light" : "dark");
      const trigger = screen.getByRole("button", { name: /^Appearance:/ });

      await user.click(trigger);
      await user.click(screen.getByRole("menuitemradio", { name: label }));

      expect(document.documentElement.dataset.themePreference).toBe(preference);
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(preference);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    },
  );

  it("closes on Escape without mutation and returns focus", async () => {
    const user = userEvent.setup();
    renderControl("system");
    const trigger = screen.getByRole("button", { name: "Appearance: System" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("closes on outside dismissal and returns focus", async () => {
    const user = userEvent.setup();
    renderControl();
    const trigger = screen.getByRole("button", { name: "Appearance: System" });

    await user.click(trigger);
    act(() => fireEvent.pointerDown(document.body));

    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("uses the established German labels", async () => {
    const user = userEvent.setup();
    renderControl("dark", "de");

    await user.click(
      screen.getByRole("button", { name: "Darstellung: Dunkel" }),
    );

    expect(
      screen.getByRole("menuitemradio", { name: "System" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: "Hell" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: "Dunkel" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("does not render on internal operator surfaces", () => {
    mockUsePathname.mockReturnValue("/internal/employers");
    renderControl();

    expect(screen.queryByRole("button", { name: /^Appearance:/ })).toBeNull();
  });
});

describe("FloatingAppearanceControl styles", () => {
  it("keeps the approved fixed, safe-area-aware, collision-ready placement", () => {
    expect(controlStyles).toContain("position: fixed");
    expect(controlStyles).toContain("width: 3rem");
    expect(controlStyles).toContain("height: 3rem");
    expect(controlStyles).toContain("env(safe-area-inset-bottom, 0px)");
    expect(controlStyles).toContain("--appearance-control-bottom-clearance");
    expect(controlStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(controlStyles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(controlStyles).not.toMatch(/\brgba?\(/i);
  });
});
