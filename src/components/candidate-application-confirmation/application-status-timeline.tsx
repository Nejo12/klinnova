import { formatSubmittedAtUtc } from "@/lib/applications/application-confirmation";
import type { CandidateApplicationHistoryEntry } from "@/lib/applications/load-candidate-application-history";
import { applicationStatusLabel } from "@/lib/applications/status";

import styles from "./application-confirmation.module.scss";

type ApplicationStatusTimelineProps = {
  history: CandidateApplicationHistoryEntry[];
};

/**
 * Candidate-safe timeline — the history RPC returns only a status and a
 * timestamp per event, deliberately excluding the prior status, any
 * employer-authored explanation, and the identity of whoever made the
 * change. Every event therefore renders as a single status label, never a
 * from/to pair and never anything employer-authored.
 */
export function ApplicationStatusTimeline({
  history,
}: ApplicationStatusTimelineProps) {
  return (
    <section
      className={styles.section}
      aria-labelledby="confirmation-timeline-heading"
    >
      <h2 className={styles.sectionHeading} id="confirmation-timeline-heading">
        Status timeline
      </h2>
      <ul className={styles.timeline}>
        {history.map((entry, index) => {
          const occurredAtLabel = formatSubmittedAtUtc(entry.occurred_at);
          return (
            <li
              key={`${entry.to_status}-${entry.occurred_at}-${index}`}
              className={styles.timelineItem}
            >
              <p className={styles.timelineStatus}>
                {applicationStatusLabel(entry.to_status)}
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
