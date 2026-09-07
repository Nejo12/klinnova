"use client";

import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./candidate-matches.module.scss";

type MatchCountProps = {
  count: number;
};

export function formatMatchCount(count: number): string {
  if (count === 1) {
    return "1 current role";
  }
  return `${count} current roles`;
}

export function MatchCount({ count }: MatchCountProps) {
  const { t } = useLocale();
  return (
    <p className={styles.count}>
      {count}{" "}
      {t(
        count === 1
          ? "candidate.matches.countOne"
          : "candidate.matches.countMany",
      )}
    </p>
  );
}
