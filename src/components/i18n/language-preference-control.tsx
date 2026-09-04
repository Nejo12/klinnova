"use client";

import { useId } from "react";

import { useLocale } from "@/components/i18n/locale-provider";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locale";

import styles from "./language-preference-control.module.scss";

export function LanguagePreferenceControl() {
  const { locale, setLocale, t } = useLocale();
  const descriptionId = useId();
  const name = useId();

  return (
    <fieldset className={styles.fieldset} aria-describedby={descriptionId}>
      <legend className={styles.legend}>{t("language.legend")}</legend>
      <p className={styles.hint} id={descriptionId}>
        {t("language.hint")}
      </p>
      <div className={styles.options}>
        {SUPPORTED_LOCALES.map((option) => (
          <label className={styles.option} key={option}>
            <input
              className={styles.input}
              type="radio"
              name={name}
              value={option}
              checked={locale === option}
              onChange={() => setLocale(option)}
            />
            <span className={styles.optionLabel}>
              {t(option === "en" ? "language.english" : "language.german")}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
