import type { ThemePreference } from "@/lib/theme/theme";

type ThemePreferenceIconProps = {
  preference: ThemePreference;
};

export function ThemePreferenceIcon({ preference }: ThemePreferenceIconProps) {
  if (preference === "light") {
    return (
      <svg
        aria-hidden="true"
        data-theme-icon="light"
        focusable="false"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }

  if (preference === "dark") {
    return (
      <svg
        aria-hidden="true"
        data-theme-icon="dark"
        focusable="false"
        viewBox="0 0 24 24"
      >
        <path d="M20.2 15.6A8.5 8.5 0 0 1 8.4 3.8 8.5 8.5 0 1 0 20.2 15.6Z" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      data-theme-icon="system"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
