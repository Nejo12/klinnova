"use client";

import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { useLocale } from "@/components/i18n/locale-provider";
import { EMPLOYER_RESTRICTED_NOTICE } from "@/lib/employer/messages";

type EmployerRestrictedNoticeProps = {
  message?: string;
};

/**
 * Neutral, non-accusatory notice shown across employer-facing surfaces
 * while the account is suspended. Never renders the operator-authored
 * suspension reason, operator identity, or moderation history — the
 * accepted D-072 contract does not expose any of that to the employer.
 */
export function EmployerRestrictedNotice({
  message = EMPLOYER_RESTRICTED_NOTICE,
}: EmployerRestrictedNoticeProps) {
  const { locale } = useLocale();
  const localized =
    locale === "de"
      ? message ===
        "Applications are unavailable while your employer account is restricted."
        ? "Bewerbungen sind nicht verfügbar, solange Ihr Arbeitgeberkonto eingeschränkt ist."
        : message ===
            "Verification requests are unavailable while your employer account is restricted."
          ? "Verifizierungsanträge sind nicht verfügbar, solange Ihr Arbeitgeberkonto eingeschränkt ist."
          : message ===
              "This action is unavailable while your employer account is restricted."
            ? "Diese Aktion ist nicht verfügbar, solange Ihr Arbeitgeberkonto eingeschränkt ist."
            : "Ihr Arbeitgeberkonto ist vorübergehend eingeschränkt. Einige Arbeitgeberaktionen sind währenddessen nicht verfügbar."
      : message;
  return (
    <p className={styles.warning} role="status">
      {localized}
    </p>
  );
}
