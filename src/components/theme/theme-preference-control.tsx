"use client";

import { useId } from "react";

import { useThemePreference } from "@/components/theme/theme-provider";
import {
  THEME_PREFERENCES,
  type ThemePreference,
} from "@/lib/theme/theme";

import styles from "./theme-preference-control.module.scss";

const LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function ThemePreferenceControl() {
  const { preference, setPreference } = useThemePreference();
  const descriptionId = useId();
  const name = useId();

  return (
    <fieldset className={styles.fieldset} aria-describedby={descriptionId}>
      <legend className={styles.legend}>Appearance</legend>
      <p className={styles.hint} id={descriptionId}>
        Use your device setting or choose a theme for this browser.
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
            <span className={styles.optionLabel}>{LABELS[option]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
