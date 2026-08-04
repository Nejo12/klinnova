import Link from "next/link";

import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import type { EmployerDraftListItem } from "@/lib/employer/vacancies/load-employer-drafts";
import {
  VACANCY_EMPTY_LIST,
  VACANCY_LIST_LEAD,
  VACANCY_PRIVATE_NOTICE,
} from "@/lib/employer/vacancies/messages";
import { jobCategoryLabel } from "@/lib/matching/labels";
import type { JobCategoryCode } from "@/lib/onboarding/allow-lists";
import { readinessHeadline } from "@/lib/employer/vacancies/readiness";

type VacancyListProps = {
  drafts: EmployerDraftListItem[];
};

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function VacancyList({ drafts }: VacancyListProps) {
  return (
    <>
      <p className={styles.lead}>{VACANCY_LIST_LEAD}</p>
      <p className={styles.note}>{VACANCY_PRIVATE_NOTICE}</p>
      <p className={styles.actions}>
        <Link className={styles.button} href="/employer/vacancies/new">
          Create draft
        </Link>
      </p>

      {drafts.length === 0 ? (
        <p className={styles.support} role="status">
          {VACANCY_EMPTY_LIST}
        </p>
      ) : (
        <ul className={styles.list}>
          {drafts.map((draft) => (
            <li key={draft.id} className={styles.listItem}>
              <h2 className={styles.listTitle}>{draft.title}</h2>
              <ul className={styles.meta}>
                <li>
                  Category:{" "}
                  {jobCategoryLabel(draft.jobCategory as JobCategoryCode)}
                </li>
                <li>Locality: {draft.publicLocality ?? "Not set"}</li>
                <li>
                  Employer type:{" "}
                  {draft.employerType === "organisation"
                    ? "Organisation"
                    : "Private"}
                </li>
                {draft.companyName !== null ? (
                  <li>Company: {draft.companyName}</li>
                ) : null}
                <li>Status: Private draft</li>
                <li>
                  Readiness:{" "}
                  {draft.ready === null
                    ? "Unavailable"
                    : readinessHeadline(draft.ready)}
                </li>
                <li>Updated: {formatUpdatedAt(draft.updatedAt)}</li>
              </ul>
              <div className={styles.actions}>
                <Link
                  className={styles.linkButton}
                  href={`/employer/vacancies/${draft.id}`}
                >
                  View
                </Link>
                <Link
                  className={styles.linkButton}
                  href={`/employer/vacancies/${draft.id}/edit`}
                >
                  Edit
                </Link>
                <Link
                  className={styles.linkButton}
                  href={`/employer/vacancies/${draft.id}#delete-draft`}
                >
                  Delete
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
