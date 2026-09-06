"use client";

import { usePathname } from "next/navigation";

import { useLocale } from "@/components/i18n/locale-provider";
import { Menu, type MenuItem } from "@/components/popover-menu/popover-menu";
import { ThemePreferenceIcon } from "@/components/theme/theme-preference-icon";
import { useThemePreference } from "@/components/theme/theme-provider";
import { THEME_PREFERENCES, type ThemePreference } from "@/lib/theme/theme";
import type { MessageKey } from "@/lib/i18n/messages";

import styles from "./floating-appearance-control.module.scss";

const LABEL_KEYS: Record<ThemePreference, MessageKey> = {
  system: "theme.system",
  light: "theme.light",
  dark: "theme.dark",
};

export function FloatingAppearanceControl() {
  const pathname = usePathname();
  const { preference, setPreference } = useThemePreference();
  const { t } = useLocale();

  if (pathname.startsWith("/internal")) {
    return null;
  }

  const items: readonly MenuItem[] = THEME_PREFERENCES.map((option) => ({
    id: option,
    label: (
      <span className={styles.optionLabel}>
        <span className={styles.optionIcon}>
          <ThemePreferenceIcon preference={option} />
        </span>
        {t(LABEL_KEYS[option])}
      </span>
    ),
    onSelect: () => setPreference(option),
    selected: preference === option,
    shortcut: preference === option ? "✓" : undefined,
  }));

  const currentLabel = t(LABEL_KEYS[preference]);

  return (
    <Menu
      className={styles.root}
      align="end"
      items={items}
      trigger={
        <button
          className={styles.trigger}
          type="button"
          aria-label={`${t("theme.legend")}: ${currentLabel}`}
        >
          <ThemePreferenceIcon preference={preference} />
        </button>
      }
    />
  );
}
