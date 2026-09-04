import { describe, expect, it } from "vitest";

import {
  isThemePreference,
  resolveTheme,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
} from "@/lib/theme/theme";

describe("theme contract", () => {
  it("keeps the persisted preference vocabulary bounded", () => {
    expect(THEME_PREFERENCES).toEqual(["system", "light", "dark"]);
    expect(THEME_STORAGE_KEY).toBe("klinnova-theme");
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("sepia")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it("resolves system from the operating-system preference", () => {
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("system", true)).toBe("dark");
  });

  it("keeps an explicit preference independent of the operating system", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
