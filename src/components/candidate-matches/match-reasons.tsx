"use client";

import { useLocale } from "@/components/i18n/locale-provider";

import { presentMatchReasons } from "@/lib/matching/present-reasons";
import type { MatchReason } from "@/lib/matching/types";

import styles from "./candidate-matches.module.scss";

type MatchReasonsProps = {
  reasons: readonly MatchReason[];
  labelledBy: string;
};

export function MatchReasons({ reasons, labelledBy }: MatchReasonsProps) {
  const { locale, t } = useLocale();
  const presented = presentMatchReasons(reasons, locale);
  if (presented.length === 0) {
    return null;
  }

  return (
    <>
      <h3 className={styles.reasonsHeading} id={labelledBy}>
        {t("candidate.matches.why")}
      </h3>
      <ul className={styles.reasons} aria-labelledby={labelledBy}>
        {presented.map((reason) => (
          <li key={reason.key} className={styles.reason}>
            {reason.text}
          </li>
        ))}
      </ul>
    </>
  );
}
