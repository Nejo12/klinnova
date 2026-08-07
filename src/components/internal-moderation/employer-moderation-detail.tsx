import styles from "@/components/internal-verification/internal-verification.module.scss";
import { AuditTimeline } from "@/components/internal-moderation/audit-timeline";
import { EmployerSuspensionActions } from "@/components/internal-moderation/employer-suspension-actions";
import { EmployerVacancyList } from "@/components/internal-moderation/employer-vacancy-list";
import { ModerationPagination } from "@/components/internal-moderation/moderation-pagination";
import { RevokeVerificationAction } from "@/components/internal-moderation/revoke-verification-action";
import { formatTimestamp } from "@/lib/internal/verification/format-timestamp";
import type { EmployerModerationDetail as EmployerModerationDetailData } from "@/lib/internal/moderation/load-employer-moderation";
import type { OperatorVacancyRow } from "@/lib/internal/moderation/load-employer-moderation";

function verificationLabel(
  state: EmployerModerationDetailData["verificationState"],
): string {
  switch (state) {
    case "unverified":
      return "Unverified";
    case "pending":
      return "Pending";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    case "revoked":
      return "Revoked";
  }
}

type EmployerModerationDetailProps = {
  employer: EmployerModerationDetailData;
  vacancies: OperatorVacancyRow[];
  vacancyPage: number;
  vacancyLimit: number;
};

export function EmployerModerationDetail({
  employer,
  vacancies,
  vacancyPage,
  vacancyLimit,
}: EmployerModerationDetailProps) {
  const suspendedAt = formatTimestamp(employer.suspendedAt);

  return (
    <>
      <section className={styles.panel} aria-labelledby="employer-identity">
        <h2 className={styles.label} id="employer-identity">
          Identity
        </h2>
        <dl className={styles.detailList}>
          <dt>Employer</dt>
          <dd>{employer.displayName ?? "—"}</dd>

          <dt>Type</dt>
          <dd>
            {employer.employerType === "organisation"
              ? "Organisation"
              : "Private"}
          </dd>

          {employer.companyName !== null ? (
            <>
              <dt>Company</dt>
              <dd>{employer.companyName}</dd>
            </>
          ) : null}

          <dt>Onboarding</dt>
          <dd>{employer.onboardingCompleted ? "Complete" : "Incomplete"}</dd>

          <dt>Verification</dt>
          <dd>{verificationLabel(employer.verificationState)}</dd>
        </dl>
      </section>

      <section className={styles.panel} aria-labelledby="employer-suspension">
        <h2 className={styles.label} id="employer-suspension">
          Suspension
        </h2>
        {employer.suspended ? (
          <>
            <p className={styles.lead}>
              <span className={`${styles.badge} ${styles.badgeDanger}`}>
                Suspended
              </span>
              {suspendedAt !== null ? ` since ${suspendedAt}` : null}
            </p>
            {employer.suspendedReason !== null ? (
              <dl className={styles.detailList}>
                <dt>Reason</dt>
                <dd>{employer.suspendedReason}</dd>
              </dl>
            ) : null}
            <p className={styles.notice}>
              Suspension hides this employer&apos;s vacancies from public
              discovery, blocks their account actions, and blocks applicant-
              review access. It does not delete historical data.
            </p>
          </>
        ) : (
          <p className={styles.lead}>
            <span className={`${styles.badge} ${styles.badgeNeutral}`}>
              Not suspended
            </span>
          </p>
        )}
        <EmployerSuspensionActions
          employerProfileId={employer.employerProfileId}
          suspended={employer.suspended}
        />
      </section>

      {employer.verificationState === "verified" ? (
        <section
          className={styles.panel}
          aria-labelledby="employer-verification"
        >
          <h2 className={styles.label} id="employer-verification">
            Verification
          </h2>
          <p className={styles.lead}>
            Revoking verification is separate from suspension — it is a
            trust-gate reset the employer can resolve by resubmitting for
            review, not a punitive hold.
          </p>
          <RevokeVerificationAction
            employerProfileId={employer.employerProfileId}
          />
        </section>
      ) : null}

      <section className={styles.panel} aria-labelledby="employer-vacancies">
        <h2 className={styles.label} id="employer-vacancies">
          Vacancies
        </h2>
        <EmployerVacancyList
          employerProfileId={employer.employerProfileId}
          rows={vacancies}
        />
        <ModerationPagination
          basePath={`/internal/employers/${employer.employerProfileId}`}
          page={vacancyPage}
          rowCount={vacancies.length}
          limit={vacancyLimit}
        />
      </section>

      <section className={styles.panel} aria-labelledby="employer-audit">
        <h2 className={styles.label} id="employer-audit">
          Audit history
        </h2>
        <AuditTimeline events={employer.auditEvents} />
      </section>
    </>
  );
}
