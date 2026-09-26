"use client";

import Link from "next/link";

import { DeleteDraftForm } from "@/components/employer-vacancies/delete-draft-form";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { ReadinessChecklist } from "@/components/employer-vacancies/readiness-checklist";
import { VacancyLifecycleActions } from "@/components/employer-vacancies/vacancy-lifecycle-actions";
import { VacancyLifecycleStatus } from "@/components/employer-vacancies/vacancy-lifecycle-status";
import { EmployerRestrictedNotice } from "@/components/employer-shared/employer-restricted-notice";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  SALARY_PERIOD_OPTIONS,
  type WorkFrequencyCode,
  type WorkplaceTypeCode,
} from "@/lib/employer/vacancies/allow-lists";
import type { EmployerVacancyDetail } from "@/lib/employer/vacancies/load-employer-vacancy";
import { centsToEurString } from "@/lib/employer/vacancies/salary";
import { EMPLOYER_RESTRICTED_ACTION } from "@/lib/employer/messages";
import {
  jobCategoryLabel,
  languageLabel,
  languageProficiencyLabel,
} from "@/lib/matching/labels";
import type {
  JobCategoryCode,
  LanguageCode,
  LanguageProficiencyCode,
} from "@/lib/onboarding/allow-lists";
import {
  workplaceTypeLabel,
  workFrequencyLabel,
} from "@/lib/public-jobs/labels";

type VacancyDetailProps = {
  vacancy: EmployerVacancyDetail;
  suspended?: boolean;
};

function labelFromOptions(
  code: string | null,
  options: readonly { code: string; label: string }[],
): string {
  if (code === null) {
    return "Not set";
  }
  return options.find((option) => option.code === code)?.label ?? code;
}

export function VacancyDetail({
  vacancy,
  suspended = false,
}: VacancyDetailProps) {
  const { locale, t } = useLocale();
  const salarySummary =
    vacancy.salaryAmountCents !== null && vacancy.salaryPeriod !== null
      ? `€${centsToEurString(vacancy.salaryAmountCents)} ${locale === "de" ? ({ hourly: "pro Stunde", monthly: "pro Monat", fixed_job: "pauschal" } as const)[vacancy.salaryPeriod] : labelFromOptions(vacancy.salaryPeriod, SALARY_PERIOD_OPTIONS)}${vacancy.salaryIsGross === true ? (locale === "de" ? " brutto" : " gross") : ""}`
      : t("employer.vacancies.notSet");

  const editable =
    !suspended &&
    (vacancy.publicationState === "draft" ||
      vacancy.publicationState === "paused");
  const showDraftReadiness = vacancy.publicationState === "draft";

  return (
    <>
      <VacancyLifecycleStatus vacancy={vacancy} />

      {suspended ? (
        <EmployerRestrictedNotice message={EMPLOYER_RESTRICTED_ACTION} />
      ) : null}

      {showDraftReadiness ? (
        <ReadinessChecklist
          ready={vacancy.ready ?? false}
          checklist={vacancy.checklist}
          available={vacancy.readinessAvailable}
          continueHref={
            editable ? `/employer/vacancies/${vacancy.id}/edit` : undefined
          }
        />
      ) : null}

      {editable && !showDraftReadiness ? (
        <p className={styles.actions}>
          <Link
            className={styles.button}
            href={`/employer/vacancies/${vacancy.id}/edit`}
          >
            {t("employer.vacancies.edit")}
          </Link>
        </p>
      ) : null}

      {suspended ||
      (showDraftReadiness &&
        (!vacancy.ready || !vacancy.readinessAvailable)) ? null : (
        <VacancyLifecycleActions
          vacancyId={vacancy.id}
          publicationState={vacancy.publicationState}
          isEffectivelyExpired={vacancy.isEffectivelyExpired}
        />
      )}

      <dl className={styles.detailList}>
        <div>
          <dt>{t("employer.vacancies.title")}</dt>
          <dd>{vacancy.title}</dd>
        </div>
        <div>
          <dt>{t("employer.vacancies.category")}</dt>
          <dd>
            {jobCategoryLabel(vacancy.jobCategory as JobCategoryCode, locale)}
          </dd>
        </div>
        <div>
          <dt>{t("employer.vacancies.locality")}</dt>
          <dd>{vacancy.publicLocality ?? t("employer.vacancies.notSet")}</dd>
        </div>
        <div>
          <dt>{locale === "de" ? "Arbeitgeberart" : "Employer type"}</dt>
          <dd>
            {vacancy.employerType === "organisation"
              ? t("employer.onboarding.organisation")
              : t("employer.onboarding.private")}
          </dd>
        </div>
        {vacancy.companyName !== null ? (
          <div>
            <dt>{locale === "de" ? "Unternehmen" : "Company"}</dt>
            <dd>{vacancy.companyName}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t("employer.vacancies.description")}</dt>
          <dd>{vacancy.description ?? t("employer.vacancies.notSet")}</dd>
        </div>
        <div>
          <dt>{t("employer.vacancies.workplaceType")}</dt>
          <dd>
            {vacancy.workplaceType === null
              ? t("employer.vacancies.notSet")
              : workplaceTypeLabel(
                  vacancy.workplaceType as WorkplaceTypeCode,
                  locale,
                )}
          </dd>
        </div>
        <div>
          <dt>{t("employer.vacancies.workFrequency")}</dt>
          <dd>
            {vacancy.workFrequency === null
              ? t("employer.vacancies.notSet")
              : workFrequencyLabel(
                  vacancy.workFrequency as WorkFrequencyCode,
                  locale,
                )}
          </dd>
        </div>
        <div>
          <dt>{t("employer.vacancies.availableFrom")}</dt>
          <dd>{vacancy.availableFrom ?? t("employer.vacancies.notSet")}</dd>
        </div>
        <div>
          <dt>{t("employer.vacancies.salary")}</dt>
          <dd>{salarySummary}</dd>
        </div>
        <div>
          <dt>{t("employer.vacancies.cvRequired")}</dt>
          <dd>
            {vacancy.cvRequired === null
              ? t("employer.vacancies.notSet")
              : vacancy.cvRequired
                ? t("employer.vacancies.yes")
                : t("employer.vacancies.no")}
          </dd>
        </div>
        <div>
          <dt>{t("employer.vacancies.interviewEnglish")}</dt>
          <dd>
            {vacancy.interviewEnglishOk === null
              ? t("employer.vacancies.notSet")
              : vacancy.interviewEnglishOk
                ? t("employer.vacancies.yes")
                : t("employer.vacancies.no")}
          </dd>
        </div>
        <div>
          <dt>{t("employer.vacancies.experienceNotes")}</dt>
          <dd>{vacancy.experienceNotes ?? t("employer.vacancies.notSet")}</dd>
        </div>
        <div>
          <dt>{t("employer.vacancies.languages")}</dt>
          <dd>
            {vacancy.languages.length === 0
              ? t("employer.vacancies.noneYet")
              : vacancy.languages
                  .map(
                    (language) =>
                      `${languageLabel(language.languageCode as LanguageCode, locale)} (${languageProficiencyLabel(language.minProficiency as LanguageProficiencyCode, locale)})`,
                  )
                  .join(", ")}
          </dd>
        </div>
      </dl>

      {!suspended && vacancy.publicationState === "draft" ? (
        <DeleteDraftForm vacancyId={vacancy.id} title={vacancy.title} />
      ) : null}
    </>
  );
}
