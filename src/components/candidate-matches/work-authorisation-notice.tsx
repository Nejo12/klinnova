"use client";

import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./candidate-matches.module.scss";

export const WORK_AUTHORISATION_NOTICE =
  "Matches are shown using the work-authorisation declaration you provided during onboarding. Klinnova has not verified documents.";

export function WorkAuthorisationNotice() {
  const { t } = useLocale();
  return (
    <p className={styles.notice}>{t("candidate.matches.workAuthorisation")}</p>
  );
}
