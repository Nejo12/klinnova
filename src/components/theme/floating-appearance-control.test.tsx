import { readFileSync } from "node:fs";
import path from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/i18n/locale-provider";
import { FloatingInterfacePreferences } from "@/components/theme/floating-appearance-control";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n/locale";
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
  locale: Locale = "en",
) {
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme =
    preference === "dark" ? "dark" : "light";
  document.documentElement.dataset.locale = locale;
  document.documentElement.lang = locale;

  return render(
    <LocaleProvider>
      <ThemeProvider>
        <FloatingInterfacePreferences />
      </ThemeProvider>
    </LocaleProvider>,
  );
}

async function openPanel(label = "Interface preferences") {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: label }));
  return user;
}

describe("FloatingInterfacePreferences", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/jobs");
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-preference");
    document.documentElement.removeAttribute("data-locale");
    document.documentElement.removeAttribute("lang");
    document.documentElement.style.removeProperty("color-scheme");
    installMatchMedia();
  });

  it.each([
    ["en", "Interface preferences"],
    ["de", "Oberflächeneinstellungen"],
  ] as const)(
    "uses the neutral localized trigger label for %s",
    (locale, label) => {
      renderControl("system", locale);

      const trigger = screen.getByRole("button", { name: label });
      expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
      expect(
        trigger.querySelector("[data-interface-preferences-icon]"),
      ).toBeInTheDocument();
      expect(
        trigger.querySelector("[data-theme-icon]"),
      ).not.toBeInTheDocument();
    },
  );

  it("opens one combined panel without mutating either preference", async () => {
    renderControl("dark", "en");
    await openPanel();

    expect(
      screen.getByRole("dialog", { name: "Interface preferences" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /English/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /Deutsch/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: /System/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: /Dark/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(document.documentElement.dataset.locale).toBe("en");
    expect(document.documentElement.dataset.themePreference).toBe("dark");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("changes language only and preserves the appearance preference", async () => {
    renderControl("dark", "en");
    const user = await openPanel();

    await user.click(screen.getByRole("button", { name: /Deutsch/ }));

    expect(document.documentElement.dataset.locale).toBe("de");
    expect(document.documentElement.lang).toBe("de");
    expect(document.documentElement.dataset.themePreference).toBe("dark");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("de");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Oberflächeneinstellungen" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["system", "System"],
    ["light", "Hell"],
    ["dark", "Dunkel"],
  ] as const)(
    "changes appearance to %s only and preserves locale",
    async (preference, label) => {
      renderControl(preference === "dark" ? "light" : "dark", "de");
      const user = await openPanel("Oberflächeneinstellungen");

      await user.click(screen.getByRole("button", { name: label }));

      expect(document.documentElement.dataset.themePreference).toBe(preference);
      expect(document.documentElement.dataset.locale).toBe("de");
      expect(document.documentElement.lang).toBe("de");
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(preference);
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
    },
  );

  it.each(["{Enter}", " "])(
    "opens with %s and returns focus on Escape",
    async (key) => {
      const user = userEvent.setup();
      renderControl();
      const trigger = screen.getByRole("button", {
        name: "Interface preferences",
      });

      trigger.focus();
      await user.keyboard(key);
      expect(
        screen.getByRole("dialog", { name: "Interface preferences" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /English/ })).toHaveFocus();

      await user.keyboard("{Escape}");
      expect(trigger).toHaveFocus();
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    },
  );

  it("closes on outside dismissal and returns focus", async () => {
    renderControl();
    const trigger = screen.getByRole("button", {
      name: "Interface preferences",
    });
    await openPanel();

    act(() => fireEvent.pointerDown(document.body));

    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("does not render on internal operator surfaces", () => {
    mockUsePathname.mockReturnValue("/internal/employers");
    renderControl();

    expect(
      screen.queryByRole("button", { name: "Interface preferences" }),
    ).toBeNull();
  });
});

describe("FloatingInterfacePreferences styles", () => {
  it("matches the approved placement, motion, and reduced-motion contracts", () => {
    expect(controlStyles).toContain("position: fixed");
    expect(controlStyles).toContain("width: 3rem");
    expect(controlStyles).toContain("height: 3rem");
    expect(controlStyles).toContain("env(safe-area-inset-bottom, 0px)");
    expect(controlStyles).toContain("--interface-preferences-bottom-clearance");
    expect(controlStyles).toContain("var(--duration-fast)");
    expect(controlStyles).toContain("translateY(0.375rem) scale(0.98)");
    expect(controlStyles).toContain("interface-preferences-panel-fade-in");
    expect(controlStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(controlStyles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(controlStyles).not.toMatch(/\brgba?\(/i);
  });
});
