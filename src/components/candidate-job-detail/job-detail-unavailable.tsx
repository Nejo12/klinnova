"use client";

import { useLocale } from "@/components/i18n/locale-provider";

import Link from "next/link";

import styles from "./candidate-job-detail.module.scss";

export function JobDetailUnavailable() {
  const { t } = useLocale();
  const heading = t("candidate.jobs.unavailableHeading");
  const body = t("candidate.jobs.unavailableBody");

  return (
    <section className={styles.unavailable} aria-labelledby="job-unavailable">
      <h1 className={styles.unavailableHeading} id="job-unavailable">
        {heading}
      </h1>
      <p className={styles.unavailableBody}>{body}</p>
      <Link className={styles.cta} href="/candidate/matches">
        Back to matches
      </Link>
    </section>
  );
}
