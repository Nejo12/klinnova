import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemePreferenceControl } from "@/components/theme/theme-preference-control";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_STORAGE_KEY } from "@/lib/theme/theme";

const listeners = new Set<(event: MediaQueryListEvent) => void>();
let systemPrefersDark = false;

function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(
      () =>
        ({
          matches: systemPrefersDark,
          media: "(prefers-color-scheme: dark)",
          onchange: null,
          addEventListener: (
            _type: string,
            listener: (event: MediaQueryListEvent) => void,
          ) => listeners.add(listener),
          removeEventListener: (
            _type: string,
            listener: (event: MediaQueryListEvent) => void,
          ) => listeners.delete(listener),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    ),
  });
}

function renderThemeControl() {
  return render(
    <ThemeProvider>
      <ThemePreferenceControl />
    </ThemeProvider>,
  );
}

describe("ThemeProvider and ThemePreferenceControl", () => {
  beforeEach(() => {
    listeners.clear();
    systemPrefersDark = false;
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-preference");
    document.documentElement.style.removeProperty("color-scheme");
    installMatchMedia();
  });

  it("hydrates from the preference stamped by the bootstrap script", async () => {
    document.documentElement.dataset.themePreference = "dark";
    document.documentElement.dataset.theme = "dark";

    renderThemeControl();

    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked(),
    );
  });

  it("persists an explicit choice and updates the effective theme", async () => {
    const user = userEvent.setup();
    document.documentElement.dataset.themePreference = "system";
    document.documentElement.dataset.theme = "light";

    renderThemeControl();
    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(document.documentElement.dataset.themePreference).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("resumes live operating-system changes when System is selected", async () => {
    const user = userEvent.setup();
    document.documentElement.dataset.themePreference = "dark";
    document.documentElement.dataset.theme = "dark";

    renderThemeControl();
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked(),
    );
    await user.click(screen.getByRole("radio", { name: "System" }));

    await waitFor(() => expect(listeners.size).toBeGreaterThan(0));

    systemPrefersDark = true;
    act(() => {
      for (const listener of listeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(document.documentElement.dataset.themePreference).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
  });
});
