import Link from "next/link";

import styles from "@/components/internal-verification/internal-verification.module.scss";
import { formatTimestamp } from "@/lib/internal/verification/format-timestamp";
import type { OperatorEmployerRow } from "@/lib/internal/moderation/load-employers";

type EmployerListProps = {
  rows: OperatorEmployerRow[];
};

function verificationLabel(
  state: OperatorEmployerRow["verificationState"],
): string {
  switch (state) {
    case "unverified":
      return "Unverified";
    case "pending":
      return "Pending";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    case "revoked":
      return "Revoked";
  }
}

export function EmployerList({ rows }: EmployerListProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>
          Employers, most recently created first
        </caption>
        <thead>
          <tr>
            <th scope="col">Employer</th>
            <th scope="col">Type</th>
            <th scope="col">Verification</th>
            <th scope="col">Onboarding</th>
            <th scope="col">Status</th>
            <th scope="col">Created</th>
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
            const createdAt = formatTimestamp(row.createdAt);

            return (
              <tr key={row.employerProfileId}>
                <td>{label}</td>
                <td>{typeLabel}</td>
                <td>{verificationLabel(row.verificationState)}</td>
                <td>{row.onboardingCompleted ? "Complete" : "Incomplete"}</td>
                <td>
                  {row.suspended ? (
                    <span className={`${styles.badge} ${styles.badgeDanger}`}>
                      Suspended
                    </span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                      Active
                    </span>
                  )}
                </td>
                <td>{createdAt ?? "—"}</td>
                <td>
                  <Link
                    className={styles.linkButton}
                    href={`/internal/employers/${row.employerProfileId}`}
                  >
                    View<span className={styles.srOnly}> {label}</span>
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
