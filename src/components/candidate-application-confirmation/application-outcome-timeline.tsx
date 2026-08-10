import { outcomeTypeLabel } from "@/lib/applications/outcome-type";
import type { CandidateApplicationOutcomeEntry } from "@/lib/applications/load-candidate-application-outcomes";
import { formatSubmittedAtUtc } from "@/lib/applications/application-confirmation";

import styles from "./application-confirmation.module.scss";

type ApplicationOutcomeTimelineProps = {
  outcomes: CandidateApplicationOutcomeEntry[];
};

/**
 * Candidate-safe outcome display (M5.1 Unit E, D-M5-22) — deliberately
 * separate from `ApplicationStatusTimeline`, never merged into the same
 * list. `applications.status` answers "where is this in the employer's
 * workflow"; this section answers "what real-world event actually
 * happened" — the founder's explicit conceptual separation. Renders only
 * `outcome_type`/`occurred_at`, exactly what
 * `candidate_application_outcomes` returns — no event id, no recorded/
 * voided metadata, no actor identity, because the RPC itself never returns
 * them. Only rendered by the caller when non-empty (see
 * `ApplicationConfirmationPage`) — most applications will have none of
 * these events for a long time under M5's modest targets, and an
 * always-visible empty section would be noise, not signal.
 */
export function ApplicationOutcomeTimeline({
  outcomes,
}: ApplicationOutcomeTimelineProps) {
  return (
    <section
      className={styles.section}
      aria-labelledby="confirmation-outcome-heading"
    >
      <h2 className={styles.sectionHeading} id="confirmation-outcome-heading">
        Interview and hire updates
      </h2>
      <ul className={styles.timeline}>
        {outcomes.map((entry, index) => {
          const occurredAtLabel = formatSubmittedAtUtc(entry.occurred_at);
          return (
            <li
              key={`${entry.outcome_type}-${entry.occurred_at}-${index}`}
              className={styles.timelineItem}
            >
              <p className={styles.timelineStatus}>
                {outcomeTypeLabel(entry.outcome_type)}
              </p>
              <time
                className={styles.timelineTime}
                dateTime={entry.occurred_at}
              >
                {occurredAtLabel ?? entry.occurred_at}
              </time>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
