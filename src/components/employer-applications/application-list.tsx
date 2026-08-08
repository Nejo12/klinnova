import Link from "next/link";

import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { APPLICATION_EMPTY_LIST } from "@/lib/employer/applications/messages";
import { formatApplicationTimestamp } from "@/lib/employer/applications/format-timestamp";
import type { EmployerApplicationListRow } from "@/lib/employer/applications/schemas";
import { applicationStatusLabel } from "@/lib/employer/applications/status";
import {
  formatIsoCalendarDate,
  germanRequirementLabel,
  jobCategoryLabel,
} from "@/lib/matching/labels";

type ApplicationListProps = {
  applications: EmployerApplicationListRow[];
};

/**
 * Renders `list_current_employer_applications` rows in the RPC's own
 * `submitted_at desc, application_id asc` order — never re-sorted here.
 */
export function ApplicationList({ applications }: ApplicationListProps) {
  if (applications.length === 0) {
    return (
      <p className={styles.support} role="status">
        {APPLICATION_EMPTY_LIST}
      </p>
    );
  }

  return (
    <ul className={styles.list}>
      {applications.map((application) => (
        <li key={application.application_id} className={styles.listItem}>
          <h2 className={styles.listTitle}>
            {application.candidate_display_name}
          </h2>
          <ul className={styles.meta}>
            <li>Vacancy: {application.vacancy_title}</li>
            {application.candidate_deleted ? null : (
              <>
                <li>
                  Matched category: {jobCategoryLabel(application.job_category)}
                </li>
                <li>
                  German comfort:{" "}
                  {germanRequirementLabel(application.german_comfort)}
                </li>
                <li>
                  Available from:{" "}
                  {application.available_from === null
                    ? "Not set"
                    : formatIsoCalendarDate(application.available_from)}
                </li>
              </>
            )}
            <li>
              Status: {applicationStatusLabel(application.current_status)}
            </li>
            <li>
              Submitted: {formatApplicationTimestamp(application.submitted_at)}
            </li>
          </ul>
          <div className={styles.actions}>
            <Link
              className={styles.linkButton}
              href={`/employer/applications/${application.application_id}`}
            >
              Review
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
