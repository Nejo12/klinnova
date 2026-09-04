import Script from "next/script";

import { THEME_STORAGE_KEY } from "@/lib/theme/theme";

export const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  var root = document.documentElement;
  var preference = "system";

  try {
    var stored = window.localStorage.getItem("${THEME_STORAGE_KEY}");
    if (stored === "system" || stored === "light" || stored === "dark") {
      preference = stored;
    }
  } catch {}

  var prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  var theme =
    preference === "system" ? (prefersDark ? "dark" : "light") : preference;

  root.dataset.themePreference = preference;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
})();
`;

export function ThemeBootstrapScript() {
  return (
    <Script
      id="klinnova-theme-bootstrap"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
    />
  );
}
