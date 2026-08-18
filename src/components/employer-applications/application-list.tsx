import type { ReactNode } from "react";

import Link from "next/link";

import { EmployerEmptyState } from "@/components/employer-shared/employer-empty-state";
import { draftConsequence } from "@/components/employer-vacancies/vacancy-list";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { groupEmployerApplications } from "@/lib/employer/applications/group-applications";
import {
  APPLICATION_DRAFT_VACANCY_ACTION,
  APPLICATION_DRAFT_VACANCY_HEADING,
  APPLICATION_DRAFT_VACANCY_VISIBILITY_NOTE,
  APPLICATION_EMPTY_LIST,
  APPLICATION_EMPTY_LIST_SUPPORT,
  APPLICATION_NO_REVIEW_HEADING,
} from "@/lib/employer/applications/messages";
import { formatApplicationTimestamp } from "@/lib/employer/applications/format-timestamp";
import type { EmployerApplicationListRow } from "@/lib/employer/applications/schemas";
import { applicationStatusLabel } from "@/lib/employer/applications/status";
import type { VacancyLifecycleState } from "@/lib/employer/vacancies/load-employer-drafts";
import type { ReadinessChecklistItem } from "@/lib/employer/vacancies/readiness";
import {
  formatIsoCalendarDate,
  germanRequirementLabel,
  jobCategoryLabel,
} from "@/lib/matching/labels";

/**
 * The single vacancy an `?vacancy=` filter narrows the list to, resolved by
 * the page via a single-row lookup (`loadEmployerVacancy`) — only needed,
 * and only fetched by the caller, when the filtered result is empty (see
 * that page for why: the RPC rows themselves carry a vacancy title, but
 * there are no rows to read one from in that case). `title`/
 * `publicationState` are `null` when the lookup itself failed; `checklist`
 * is `[]` in that case too, which `draftConsequence` already treats as
 * "readiness unavailable."
 */
export type FilteredVacancyInfo = {
  id: string;
  title: string | null;
  publicationState: VacancyLifecycleState | null;
  checklist: ReadinessChecklistItem[];
};

type ApplicationListProps = {
  applications: EmployerApplicationListRow[];
  filteredVacancy?: FilteredVacancyInfo | null;
};

type ApplicationListGroupProps = {
  headingId: string;
  heading: string;
  rows: EmployerApplicationListRow[];
  emptyContent?: ReactNode;
};

/**
 * Renders `list_current_employer_applications` rows in the RPC's own
 * `submitted_at desc, application_id asc` order — never re-sorted here.
 * Rows are split into three groups (Needs review / Open / Decided) by
 * `groupEmployerApplications`. A row can legitimately render in both
 * "Needs review" and its status group — see that function's own doc.
 */
export function ApplicationList({
  applications,
  filteredVacancy = null,
}: ApplicationListProps) {
  if (applications.length === 0) {
    if (filteredVacancy !== null) {
      if (filteredVacancy.publicationState === "draft") {
        // The specific case of "no applications for this vacancy" where
        // the real reason is "still a draft" — the consequence sentence is
        // derived from this vacancy's own readiness checklist (same
        // function the vacancies list uses per-row), never a hardcoded
        // "pay and hours" claim that might not be true for this draft.
        const support = `${draftConsequence({ checklist: filteredVacancy.checklist })} ${APPLICATION_DRAFT_VACANCY_VISIBILITY_NOTE}`;
        return (
          <EmployerEmptyState
            headingId="applications-empty-heading"
            heading={APPLICATION_DRAFT_VACANCY_HEADING}
            support={support}
            actionHref={`/employer/vacancies/${filteredVacancy.id}/edit`}
            actionLabel={APPLICATION_DRAFT_VACANCY_ACTION}
          />
        );
      }
      return (
        <EmployerEmptyState
          headingId="applications-empty-heading"
          heading={
            filteredVacancy.title !== null
              ? `No applications for ${filteredVacancy.title}`
              : "No applications for this vacancy"
          }
          actionHref={`/employer/vacancies/${filteredVacancy.id}`}
          actionLabel="View vacancy"
        />
      );
    }
    return (
      <EmployerEmptyState
        headingId="applications-empty-heading"
        heading={APPLICATION_EMPTY_LIST}
        support={APPLICATION_EMPTY_LIST_SUPPORT}
        actionHref="/employer/vacancies"
        actionLabel="View vacancies"
      />
    );
  }

  const { needsReview, open, decided } =
    groupEmployerApplications(applications);

  // "Everything reviewed": nothing unopened, but applications are still
  // moving through review — distinct from the true empty-list case above.
  // `open.length` is the same in-memory array already computed above, not
  // a new count. No action link: the Open group it refers to is already
  // directly below on this same page.
  const needsReviewEmptyContent =
    needsReview.length === 0 && open.length > 0 ? (
      <p className={styles.support}>
        {APPLICATION_NO_REVIEW_HEADING} {open.length}{" "}
        {open.length === 1 ? "application is" : "applications are"} still open.
      </p>
    ) : null;

  return (
    <>
      <ApplicationListGroup
        headingId="needs-review-heading"
        heading={`Needs review (${needsReview.length})`}
        rows={needsReview}
        emptyContent={needsReviewEmptyContent}
      />
      <ApplicationListGroup
        headingId="open-heading"
        heading={`Open (${open.length})`}
        rows={open}
      />
      <ApplicationListGroup
        headingId="decided-heading"
        heading={`Decided (${decided.length})`}
        rows={decided}
      />
    </>
  );
}

function ApplicationListGroup({
  headingId,
  heading,
  rows,
  emptyContent = null,
}: ApplicationListGroupProps) {
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.sectionHeading}>
        {heading}
      </h2>
      {rows.length > 0 ? (
        <ul className={styles.list}>
          {rows.map((application) => (
            <ApplicationListRow
              key={application.application_id}
              application={application}
            />
          ))}
        </ul>
      ) : (
        emptyContent
      )}
    </section>
  );
}

function ApplicationListRow({
  application,
}: {
  application: EmployerApplicationListRow;
}) {
  return (
    <li className={styles.listItem}>
      <h3 className={styles.listTitle}>{application.candidate_display_name}</h3>
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
        <li>Status: {applicationStatusLabel(application.current_status)}</li>
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
  );
}
