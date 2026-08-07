import Link from "next/link";

import styles from "@/components/candidate-matches/candidate-matches.module.scss";
import { formatSubmittedAtUtc } from "@/lib/applications/application-confirmation";
import type { ApplicationInventoryRow } from "@/lib/applications/snapshot-schemas";
import { applicationStatusLabel } from "@/lib/applications/status";

type ApplicationInventoryCardProps = {
  application: ApplicationInventoryRow;
};

export function ApplicationInventoryCard({
  application,
}: ApplicationInventoryCardProps) {
  const titleId = `application-title-${application.id}`;
  const submittedAtLabel = formatSubmittedAtUtc(application.submitted_at);

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle} id={titleId}>
          {application.vacancy_snapshot.title}
        </h2>
      </div>

      <p className={styles.company}>
        {application.vacancy_snapshot.employer_display_name}
      </p>

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Location</dt>
          <dd className={styles.metaValue}>
            {application.vacancy_snapshot.city}
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Status</dt>
          <dd className={styles.metaValue}>
            {applicationStatusLabel(application.status)}
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Submitted</dt>
          <dd className={styles.metaValue}>
            {submittedAtLabel !== null ? (
              <time dateTime={application.submitted_at}>
                {submittedAtLabel}
              </time>
            ) : (
              application.submitted_at
            )}
          </dd>
        </div>
      </dl>

      <div className={styles.cardActions}>
        <Link
          className={styles.detailLink}
          href={`/candidate/applications/${application.id}`}
          aria-label={`View application: ${application.vacancy_snapshot.title}`}
        >
          View application
        </Link>
      </div>
    </article>
  );
}
