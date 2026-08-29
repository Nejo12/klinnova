import Link from "next/link";

import { ApplicationOutcomeHistory } from "@/components/employer-applications/application-outcome-history";
import { ApplicationStatusActions } from "@/components/employer-applications/application-status-actions";
import { ApplicationStatusHistory } from "@/components/employer-applications/application-status-history";
import styles from "@/components/employer-applications/employer-applications.module.scss";
import { RecordOutcomeForm } from "@/components/employer-applications/record-outcome-form";
import { formatApplicationTimestamp } from "@/lib/employer/applications/format-timestamp";
import type { EmployerApplicationDetailReady } from "@/lib/employer/applications/load-employer-application";
import { CANDIDATE_DATA_REMOVED } from "@/lib/employer/applications/messages";
import type { EmployerOutcomeEventRow } from "@/lib/employer/applications/schemas";
import { applicationStatusLabel } from "@/lib/employer/applications/status";
import {
  employmentTypeLabel,
  formatIsoCalendarDate,
  germanRequirementLabel,
  jobCategoryLabel,
  languageLabel,
  languageProficiencyLabel,
  shiftLabel,
} from "@/lib/matching/labels";

type ApplicationDetailProps = {
  application: EmployerApplicationDetailReady;
  outcomes: EmployerOutcomeEventRow[] | null;
  todayIso: string;
};

export function ApplicationDetail({
  application,
  outcomes,
  todayIso,
}: ApplicationDetailProps) {
  return (
    <>
      <p className={styles.detailBack}>
        <Link className={styles.backLink} href="/employer/applications">
          ← Back to applications
        </Link>
      </p>

      <header className={styles.detailHeader}>
        <div className={styles.pageIntro}>
          <h1 className={styles.heading}>
            {application.candidate_display_name}
          </h1>
          <p className={styles.lead}>
            {application.vacancy_title} · submitted{" "}
            {formatApplicationTimestamp(application.submitted_at)}
          </p>
        </div>
        <span
          className={styles.statusBadge}
          data-status={application.current_status}
        >
          {applicationStatusLabel(application.current_status)}
        </span>
      </header>

      <div className={styles.detailGrid}>
        <div className={styles.detailMain}>
          <section
            className={styles.section}
            aria-labelledby="applicant-heading"
          >
            <h2 id="applicant-heading" className={styles.sectionHeading}>
              Applicant essentials
            </h2>
            {application.candidate_deleted ? (
              <>
                <dl className={styles.detailList}>
                  <div>
                    <dt>Name</dt>
                    <dd>{application.candidate_display_name}</dd>
                  </div>
                </dl>
                <p className={styles.support} role="status">
                  {CANDIDATE_DATA_REMOVED}
                </p>
              </>
            ) : (
              <dl className={styles.detailList}>
                <div>
                  <dt>Matched category</dt>
                  <dd>{jobCategoryLabel(application.matched_job_category)}</dd>
                </div>
                <div>
                  <dt>German comfort</dt>
                  <dd>{germanRequirementLabel(application.german_comfort)}</dd>
                </div>
                <div>
                  <dt>Languages</dt>
                  <dd>
                    {application.languages.length === 0
                      ? "None declared"
                      : application.languages
                          .map(
                            (language) =>
                              `${languageLabel(language.language_code)} (${languageProficiencyLabel(language.proficiency)})`,
                          )
                          .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt>Work permission</dt>
                  <dd>
                    {application.work_authorisation_declared
                      ? "Declared"
                      : "Not declared"}
                  </dd>
                </div>
                <div>
                  <dt>Available from</dt>
                  <dd>
                    {application.available_from === null
                      ? "Not set"
                      : formatIsoCalendarDate(application.available_from)}
                  </dd>
                </div>
                <div>
                  <dt>Availability</dt>
                  <dd>
                    {application.shift_preferences.length === 0
                      ? "None declared"
                      : application.shift_preferences
                          .map((code) => shiftLabel(code))
                          .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt>Employment types</dt>
                  <dd>
                    {application.employment_types.length === 0
                      ? "None declared"
                      : application.employment_types
                          .map((code) => employmentTypeLabel(code))
                          .join(", ")}
                  </dd>
                </div>
              </dl>
            )}

            <ApplicationStatusHistory entries={application.status_history} />

            {application.employer_seen_at !== null ? (
              <p className={styles.support}>
                First opened{" "}
                {formatApplicationTimestamp(application.employer_seen_at)}
              </p>
            ) : null}
          </section>
        </div>

        <aside className={styles.detailSide} aria-label="Application review">
          <ApplicationStatusActions
            key={`${application.application_id}-${application.current_status}`}
            applicationId={application.application_id}
            currentStatus={application.current_status}
            allowedTransitions={application.allowed_transitions}
          />
        </aside>
      </div>

      <div className={styles.outcomeGrid}>
        <ApplicationOutcomeHistory
          applicationId={application.application_id}
          outcomes={outcomes}
        />

        <RecordOutcomeForm
          applicationId={application.application_id}
          todayIso={todayIso}
        />
      </div>
    </>
  );
}
