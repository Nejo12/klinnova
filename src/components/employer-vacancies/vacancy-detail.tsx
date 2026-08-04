import Link from "next/link";

import { DeleteDraftForm } from "@/components/employer-vacancies/delete-draft-form";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { ReadinessChecklist } from "@/components/employer-vacancies/readiness-checklist";
import type { EmployerDraftDetail } from "@/lib/employer/vacancies/load-employer-draft";
import {
  SALARY_PERIOD_OPTIONS,
  WORK_FREQUENCY_OPTIONS,
  WORKPLACE_TYPE_OPTIONS,
} from "@/lib/employer/vacancies/allow-lists";
import { centsToEurString } from "@/lib/employer/vacancies/salary";
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
  draft: EmployerDraftDetail;
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

export function VacancyDetail({ draft }: VacancyDetailProps) {
  const salarySummary =
    draft.salaryAmountCents !== null && draft.salaryPeriod !== null
      ? `€${centsToEurString(draft.salaryAmountCents)} ${labelFromOptions(draft.salaryPeriod, SALARY_PERIOD_OPTIONS)}${draft.salaryIsGross === true ? " gross" : ""}`
      : "Not set";

  return (
    <>
      <p className={styles.actions}>
        <Link
          className={styles.button}
          href={`/employer/vacancies/${draft.id}/edit`}
        >
          Edit draft
        </Link>
        <Link className={styles.linkButton} href="/employer/vacancies">
          Back to list
        </Link>
      </p>

      <p className={styles.readyBadge} role="status">
        Status: Private draft
      </p>

      <dl className={styles.detailList}>
        <div>
          <dt>Title</dt>
          <dd>{draft.title}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{jobCategoryLabel(draft.jobCategory as JobCategoryCode)}</dd>
        </div>
        <div>
          <dt>Berlin public locality</dt>
          <dd>{draft.publicLocality ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Employer type</dt>
          <dd>
            {draft.employerType === "organisation"
              ? "Organisation"
              : "Private person"}
          </dd>
        </div>
        {draft.companyName !== null ? (
          <div>
            <dt>Company</dt>
            <dd>{draft.companyName}</dd>
          </div>
        ) : null}
        <div>
          <dt>Description</dt>
          <dd>{draft.description ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Workplace type</dt>
          <dd>
            {labelFromOptions(draft.workplaceType, WORKPLACE_TYPE_OPTIONS)}
          </dd>
        </div>
        <div>
          <dt>Work frequency</dt>
          <dd>
            {labelFromOptions(draft.workFrequency, WORK_FREQUENCY_OPTIONS)}
          </dd>
        </div>
        <div>
          <dt>Available from</dt>
          <dd>{draft.availableFrom ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Salary</dt>
          <dd>{salarySummary}</dd>
        </div>
        <div>
          <dt>CV required</dt>
          <dd>
            {draft.cvRequired === null
              ? "Not set"
              : draft.cvRequired
                ? "Yes"
                : "No"}
          </dd>
        </div>
        <div>
          <dt>Interview in English</dt>
          <dd>
            {draft.interviewEnglishOk === null
              ? "Not set"
              : draft.interviewEnglishOk
                ? "Yes"
                : "No"}
          </dd>
        </div>
        <div>
          <dt>Experience notes</dt>
          <dd>{draft.experienceNotes ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Language requirements</dt>
          <dd>
            {draft.languages.length === 0
              ? "None yet"
              : draft.languages
                  .map(
                    (language) =>
                      `${languageLabel(language.languageCode as LanguageCode)} (${languageProficiencyLabel(language.minProficiency as LanguageProficiencyCode)})`,
                  )
                  .join(", ")}
          </dd>
        </div>
      </dl>

      <ReadinessChecklist
        ready={draft.ready}
        checklist={draft.checklist}
        available={draft.readinessAvailable}
      />

      <DeleteDraftForm vacancyId={draft.id} title={draft.title} />
    </>
  );
}
