"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import styles from "@/components/employer-applications/employer-applications.module.scss";
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
  const { locale } = useLocale();
  return (
    <section
      className={styles.historyBlock}
      aria-labelledby="status-history-heading"
    >
      <h2 id="status-history-heading" className={styles.sectionHeading}>
        {locale === "de" ? "Statusverlauf" : "Status history"}
      </h2>
      <ul className={styles.historyList}>
        {entries.map((entry, index) => (
          <li
            key={`${entry.to_status}-${entry.occurred_at}-${index}`}
            className={styles.historyItem}
          >
            <p className={styles.historyTitle}>
              {entry.from_status === null
                ? applicationStatusLabel(entry.to_status, locale)
                : `${applicationStatusLabel(entry.from_status, locale)} → ${applicationStatusLabel(entry.to_status, locale)}`}
            </p>
            <ul className={styles.meta}>
              <li>{formatApplicationTimestamp(entry.occurred_at, locale)}</li>
              {entry.reason !== null ? (
                <li>
                  {locale === "de" ? "Grund" : "Reason"}: {entry.reason}
                </li>
              ) : null}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
