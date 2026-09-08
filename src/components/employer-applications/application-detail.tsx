"use client";

import Link from "next/link";

import { ApplicationIntroductionDisplay } from "@/components/application-introduction/application-introduction-display";
import { useLocale } from "@/components/i18n/locale-provider";

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
  const { locale, t } = useLocale();
  return (
    <>
      <p className={styles.detailBack}>
        <Link className={styles.backLink} href="/employer/applications">
          ← {t("employer.applications.back")}
        </Link>
      </p>

      <header className={styles.detailHeader}>
        <div className={styles.pageIntro}>
          <h1 className={styles.heading}>
            {application.candidate_display_name}
          </h1>
          <p className={styles.lead}>
            {application.vacancy_title} ·{" "}
            {t("employer.applications.submitted").toLocaleLowerCase(
              locale === "de" ? "de-DE" : "en-GB",
            )}{" "}
            {formatApplicationTimestamp(application.submitted_at, locale)}
          </p>
        </div>
        <span
          className={styles.statusBadge}
          data-status={application.current_status}
        >
          {applicationStatusLabel(application.current_status, locale)}
        </span>
      </header>

      <ApplicationIntroductionDisplay
        audience="employer"
        text={application.introduction_text}
      />

      <div className={styles.detailGrid}>
        <div className={styles.detailMain}>
          <section
            className={styles.section}
            aria-labelledby="applicant-heading"
          >
            <h2 id="applicant-heading" className={styles.sectionHeading}>
              {t("employer.applications.essentials")}
            </h2>
            {application.candidate_deleted ? (
              <>
                <dl className={styles.detailList}>
                  <div>
                    <dt>{t("employer.applications.name")}</dt>
                    <dd>{application.candidate_display_name}</dd>
                  </div>
                </dl>
                <p className={styles.support} role="status">
                  {locale === "de"
                    ? "Die Person hat ihr Konto gelöscht. Die für diese Bewerbung gespeicherten Angaben wurden entfernt."
                    : CANDIDATE_DATA_REMOVED}
                </p>
              </>
            ) : (
              <dl className={styles.detailList}>
                <div>
                  <dt>{t("employer.applications.matchedCategory")}</dt>
                  <dd>
                    {jobCategoryLabel(application.matched_job_category, locale)}
                  </dd>
                </div>
                <div>
                  <dt>{t("employer.applications.german")}</dt>
                  <dd>
                    {germanRequirementLabel(application.german_comfort, locale)}
                  </dd>
                </div>
                <div>
                  <dt>{t("employer.applications.languages")}</dt>
                  <dd>
                    {application.languages.length === 0
                      ? t("employer.applications.noneDeclared")
                      : application.languages
                          .map(
                            (language) =>
                              `${languageLabel(language.language_code, locale)} (${languageProficiencyLabel(language.proficiency, locale)})`,
                          )
                          .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt>{t("employer.applications.workPermission")}</dt>
                  <dd>
                    {application.work_authorisation_declared
                      ? t("employer.applications.declared")
                      : t("employer.applications.notDeclared")}
                  </dd>
                </div>
                <div>
                  <dt>{t("employer.applications.availableFrom")}</dt>
                  <dd>
                    {application.available_from === null
                      ? t("employer.vacancies.notSet")
                      : formatIsoCalendarDate(
                          application.available_from,
                          locale,
                        )}
                  </dd>
                </div>
                <div>
                  <dt>{t("employer.applications.availability")}</dt>
                  <dd>
                    {application.shift_preferences.length === 0
                      ? t("employer.applications.noneDeclared")
                      : application.shift_preferences
                          .map((code) => shiftLabel(code, locale))
                          .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt>{t("employer.applications.employmentTypes")}</dt>
                  <dd>
                    {application.employment_types.length === 0
                      ? t("employer.applications.noneDeclared")
                      : application.employment_types
                          .map((code) => employmentTypeLabel(code, locale))
                          .join(", ")}
                  </dd>
                </div>
              </dl>
            )}

            <ApplicationStatusHistory entries={application.status_history} />

            {application.employer_seen_at !== null ? (
              <p className={styles.support}>
                {t("employer.applications.firstOpened")}{" "}
                {formatApplicationTimestamp(
                  application.employer_seen_at,
                  locale,
                )}
              </p>
            ) : null}
          </section>
        </div>

        <aside
          className={styles.detailSide}
          aria-label={t("employer.applications.reviewLabel")}
        >
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
