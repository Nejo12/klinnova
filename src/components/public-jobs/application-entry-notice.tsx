"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./public-job-detail.module.scss";

type ApplicationEntryNoticeProps = {
  vacancyId: string;
  authenticated: boolean;
};

/**
 * Deliberately neutral: candidate matching/eligibility is not evaluated by
 * this PR (missing database contract — see build plan). Never implies
 * confirmed eligibility or an active apply action.
 */
export function ApplicationEntryNotice({
  vacancyId,
  authenticated,
}: ApplicationEntryNoticeProps) {
  const { t } = useLocale();
  const href = authenticated
    ? "/candidate"
    : `/login?next=${encodeURIComponent(`/jobs/${vacancyId}`)}`;

  return (
    <section
      className={styles.section}
      aria-labelledby="application-entry-heading"
    >
      <h2 className={styles.sectionHeading} id="application-entry-heading">
        {t("publicJobs.apply")}
      </h2>
      <p>{t("publicJobs.applyNotice")}</p>
      <Link className={styles.cta} href={href}>
        {t(authenticated ? "publicJobs.candidateAccount" : "publicJobs.signIn")}
      </Link>
    </section>
  );
}
