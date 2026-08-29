import type { ReactNode } from "react";

import Link from "next/link";

import { EmployerEmptyState } from "@/components/employer-shared/employer-empty-state";
import { draftConsequence } from "@/components/employer-vacancies/vacancy-list";
import styles from "@/components/employer-applications/employer-applications.module.scss";
import { groupEmployerApplications } from "@/lib/employer/applications/group-applications";
import {
  APPLICATION_DRAFT_VACANCY_ACTION,
  APPLICATION_DRAFT_VACANCY_HEADING,
  APPLICATION_DRAFT_VACANCY_VISIBILITY_NOTE,
  APPLICATION_EMPTY_LIST,
  APPLICATION_EMPTY_LIST_SUPPORT,
  CANDIDATE_DATA_REMOVED,
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
  priority: "primary" | "quiet";
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
  const { needsReview, open, decided } =
    groupEmployerApplications(applications);
  const summaryLabel =
    filteredVacancy === null ? "All vacancies" : "Filtered vacancy";
  const summary = (
    <ApplicationSummary
      allLabel={summaryLabel}
      total={applications.length}
      needsReview={needsReview.length}
      open={open.length}
      decided={decided.length}
    />
  );

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
          <>
            {summary}
            <EmployerEmptyState
              headingId="applications-empty-heading"
              heading={APPLICATION_DRAFT_VACANCY_HEADING}
              support={support}
              actionHref={`/employer/vacancies/${filteredVacancy.id}/edit`}
              actionLabel={APPLICATION_DRAFT_VACANCY_ACTION}
            />
          </>
        );
      }
      return (
        <>
          {summary}
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
        </>
      );
    }
    return (
      <>
        {summary}
        <EmployerEmptyState
          headingId="applications-empty-heading"
          heading={APPLICATION_EMPTY_LIST}
          support={APPLICATION_EMPTY_LIST_SUPPORT}
          actionHref="/employer/vacancies"
          actionLabel="View vacancies"
        />
      </>
    );
  }

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
      {summary}
      <ApplicationListGroup
        headingId="needs-review-heading"
        heading="Needs review"
        rows={needsReview}
        priority="primary"
        emptyContent={needsReviewEmptyContent}
      />
      <ApplicationListGroup
        headingId="open-heading"
        heading="Open"
        rows={open}
        priority="quiet"
      />
      <ApplicationListGroup
        headingId="decided-heading"
        heading="Decided"
        rows={decided}
        priority="quiet"
      />
    </>
  );
}

function ApplicationSummary({
  allLabel,
  total,
  needsReview,
  open,
  decided,
}: {
  allLabel: string;
  total: number;
  needsReview: number;
  open: number;
  decided: number;
}) {
  return (
    <ul className={styles.summaryList} aria-label="Application summary">
      <li className={styles.summaryChip}>
        {allLabel} {total}
      </li>
      <li className={`${styles.summaryChip} ${styles.summaryChipAttention}`}>
        Needs review {needsReview}
      </li>
      <li className={styles.summaryChip}>Open {open}</li>
      <li className={styles.summaryChip}>Decided {decided}</li>
    </ul>
  );
}

function ApplicationListGroup({
  headingId,
  heading,
  rows,
  priority,
  emptyContent = null,
}: ApplicationListGroupProps) {
  return (
    <section
      className={styles.section}
      data-priority={priority}
      aria-labelledby={headingId}
    >
      <div className={styles.sectionHeader}>
        <h2 id={headingId} className={styles.sectionHeading}>
          {heading}
        </h2>
        <span className={styles.sectionCount}>{rows.length}</span>
      </div>
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
        <div className={styles.emptyGroup}>{emptyContent}</div>
      )}
    </section>
  );
}

function ApplicationListRow({
  application,
}: {
  application: EmployerApplicationListRow;
}) {
  const facts = application.candidate_deleted
    ? CANDIDATE_DATA_REMOVED
    : `${jobCategoryLabel(application.job_category)} · ${germanRequirementLabel(
        application.german_comfort,
      )} · ${
        application.available_from === null
          ? "Available date not set"
          : `Available ${formatIsoCalendarDate(application.available_from)}`
      }`;
  const submitted = formatApplicationTimestamp(application.submitted_at);

  return (
    <li className={styles.listItem}>
      <h3 className={styles.listTitle}>{application.candidate_display_name}</h3>
      <p className={styles.vacancyTitle}>{application.vacancy_title}</p>
      <p className={styles.facts}>{facts}</p>
      <p className={styles.timestamp}>Submitted {submitted}</p>
      <span
        className={styles.statusBadge}
        data-status={application.current_status}
      >
        {applicationStatusLabel(application.current_status)}
      </span>
      <div className={styles.actions}>
        <Link
          className={styles.linkButton}
          href={`/employer/applications/${application.application_id}`}
          aria-label={`Review ${application.candidate_display_name} for ${application.vacancy_title}`}
        >
          Review
          <span className={styles.srOnly}>
            {" "}
            {application.candidate_display_name} for {application.vacancy_title}
          </span>
        </Link>
      </div>
    </li>
  );
}
