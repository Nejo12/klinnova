"use client";

import type { ReactNode } from "react";

import Link from "next/link";

import { EmployerEmptyState } from "@/components/employer-shared/employer-empty-state";
import { useLocale } from "@/components/i18n/locale-provider";
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
  const { locale, t } = useLocale();
  const { needsReview, open, decided } =
    groupEmployerApplications(applications);
  const summaryLabel =
    filteredVacancy === null
      ? t("employer.applications.all")
      : t("employer.applications.filtered");
  const summary = (
    <ApplicationSummary
      allLabel={summaryLabel}
      needsReview={needsReview.length}
      open={open.length}
      decided={decided.length}
      locale={locale}
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
        const support =
          locale === "de"
            ? `${draftConsequence({ checklist: filteredVacancy.checklist }, locale)} Dieser Entwurf ist für Bewerbende noch nicht sichtbar.`
            : `${draftConsequence({ checklist: filteredVacancy.checklist }, locale)} ${APPLICATION_DRAFT_VACANCY_VISIBILITY_NOTE}`;
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
                ? locale === "de"
                  ? `Keine Bewerbungen für ${filteredVacancy.title}`
                  : `No applications for ${filteredVacancy.title}`
                : locale === "de"
                  ? "Keine Bewerbungen für diese Stelle"
                  : "No applications for this vacancy"
            }
            actionHref={`/employer/vacancies/${filteredVacancy.id}`}
            actionLabel={locale === "de" ? "Stelle ansehen" : "View vacancy"}
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
            locale === "de" ? "Noch keine Bewerbungen" : APPLICATION_EMPTY_LIST
          }
          support={
            locale === "de"
              ? "Bewerbungen erscheinen hier, sobald sich Personen auf Ihre veröffentlichten Stellen bewerben."
              : APPLICATION_EMPTY_LIST_SUPPORT
          }
          actionHref="/employer/vacancies"
          actionLabel={locale === "de" ? "Stellen ansehen" : "View vacancies"}
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
        {locale === "de" ? "Alles geprüft." : APPLICATION_NO_REVIEW_HEADING}{" "}
        {open.length}{" "}
        {locale === "de"
          ? open.length === 1
            ? "Bewerbung ist noch offen."
            : "Bewerbungen sind noch offen."
          : `${open.length === 1 ? "application is" : "applications are"} still open.`}
      </p>
    ) : null;

  return (
    <>
      {summary}
      <ApplicationListGroup
        headingId="needs-review-heading"
        heading={t("employer.applications.needsReview")}
        rows={needsReview}
        priority="primary"
        emptyContent={needsReviewEmptyContent}
      />
      <ApplicationListGroup
        headingId="open-heading"
        heading={t("employer.applications.open")}
        rows={open}
        priority="quiet"
      />
      <ApplicationListGroup
        headingId="decided-heading"
        heading={t("employer.applications.decided")}
        rows={decided}
        priority="quiet"
      />
    </>
  );
}

function ApplicationSummary({
  allLabel,
  needsReview,
  open,
  decided,
  locale,
}: {
  allLabel: string;
  needsReview: number;
  open: number;
  decided: number;
  locale: "en" | "de";
}) {
  const labels =
    locale === "de"
      ? {
          summary: "Bewerbungsübersicht",
          needs: "Zu prüfen",
          open: "Offen",
          decided: "Entschieden",
        }
      : {
          summary: "Application summary",
          needs: "Needs review",
          open: "Open",
          decided: "Decided",
        };
  return (
    <ul className={styles.summaryList} aria-label={labels.summary}>
      <li className={styles.summaryChip}>{allLabel}</li>
      <li className={`${styles.summaryChip} ${styles.summaryChipAttention}`}>
        {labels.needs} {needsReview}
      </li>
      <li className={styles.summaryChip}>
        {labels.open} {open}
      </li>
      <li className={styles.summaryChip}>
        {labels.decided} {decided}
      </li>
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
  const { locale, t } = useLocale();
  const facts = application.candidate_deleted
    ? CANDIDATE_DATA_REMOVED
    : `${jobCategoryLabel(application.job_category, locale)} · ${germanRequirementLabel(
        application.german_comfort,
        locale,
      )} · ${
        application.available_from === null
          ? locale === "de"
            ? "Verfügbarkeitsdatum nicht angegeben"
            : "Available date not set"
          : `${locale === "de" ? "Verfügbar" : "Available"} ${formatIsoCalendarDate(application.available_from, locale)}`
      }`;
  const submitted = formatApplicationTimestamp(
    application.submitted_at,
    locale,
  );

  return (
    <li className={styles.listItem}>
      <h3 className={styles.listTitle}>{application.candidate_display_name}</h3>
      <p className={styles.vacancyTitle}>{application.vacancy_title}</p>
      <p className={styles.facts}>{facts}</p>
      <p className={styles.timestamp}>
        {t("employer.applications.submitted")} {submitted}
      </p>
      <span
        className={styles.statusBadge}
        data-status={application.current_status}
      >
        {applicationStatusLabel(application.current_status, locale)}
      </span>
      <div className={styles.actions}>
        <Link
          className={styles.linkButton}
          href={`/employer/applications/${application.application_id}`}
          aria-label={`${t("employer.applications.review")} ${application.candidate_display_name} ${locale === "de" ? "für" : "for"} ${application.vacancy_title}`}
        >
          {t("employer.applications.review")}
          <span className={styles.srOnly}>
            {" "}
            {application.candidate_display_name} for {application.vacancy_title}
          </span>
        </Link>
      </div>
    </li>
  );
}
