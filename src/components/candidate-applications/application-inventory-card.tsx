import Link from "next/link";

import { ApplicationStatusRail } from "@/components/candidate-applications/application-status-rail";
import styles from "@/components/candidate-matches/candidate-matches.module.scss";
import { formatSubmittedAtUtc } from "@/lib/applications/application-confirmation";
import { candidateStatusDisplayLabel } from "@/lib/applications/candidate-status-labels";
import type { ApplicationInventoryRow } from "@/lib/applications/snapshot-schemas";

type ApplicationInventoryCardProps = {
  application: ApplicationInventoryRow;
  /** "reduced" de-emphasizes closed-group rows (background surface + typography weight, never color alone). */
  emphasis?: "default" | "reduced";
  /**
   * Heading level for the card title. Defaults to "h2" for a standalone
   * card. `ApplicationInventoryList` passes "h3" so cards nest correctly
   * under their own "Active"/"Closed" group `<h2>`.
   */
  headingLevel?: "h2" | "h3";
};

export function ApplicationInventoryCard({
  application,
  emphasis = "default",
  headingLevel = "h2",
}: ApplicationInventoryCardProps) {
  const titleId = `application-title-${application.id}`;
  const submittedAtLabel = formatSubmittedAtUtc(application.submitted_at);
  const cardClassName =
    emphasis === "reduced"
      ? `${styles.card} ${styles.cardReducedEmphasis}`
      : styles.card;
  const TitleTag = headingLevel;

  return (
    <article className={cardClassName} aria-labelledby={titleId}>
      <div className={styles.cardHeader}>
        <TitleTag className={styles.cardTitle} id={titleId}>
          {application.vacancy_snapshot.title}
        </TitleTag>
      </div>

      <p className={styles.company}>
        {application.vacancy_snapshot.employer_display_name}
      </p>

      <ApplicationStatusRail status={application.status} />

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Location</dt>
          <dd className={styles.metaValue}>
            {application.vacancy_snapshot.city}
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Status</dt>
          <dd
            className={styles.metaValue}
            data-testid="application-status-value"
          >
            {candidateStatusDisplayLabel(application.status)}
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
