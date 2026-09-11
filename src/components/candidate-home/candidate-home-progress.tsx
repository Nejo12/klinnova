"use client";

import Link from "next/link";
import { Progress } from "@nova-component/ui";

import { useLocale } from "@/components/i18n/locale-provider";

import styles from "@/app/candidate/page.module.scss";

type CandidateHomeProgressProps = {
  completeCount: number;
  totalGroups: number;
  essentialsValid: boolean;
  continueHref: string;
};

export function CandidateHomeProgress({
  completeCount,
  totalGroups,
  essentialsValid,
  continueHref,
}: CandidateHomeProgressProps) {
  const { locale, t } = useLocale();

  return (
    <>
      <p className={styles.lead}>
        {t(
          essentialsValid
            ? "candidate.home.readyLead"
            : "candidate.home.incompleteLead",
        )}
      </p>
      <section className={styles.section}>
        <div className={styles.progress}>
          <p className={styles.progressCaption}>
            {completeCount} {locale === "de" ? "von" : "of"} {totalGroups}{" "}
            {t("candidate.home.sectionsSaved")}.
          </p>
          <Progress
            value={completeCount}
            min={0}
            max={totalGroups}
            aria-label={t("candidate.home.progressLabel")}
          />
        </div>
        <Link className={styles.cta} href={continueHref}>
          {t(
            essentialsValid
              ? "candidate.home.review"
              : "candidate.home.continue",
          )}
        </Link>
      </section>
    </>
  );
}
