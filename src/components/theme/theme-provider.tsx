"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme/theme";

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const defaultThemePreferenceContext: ThemePreferenceContextValue = {
  preference: "system",
  setPreference: () => undefined,
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue>(
  defaultThemePreferenceContext,
);

function readStampedPreference(): ThemePreference {
  const preference = document.documentElement.dataset.themePreference;
  return isThemePreference(preference) ? preference : "system";
}

function prefersDarkTheme(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function applyThemePreference(preference: ThemePreference): void {
  const theme = resolveTheme(preference, prefersDarkTheme());
  const root = document.documentElement;

  root.dataset.themePreference = preference;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function persistThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Browser privacy settings or storage limits must not block theming.
  }
}

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>("system");

  useEffect(() => {
    setPreferenceState(readStampedPreference());
  }, []);

  useEffect(() => {
    if (readStampedPreference() !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyThemePreference("system");

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [preference]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    applyThemePreference(nextPreference);
    persistThemePreference(nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference }),
    [preference, setPreference],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue {
  return useContext(ThemePreferenceContext);
}
