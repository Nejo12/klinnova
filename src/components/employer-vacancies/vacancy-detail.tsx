import Link from "next/link";

import { DeleteDraftForm } from "@/components/employer-vacancies/delete-draft-form";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { ReadinessChecklist } from "@/components/employer-vacancies/readiness-checklist";
import { VacancyLifecycleActions } from "@/components/employer-vacancies/vacancy-lifecycle-actions";
import { VacancyLifecycleStatus } from "@/components/employer-vacancies/vacancy-lifecycle-status";
import { EmployerRestrictedNotice } from "@/components/employer-shared/employer-restricted-notice";
import {
  SALARY_PERIOD_OPTIONS,
  WORK_FREQUENCY_OPTIONS,
  WORKPLACE_TYPE_OPTIONS,
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
  const salarySummary =
    vacancy.salaryAmountCents !== null && vacancy.salaryPeriod !== null
      ? `€${centsToEurString(vacancy.salaryAmountCents)} ${labelFromOptions(vacancy.salaryPeriod, SALARY_PERIOD_OPTIONS)}${vacancy.salaryIsGross === true ? " gross" : ""}`
      : "Not set";

  const editable =
    !suspended &&
    (vacancy.publicationState === "draft" ||
      vacancy.publicationState === "paused");

  return (
    <>
      <VacancyLifecycleStatus vacancy={vacancy} />

      {suspended ? (
        <EmployerRestrictedNotice message={EMPLOYER_RESTRICTED_ACTION} />
      ) : null}

      <p className={styles.actions}>
        {editable ? (
          <Link
            className={styles.button}
            href={`/employer/vacancies/${vacancy.id}/edit`}
          >
            Edit vacancy
          </Link>
        ) : null}
        <Link className={styles.linkButton} href="/employer/vacancies">
          Back to list
        </Link>
      </p>

      <dl className={styles.detailList}>
        <div>
          <dt>Title</dt>
          <dd>{vacancy.title}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{jobCategoryLabel(vacancy.jobCategory as JobCategoryCode)}</dd>
        </div>
        <div>
          <dt>Berlin public locality</dt>
          <dd>{vacancy.publicLocality ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Employer type</dt>
          <dd>
            {vacancy.employerType === "organisation"
              ? "Organisation"
              : "Private person"}
          </dd>
        </div>
        {vacancy.companyName !== null ? (
          <div>
            <dt>Company</dt>
            <dd>{vacancy.companyName}</dd>
          </div>
        ) : null}
        <div>
          <dt>Description</dt>
          <dd>{vacancy.description ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Workplace type</dt>
          <dd>
            {labelFromOptions(vacancy.workplaceType, WORKPLACE_TYPE_OPTIONS)}
          </dd>
        </div>
        <div>
          <dt>Work frequency</dt>
          <dd>
            {labelFromOptions(vacancy.workFrequency, WORK_FREQUENCY_OPTIONS)}
          </dd>
        </div>
        <div>
          <dt>Available from</dt>
          <dd>{vacancy.availableFrom ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Salary</dt>
          <dd>{salarySummary}</dd>
        </div>
        <div>
          <dt>CV required</dt>
          <dd>
            {vacancy.cvRequired === null
              ? "Not set"
              : vacancy.cvRequired
                ? "Yes"
                : "No"}
          </dd>
        </div>
        <div>
          <dt>Interview in English</dt>
          <dd>
            {vacancy.interviewEnglishOk === null
              ? "Not set"
              : vacancy.interviewEnglishOk
                ? "Yes"
                : "No"}
          </dd>
        </div>
        <div>
          <dt>Experience notes</dt>
          <dd>{vacancy.experienceNotes ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Language requirements</dt>
          <dd>
            {vacancy.languages.length === 0
              ? "None yet"
              : vacancy.languages
                  .map(
                    (language) =>
                      `${languageLabel(language.languageCode as LanguageCode)} (${languageProficiencyLabel(language.minProficiency as LanguageProficiencyCode)})`,
                  )
                  .join(", ")}
          </dd>
        </div>
      </dl>

      {vacancy.publicationState === "draft" ? (
        <ReadinessChecklist
          ready={vacancy.ready ?? false}
          checklist={vacancy.checklist}
          available={vacancy.readinessAvailable}
        />
      ) : null}

      {suspended ? null : (
        <VacancyLifecycleActions
          vacancyId={vacancy.id}
          publicationState={vacancy.publicationState}
          isEffectivelyExpired={vacancy.isEffectivelyExpired}
        />
      )}

      {!suspended && vacancy.publicationState === "draft" ? (
        <DeleteDraftForm vacancyId={vacancy.id} title={vacancy.title} />
      ) : null}
    </>
  );
}
