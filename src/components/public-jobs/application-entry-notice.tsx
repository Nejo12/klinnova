import Link from "next/link";

import { APPLICATION_ENTRY_NOTICE } from "@/lib/public-jobs/messages";

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
  const href = authenticated
    ? "/candidate"
    : `/login?next=${encodeURIComponent(`/jobs/${vacancyId}`)}`;

  return (
    <section
      className={styles.section}
      aria-labelledby="application-entry-heading"
    >
      <h2 className={styles.sectionHeading} id="application-entry-heading">
        Apply
      </h2>
      <p>{APPLICATION_ENTRY_NOTICE}</p>
      <Link className={styles.cta} href={href}>
        {authenticated ? "Go to your candidate account" : "Sign in"}
      </Link>
    </section>
  );
}
