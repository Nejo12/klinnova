import Link from "next/link";

import styles from "@/components/internal-verification/internal-verification.module.scss";
import { formatTimestamp } from "@/lib/internal/verification/format-timestamp";
import type { PendingVerificationRow } from "@/lib/internal/verification/load-pending-queue";

type PendingVerificationListProps = {
  rows: PendingVerificationRow[];
};

export function PendingVerificationList({
  rows,
}: PendingVerificationListProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>
          Pending employer verification requests, oldest first
        </caption>
        <thead>
          <tr>
            <th scope="col">Employer</th>
            <th scope="col">Type</th>
            <th scope="col">Requested</th>
            <th scope="col">
              <span className={styles.srOnly}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const label =
              row.displayName ?? row.companyName ?? "Unnamed employer";
            const typeLabel =
              row.employerType === "organisation"
                ? (row.companyName ?? "Organisation")
                : "Private";
            const requestedAt = formatTimestamp(row.verificationRequestedAt);

            return (
              <tr key={row.employerProfileId}>
                <td>{label}</td>
                <td>{typeLabel}</td>
                <td>{requestedAt ?? "—"}</td>
                <td>
                  <Link
                    className={styles.linkButton}
                    href={`/internal/verification/${row.employerProfileId}`}
                  >
                    Review<span className={styles.srOnly}> {label}</span>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
