"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
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

const preferenceListeners = new Set<() => void>();

function subscribeToPreference(listener: () => void): () => void {
  preferenceListeners.add(listener);
  return () => preferenceListeners.delete(listener);
}

function emitPreferenceChange(): void {
  for (const listener of preferenceListeners) {
    listener();
  }
}

function readStampedPreference(): ThemePreference {
  if (typeof document === "undefined") {
    return "system";
  }

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
  const preference = useSyncExternalStore(
    subscribeToPreference,
    readStampedPreference,
    () => "system",
  );

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
    emitPreferenceChange();
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
