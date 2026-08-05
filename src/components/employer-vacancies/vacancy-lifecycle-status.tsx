import Link from "next/link";

import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import type { EmployerVacancyDetail } from "@/lib/employer/vacancies/load-employer-vacancy";
import {
  VACANCY_EFFECTIVE_EXPIRED_NOTE,
  VACANCY_VERIFICATION_BLOCKER,
} from "@/lib/employer/vacancies/messages";

function formatTimestamp(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const STATE_LABELS: Record<EmployerVacancyDetail["publicationState"], string> =
  {
    draft: "Private draft",
    published: "Published",
    paused: "Paused",
    filled: "Filled",
    expired: "Expired",
    withdrawn: "Withdrawn",
  };

type VacancyLifecycleStatusProps = {
  vacancy: EmployerVacancyDetail;
};

export function VacancyLifecycleStatus({
  vacancy,
}: VacancyLifecycleStatusProps) {
  const publishedAt = formatTimestamp(vacancy.publishedAt);
  const expiresAt = formatTimestamp(vacancy.expiresAt);
  const isVerified = vacancy.verificationState === "verified";
  const showEffectiveExpiredNote =
    vacancy.publicationState === "published" && vacancy.isEffectivelyExpired;
  const showVerificationBlocker =
    (vacancy.publicationState === "draft" ||
      vacancy.publicationState === "paused") &&
    !isVerified;

  return (
    <section
      className={styles.section}
      aria-labelledby="lifecycle-status-heading"
    >
      <h2 id="lifecycle-status-heading" className={styles.sectionHeading}>
        Status
      </h2>
      <p className={styles.readyBadge} role="status">
        {STATE_LABELS[vacancy.publicationState]}
        {showEffectiveExpiredNote ? " — effectively expired" : ""}
      </p>

      {publishedAt !== null ? (
        <p className={styles.support}>Published: {publishedAt}</p>
      ) : null}
      {expiresAt !== null ? (
        <p className={styles.support}>Expires: {expiresAt}</p>
      ) : null}

      {showEffectiveExpiredNote ? (
        <p className={styles.warning}>{VACANCY_EFFECTIVE_EXPIRED_NOTE}</p>
      ) : null}

      {vacancy.publicationState === "published" && !showEffectiveExpiredNote ? (
        <p className={styles.support}>
          This vacancy is currently visible to eligible candidates.
        </p>
      ) : null}

      {vacancy.publicationState === "paused" ? (
        <p className={styles.support}>
          This vacancy is not publicly visible while paused. Existing
          applications are preserved.
        </p>
      ) : null}

      {vacancy.publicationState === "filled" ? (
        <p className={styles.support}>
          This vacancy is closed as filled. No further action is available.
        </p>
      ) : null}

      {vacancy.publicationState === "withdrawn" ? (
        <p className={styles.support}>
          This vacancy was withdrawn. No further action is available.
        </p>
      ) : null}

      {vacancy.publicationState === "expired" ? (
        <p className={styles.support}>
          This vacancy&rsquo;s publication period ended. Renew it to return to
          draft, then review and publish again.
        </p>
      ) : null}

      {showVerificationBlocker ? (
        <p className={styles.warning}>
          {VACANCY_VERIFICATION_BLOCKER}{" "}
          <Link className={styles.linkButton} href="/employer/verification">
            Review verification status
          </Link>
        </p>
      ) : null}
    </section>
  );
}
