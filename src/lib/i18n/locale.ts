export const LOCALE_STORAGE_KEY = "klinnova-locale";

export const SUPPORTED_LOCALES = ["en", "de"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    SUPPORTED_LOCALES.some((locale) => locale === value)
  );
}

export function localeFromLanguageTag(value: unknown): Locale | null {
  if (typeof value !== "string") {
    return null;
  }

  const primaryTag = value.trim().toLowerCase().split("-")[0];
  return isLocale(primaryTag) ? primaryTag : null;
}

export function resolveLocale(
  explicitPreference: unknown,
  browserLanguages: readonly string[] = [],
): Locale {
  if (isLocale(explicitPreference)) {
    return explicitPreference;
  }

  for (const language of browserLanguages) {
    const locale = localeFromLanguageTag(language);
    if (locale !== null) {
      return locale;
    }
  }

  return DEFAULT_LOCALE;
}
