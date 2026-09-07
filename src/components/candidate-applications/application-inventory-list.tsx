"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { ApplicationInventoryCard } from "@/components/candidate-applications/application-inventory-card";
import styles from "@/components/candidate-applications/candidate-applications.module.scss";
import type { ApplicationInventoryRow } from "@/lib/applications/snapshot-schemas";

type ApplicationInventoryListProps = {
  active: ApplicationInventoryRow[];
  closed: ApplicationInventoryRow[];
};

/**
 * Renders two groups — Active and Closed — each in the database's own
 * `submitted_at desc, id asc` order (never re-sorted within a group). A
 * group's heading and `<section>` are omitted entirely when that group is
 * empty — an empty `active` array means no "Active" heading renders at all,
 * not "Active (0)".
 */
export function ApplicationInventoryList({
  active,
  closed,
}: ApplicationInventoryListProps) {
  const { t } = useLocale();
  return (
    <div className={styles.groups}>
      {active.length > 0 ? (
        <section
          className={styles.group}
          aria-label={t("candidate.applications.activeLabel")}
        >
          <h2 className={styles.groupHeading}>
            {t("candidate.applications.active")}
          </h2>
          <ul className={styles.list}>
            {active.map((application) => (
              <li key={application.id}>
                <ApplicationInventoryCard
                  application={application}
                  headingLevel="h3"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {closed.length > 0 ? (
        <section
          className={styles.group}
          aria-label={t("candidate.applications.closedLabel")}
        >
          <h2 className={styles.groupHeading}>
            {t("candidate.applications.closed")}
          </h2>
          <ul className={styles.list}>
            {closed.map((application) => (
              <li key={application.id}>
                <ApplicationInventoryCard
                  application={application}
                  emphasis="reduced"
                  headingLevel="h3"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link className={styles.findMoreLink} href="/candidate/matches">
        {t("candidate.applications.findMore")}
      </Link>
    </div>
  );
}
