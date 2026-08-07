import styles from "@/components/internal-verification/internal-verification.module.scss";
import { auditEventLabel } from "@/lib/internal/moderation/audit-event-label";
import { formatTimestamp } from "@/lib/internal/verification/format-timestamp";
import { AUDIT_HISTORY_EMPTY } from "@/lib/internal/moderation/messages";
import type { EmployerAuditEvent } from "@/lib/internal/moderation/load-employer-moderation";

type AuditTimelineProps = {
  events: EmployerAuditEvent[];
};

/**
 * Shared bounded audit-history rendering for both employer and vacancy
 * moderation detail. Never renders actor_user_id, raw event_type, target
 * UUIDs, or metadata — only the human-readable label, timestamp, and the
 * operator-authored reason when present.
 */
export function AuditTimeline({ events }: AuditTimelineProps) {
  if (events.length === 0) {
    return <p className={styles.empty}>{AUDIT_HISTORY_EMPTY}</p>;
  }

  return (
    <ol className={styles.timeline}>
      {events.map((event, index) => {
        const occurredAt = formatTimestamp(event.occurredAt);
        return (
          <li
            className={styles.timelineItem}
            key={`${event.eventType}-${event.occurredAt}-${index}`}
          >
            <p className={styles.timelineLabel}>
              {auditEventLabel(event.eventType)}
            </p>
            <p className={styles.timelineMeta}>{occurredAt ?? "—"}</p>
            {event.reason !== null ? (
              <p className={styles.timelineReason}>{event.reason}</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
