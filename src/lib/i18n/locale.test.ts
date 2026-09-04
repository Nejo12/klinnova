import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  isLocale,
  localeFromLanguageTag,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";

describe("interface locale contract", () => {
  it("keeps the supported locale vocabulary bounded", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "de"]);
    expect(DEFAULT_LOCALE).toBe("en");
    expect(isLocale("de")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });

  it("normalizes supported browser language tags", () => {
    expect(localeFromLanguageTag("de-DE")).toBe("de");
    expect(localeFromLanguageTag("EN-gb")).toBe("en");
    expect(localeFromLanguageTag("fr-FR")).toBeNull();
  });

  it("resolves explicit choice before browser preference and English fallback", () => {
    expect(resolveLocale("en", ["de-DE"])).toBe("en");
    expect(resolveLocale(null, ["fr-FR", "de-DE"])).toBe("de");
    expect(resolveLocale("invalid", ["fr-FR"])).toBe("en");
  });

  it("falls back to English when German copy is missing", () => {
    expect(translate("de", "footer.impressum")).toBe("Impressum");
  });
});
