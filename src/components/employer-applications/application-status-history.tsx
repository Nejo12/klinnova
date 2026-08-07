import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { formatApplicationTimestamp } from "@/lib/employer/applications/format-timestamp";
import type { EmployerApplicationStatusHistoryEntry } from "@/lib/employer/applications/schemas";
import { applicationStatusLabel } from "@/lib/employer/applications/status";

type ApplicationStatusHistoryProps = {
  entries: EmployerApplicationStatusHistoryEntry[];
};

/**
 * The initial event (`from_status === null`) renders as a single
 * "Submitted" entry, never as "null → submitted". Never renders actor
 * identity — the RPC never returns it (D-070).
 */
export function ApplicationStatusHistory({
  entries,
}: ApplicationStatusHistoryProps) {
  return (
    <section
      className={styles.section}
      aria-labelledby="status-history-heading"
    >
      <h2 id="status-history-heading" className={styles.sectionHeading}>
        Status history
      </h2>
      <ul className={styles.list}>
        {entries.map((entry, index) => (
          <li
            key={`${entry.to_status}-${entry.occurred_at}-${index}`}
            className={styles.listItem}
          >
            <p className={styles.listTitle}>
              {entry.from_status === null
                ? applicationStatusLabel(entry.to_status)
                : `${applicationStatusLabel(entry.from_status)} → ${applicationStatusLabel(entry.to_status)}`}
            </p>
            <ul className={styles.meta}>
              <li>{formatApplicationTimestamp(entry.occurred_at)}</li>
              {entry.reason !== null ? <li>Reason: {entry.reason}</li> : null}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
