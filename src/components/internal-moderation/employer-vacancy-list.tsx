import Link from "next/link";

import styles from "@/components/internal-verification/internal-verification.module.scss";
import { formatTimestamp } from "@/lib/internal/verification/format-timestamp";
import type { OperatorVacancyRow } from "@/lib/internal/moderation/load-employer-moderation";

type EmployerVacancyListProps = {
  employerProfileId: string;
  rows: OperatorVacancyRow[];
};

function publicationLabel(
  state: OperatorVacancyRow["publicationState"],
): string {
  switch (state) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "paused":
      return "Paused";
    case "filled":
      return "Filled";
    case "expired":
      return "Expired";
    case "withdrawn":
      return "Withdrawn";
  }
}

export function EmployerVacancyList({
  employerProfileId,
  rows,
}: EmployerVacancyListProps) {
  if (rows.length === 0) {
    return <p className={styles.empty}>This employer has no vacancies.</p>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>
          This employer&apos;s vacancies, most recently created first
        </caption>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Publication state</th>
            <th scope="col">Moderation</th>
            <th scope="col">Published</th>
            <th scope="col">
              <span className={styles.srOnly}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const publishedAt = formatTimestamp(row.publishedAt);
            return (
              <tr key={row.vacancyId}>
                <td>{row.title}</td>
                <td>{publicationLabel(row.publicationState)}</td>
                <td>
                  {row.moderated ? (
                    <span className={`${styles.badge} ${styles.badgeDanger}`}>
                      Moderated
                    </span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                      Not moderated
                    </span>
                  )}
                </td>
                <td>{publishedAt ?? "—"}</td>
                <td>
                  <Link
                    className={styles.linkButton}
                    href={`/internal/employers/${employerProfileId}/vacancies/${row.vacancyId}`}
                  >
                    View<span className={styles.srOnly}> {row.title}</span>
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
