import type { ApplicationStatus } from "@/lib/applications/status";
import { APPLICATION_STATUS_CODES } from "@/lib/applications/status";

import styles from "./application-status-rail.module.scss";

const RAIL_NODE_LABELS = [
  "Submitted",
  "In review",
  "Shortlisted",
  "Decision",
] as const;

type ApplicationStatusRailProps = {
  status: ApplicationStatus;
};

export function ApplicationStatusRail({ status }: ApplicationStatusRailProps) {
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
        >
          <div
            className={styles.dot}
            data-state={index <= currentNodeIndex ? "complete" : "upcoming"}
          />
          <span className={styles.label}>{label}</span>
        </li>
      ))}
    </ol>
  );
}
