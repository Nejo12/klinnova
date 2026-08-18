import Link from "next/link";

import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

type EmployerEmptyStateProps = {
  headingId: string;
  heading: string;
  support?: string;
  actionHref?: string;
  actionLabel?: string;
};

/**
 * Shared "state, cause, one action" empty-state shape for employer-side
 * lists (vacancies, applications), mirroring the candidate-side pattern
 * (`applications-empty-state.tsx`): a labelled section, one heading, an
 * optional supporting sentence naming the cause, and at most one action
 * link. No metrics, no congratulatory copy — every caller here supplies
 * only real, already-loaded data.
 */
export function EmployerEmptyState({
  headingId,
  heading,
  support,
  actionHref,
  actionLabel,
}: EmployerEmptyStateProps) {
  return (
    <section className={styles.empty} aria-labelledby={headingId} role="status">
      <h2 className={styles.sectionHeading} id={headingId}>
        {heading}
      </h2>
      {support !== undefined ? (
        <p className={styles.support}>{support}</p>
      ) : null}
      {actionHref !== undefined && actionLabel !== undefined ? (
        <Link className={styles.linkButton} href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
