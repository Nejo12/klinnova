import { LOCALE_STORAGE_KEY } from "@/lib/i18n/locale";

export const LOCALE_BOOTSTRAP_SCRIPT = `
(function () {
  var root = document.documentElement;
  var locale = null;

  try {
    var stored = window.localStorage.getItem("${LOCALE_STORAGE_KEY}");
    if (stored === "en" || stored === "de") locale = stored;
  } catch {}

  if (locale === null) {
    var languages = Array.isArray(navigator.languages)
      ? navigator.languages
      : [navigator.language];
    for (var index = 0; index < languages.length; index += 1) {
      var primary = String(languages[index] || "")
        .toLowerCase()
        .split("-")[0];
      if (primary === "en" || primary === "de") {
        locale = primary;
        break;
      }
    }
  }

  if (locale === null) locale = "en";
  root.dataset.locale = locale;
  root.lang = locale;
})();
`;

export function LocaleBootstrapScript() {
  return (
    <script
      id="klinnova-locale-bootstrap"
      dangerouslySetInnerHTML={{ __html: LOCALE_BOOTSTRAP_SCRIPT }}
    />
  );
}
