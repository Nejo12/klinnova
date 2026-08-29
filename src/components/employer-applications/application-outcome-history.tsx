import { VoidOutcomeButton } from "@/components/employer-applications/void-outcome-button";
import styles from "@/components/employer-applications/employer-applications.module.scss";
import { outcomeTypeLabel } from "@/lib/applications/outcome-type";
import { formatApplicationTimestamp } from "@/lib/employer/applications/format-timestamp";
import { OUTCOME_EMPTY_HISTORY } from "@/lib/employer/applications/messages";
import type { EmployerOutcomeEventRow } from "@/lib/employer/applications/schemas";

type ApplicationOutcomeHistoryProps = {
  applicationId: string;
  /** `null` signals the read failed — rendered as a small inline notice,
   * never a whole-page failure (fail-soft, per review). */
  outcomes: EmployerOutcomeEventRow[] | null;
};

/**
 * Employer-visible outcome history (M5.1 Unit E, D-M5-22) — includes both
 * active and voided events, so a correction can be seen in context, exactly
 * as `employer_application_outcomes` returns them. Never renders
 * `recorded_by`/`voided_by` — the RPC itself omits them (always the calling
 * employer in this single-actor-per-account product), so there is nothing
 * to accidentally leak here.
 */
export function ApplicationOutcomeHistory({
  applicationId,
  outcomes,
}: ApplicationOutcomeHistoryProps) {
  return (
    <section
      className={styles.section}
      aria-labelledby="outcome-history-heading"
    >
      <h2 id="outcome-history-heading" className={styles.sectionHeading}>
        Interview and hire history
      </h2>

      {outcomes === null ? (
        <p className={styles.support} role="status">
          Could not load outcome history.
        </p>
      ) : outcomes.length === 0 ? (
        <p className={styles.support}>{OUTCOME_EMPTY_HISTORY}</p>
      ) : (
        <ul className={styles.list}>
          {outcomes.map((entry) => (
            <li key={entry.outcome_event_id} className={styles.listItem}>
              <p className={styles.listTitle}>
                {outcomeTypeLabel(entry.outcome_type)}
                {entry.voided_at !== null ? " — Voided" : ""}
              </p>
              <ul className={styles.meta}>
                <li>
                  Occurred {formatApplicationTimestamp(entry.occurred_at)}
                </li>
                <li>
                  Recorded {formatApplicationTimestamp(entry.recorded_at)}
                </li>
                {entry.voided_at !== null ? (
                  <li>Voided {formatApplicationTimestamp(entry.voided_at)}</li>
                ) : null}
              </ul>
              {entry.voided_at === null ? (
                <VoidOutcomeButton
                  applicationId={applicationId}
                  outcomeEventId={entry.outcome_event_id}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
