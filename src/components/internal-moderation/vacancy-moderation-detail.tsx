import styles from "@/components/internal-verification/internal-verification.module.scss";
import { AuditTimeline } from "@/components/internal-moderation/audit-timeline";
import { VacancyModerationActions } from "@/components/internal-moderation/vacancy-moderation-actions";
import { formatTimestamp } from "@/lib/internal/verification/format-timestamp";
import type { VacancyModerationDetail as VacancyModerationDetailData } from "@/lib/internal/moderation/load-vacancy-moderation";

function publicationLabel(
  state: VacancyModerationDetailData["publicationState"],
): string {
  switch (state) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "paused":
      return "Paused";
    case "filled":
      return "Filled";
    case "expired":
      return "Expired";
    case "withdrawn":
      return "Withdrawn";
  }
}

type VacancyModerationDetailProps = {
  vacancy: VacancyModerationDetailData;
};

export function VacancyModerationDetail({
  vacancy,
}: VacancyModerationDetailProps) {
  const moderatedAt = formatTimestamp(vacancy.moderatedAt);

  return (
    <>
      <section className={styles.panel} aria-labelledby="vacancy-status">
        <h2 className={styles.label} id="vacancy-status">
          Status
        </h2>
        <dl className={styles.detailList}>
          <dt>Title</dt>
          <dd>{vacancy.title}</dd>

          <dt>Publication state</dt>
          <dd>{publicationLabel(vacancy.publicationState)}</dd>
        </dl>
      </section>

      <section className={styles.panel} aria-labelledby="vacancy-moderation">
        <h2 className={styles.label} id="vacancy-moderation">
          Moderation
        </h2>
        {vacancy.moderated ? (
          <>
            <p className={styles.lead}>
              <span className={`${styles.badge} ${styles.badgeDanger}`}>
                Moderated
              </span>
              {moderatedAt !== null ? ` since ${moderatedAt}` : null}
            </p>
            {vacancy.moderatedReason !== null ? (
              <dl className={styles.detailList}>
                <dt>Reason</dt>
                <dd>{vacancy.moderatedReason}</dd>
              </dl>
            ) : null}
            <p className={styles.notice}>
              Moderation removes this vacancy from effective-public discovery
              without changing its employer-controlled publication state.
            </p>
          </>
        ) : (
          <p className={styles.lead}>
            <span className={`${styles.badge} ${styles.badgeNeutral}`}>
              Not moderated
            </span>
          </p>
        )}
        <VacancyModerationActions
          employerProfileId={vacancy.employerProfileId}
          vacancyId={vacancy.vacancyId}
          moderated={vacancy.moderated}
        />
      </section>

      <section className={styles.panel} aria-labelledby="vacancy-audit">
        <h2 className={styles.label} id="vacancy-audit">
          Audit history
        </h2>
        <AuditTimeline events={vacancy.auditEvents} />
      </section>
    </>
  );
}
