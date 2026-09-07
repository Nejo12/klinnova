"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

import type { ApplicationStatus } from "@/lib/applications/status";
import { APPLICATION_STATUS_CODES } from "@/lib/applications/status";

import styles from "./application-status-rail.module.scss";

const RAIL_NODE_LABELS: MessageKey[] = [
  "candidate.applications.submitted",
  "candidate.applications.inReview",
  "candidate.applications.shortlisted",
  "candidate.applications.decision",
] as const;

type ApplicationStatusRailProps = {
  status: ApplicationStatus;
};

export function ApplicationStatusRail({ status }: ApplicationStatusRailProps) {
  const { t } = useLocale();
  // Clamp the node index to the range [0, 3] to ensure accepted/rejected both map to the 4th node
  const currentNodeIndex = Math.min(
    APPLICATION_STATUS_CODES.indexOf(status),
    3,
  );

  return (
    <ol className={styles.rail}>
      {RAIL_NODE_LABELS.map((label, index) => (
        <li
          key={index}
          className={styles.node}
          aria-current={index === currentNodeIndex ? "step" : undefined}
          data-state={
            index < currentNodeIndex
              ? "complete"
              : index === currentNodeIndex
                ? "current"
                : "upcoming"
          }
        >
          <span className={styles.label}>{t(label)}</span>
          <span className={styles.marker} aria-hidden="true" />
        </li>
      ))}
    </ol>
  );
}
