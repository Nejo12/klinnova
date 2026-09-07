"use client";

import { useId } from "react";

import { useLocale } from "@/components/i18n/locale-provider";
import { useThemePreference } from "@/components/theme/theme-provider";
import { THEME_PREFERENCES, type ThemePreference } from "@/lib/theme/theme";
import type { MessageKey } from "@/lib/i18n/messages";

import styles from "./theme-preference-control.module.scss";

const LABEL_KEYS: Record<ThemePreference, MessageKey> = {
  system: "theme.system",
  light: "theme.light",
  dark: "theme.dark",
};

export function ThemePreferenceControl() {
  const { preference, setPreference } = useThemePreference();
  const { t } = useLocale();
  const descriptionId = useId();
  const name = useId();

  return (
    <fieldset className={styles.fieldset} aria-describedby={descriptionId}>
      <legend className={styles.legend}>{t("theme.legend")}</legend>
      <p className={styles.hint} id={descriptionId}>
        {t("theme.hint")}lllll------
      </p>
      <div className={styles.options}>
        {THEME_PREFERENCES.map((option) => (
          <label className={styles.option} key={option}>
            <input
              className={styles.input}
              type="radio"
              name={name}
              value={option}
              checked={preference === option}
              onChange={() => setPreference(option)}
            />
            <span className={styles.optionLabel}>{t(LABEL_KEYS[option])}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
