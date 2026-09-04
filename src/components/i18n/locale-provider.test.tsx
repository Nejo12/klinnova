import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { LanguagePreferenceControl } from "@/components/i18n/language-preference-control";
import { LocaleProvider, useLocale } from "@/components/i18n/locale-provider";
import { LOCALE_STORAGE_KEY } from "@/lib/i18n/locale";

function Probe() {
  const { t } = useLocale();
  return <p>{t("shell.signIn")}</p>;
}

describe("LocaleProvider and LanguagePreferenceControl", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "en";
    document.documentElement.dataset.locale = "en";
  });

  it("hydrates from the locale stamped by the bootstrap script", async () => {
    document.documentElement.lang = "de";
    document.documentElement.dataset.locale = "de";

    render(
      <LocaleProvider>
        <Probe />
        <LanguagePreferenceControl />
      </LocaleProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("Anmelden")).toBeInTheDocument(),
    );
    expect(screen.getByRole("radio", { name: "Deutsch" })).toBeChecked();
  });

  it("persists an explicit choice and updates document language", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <Probe />
        <LanguagePreferenceControl />
      </LocaleProvider>,
    );

    await user.click(screen.getByRole("radio", { name: "Deutsch" }));

    expect(await screen.findByText("Anmelden")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("de");
    expect(document.documentElement.dataset.locale).toBe("de");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("de");
  });
});
