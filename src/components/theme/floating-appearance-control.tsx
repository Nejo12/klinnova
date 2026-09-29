"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { useLocale } from "@/components/i18n/locale-provider";
import { InterfacePreferencesIcon } from "@/components/theme/interface-preferences-icon";
import { ThemePreferenceIcon } from "@/components/theme/theme-preference-icon";
import { useThemePreference } from "@/components/theme/theme-provider";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { THEME_PREFERENCES, type ThemePreference } from "@/lib/theme/theme";

import styles from "./floating-appearance-control.module.scss";

const PANEL_CLOSE_DURATION_MS = 160;

const LANGUAGE_LABEL_KEYS: Record<Locale, MessageKey> = {
  en: "language.english",
  de: "language.german",
};

const THEME_LABEL_KEYS: Record<ThemePreference, MessageKey> = {
  system: "theme.system",
  light: "theme.light",
  dark: "theme.dark",
};

export function FloatingInterfacePreferences() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();
  const { preference, setPreference } = useThemePreference();
  const [isOpen, setIsOpen] = useState(false);
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const languageButtonRefs = useRef<Record<Locale, HTMLButtonElement | null>>({
    en: null,
    de: null,
  });
  const panelId = useId();
  const headingId = useId();
  const descriptionId = useId();

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openPanel = useCallback(() => {
    clearCloseTimer();
    setIsPanelMounted(true);
    setIsOpen(true);
  }, [clearCloseTimer]);

  const closePanel = useCallback(
    (returnFocus: boolean) => {
      clearCloseTimer();
      setIsOpen(false);
      if (returnFocus) {
        triggerRef.current?.focus();
      }
      closeTimerRef.current = window.setTimeout(() => {
        setIsPanelMounted(false);
        closeTimerRef.current = null;
      }, PANEL_CLOSE_DURATION_MS);
    },
    [clearCloseTimer],
  );

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    languageButtonRefs.current[locale]?.focus();
  }, [isOpen, locale]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        closePanel(true);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel(true);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePanel, isOpen]);

  if (
    pathname.startsWith("/internal") ||
    pathname === "/employer" ||
    (pathname.startsWith("/employer/") && pathname !== "/employer/register")
  ) {
    return null;
  }

  return (
    <div className={styles.root} ref={rootRef}>
      {isPanelMounted ? (
        <section
          className={styles.panel}
          id={panelId}
          role="dialog"
          aria-labelledby={headingId}
          aria-describedby={descriptionId}
          aria-hidden={!isOpen}
          data-state={isOpen ? "open" : "closing"}
        >
          <h2 className={styles.heading} id={headingId}>
            {t("preferences.label")}
          </h2>
          <p className={styles.description} id={descriptionId}>
            {t("preferences.hint")}
          </p>

          <fieldset className={styles.group}>
            <legend className={styles.legend}>{t("language.legend")}</legend>
            <div className={styles.languageOptions}>
              {SUPPORTED_LOCALES.map((option) => {
                const selected = locale === option;
                return (
                  <button
                    key={option}
                    ref={(node) => {
                      languageButtonRefs.current[option] = node;
                    }}
                    className={styles.languageOption}
                    type="button"
                    aria-pressed={selected}
                    data-selected={selected ? "true" : undefined}
                    onClick={() => setLocale(option)}
                  >
                    <span>{t(LANGUAGE_LABEL_KEYS[option])}</span>
                    {selected ? (
                      <span className={styles.check} aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.legend}>{t("theme.legend")}</legend>
            <div className={styles.appearanceOptions}>
              {THEME_PREFERENCES.map((option) => {
                const selected = preference === option;
                return (
                  <button
                    key={option}
                    className={styles.appearanceOption}
                    type="button"
                    aria-pressed={selected}
                    data-selected={selected ? "true" : undefined}
                    onClick={() => setPreference(option)}
                  >
                    <span className={styles.optionIcon} aria-hidden="true">
                      <ThemePreferenceIcon preference={option} />
                    </span>
                    <span>{t(THEME_LABEL_KEYS[option])}</span>
                    {selected ? (
                      <span className={styles.check} aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </section>
      ) : null}

      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        aria-label={t("preferences.label")}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup="dialog"
        data-open={isOpen ? "true" : undefined}
        data-overlay-trigger=""
        onClick={() => {
          if (isOpen) {
            closePanel(false);
          } else {
            openPanel();
          }
        }}
      >
        <InterfacePreferencesIcon />
        <span className={styles.triggerLabel}>{t("preferences.label")}</span>
      </button>
    </div>
  );
}
