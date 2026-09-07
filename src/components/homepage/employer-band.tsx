"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import {
  applicationStatusLabel,
  type ApplicationStatus,
} from "@/lib/applications/status";

import styles from "./employer-band.module.scss";

const WORKFLOW_STATUSES: ApplicationStatus[] = [
  "submitted",
  "reviewing",
  "shortlisted",
  "accepted",
  "rejected",
];

type SampleApplicant = {
  initials: string;
  name: string;
  role: string;
  status: Extract<ApplicationStatus, "submitted" | "reviewing" | "shortlisted">;
};

const SAMPLE_APPLICANTS: SampleApplicant[] = [
  { initials: "AK", name: "Amina K.", role: "Cleaner", status: "submitted" },
  {
    initials: "DM",
    name: "David M.",
    role: "Kitchen helper",
    status: "shortlisted",
  },
  {
    initials: "SL",
    name: "Sara L.",
    role: "Housekeeping",
    status: "submitted",
  },
  {
    initials: "MP",
    name: "Marco P.",
    role: "Logistics",
    status: "reviewing",
  },
];

export function EmployerBand({
  authenticatedDestination,
}: {
  authenticatedDestination?: string;
}) {
  const { locale, t } = useLocale();

  return (
    <section
      className={styles.section}
      id="for-employers"
      aria-labelledby="employer-band-heading"
    >
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{t("homepage.employer.eyebrow")}</p>
          <h2 className={styles.heading} id="employer-band-heading">
            {t("homepage.employer.heading")}
          </h2>
          <ul className={styles.benefits}>
            <li>{t("homepage.employer.benefitRequirements")}</li>
            <li>{t("homepage.employer.benefitApplications")}</li>
            <li>{t("homepage.employer.benefitDecide")}</li>
          </ul>
          <Link
            className={styles.cta}
            href={authenticatedDestination ?? "/employer/register"}
          >
            {t(
              authenticatedDestination === undefined
                ? "homepage.employer.cta"
                : "shell.dashboard",
            )}
          </Link>
        </div>

        <div className={styles.panel}>
          <ol
            className={styles.workflowStrip}
            aria-label={t("homepage.employer.workflow")}
          >
            {WORKFLOW_STATUSES.map((status, index) => (
              <li key={status} className={styles.workflowStep}>
                {index > 0 ? (
                  <span className={styles.workflowArrow} aria-hidden="true">
                    →
                  </span>
                ) : null}
                <span className={styles.workflowChip}>
                  {applicationStatusLabel(status, locale)}
                </span>
              </li>
            ))}
          </ol>

          <p className={styles.panelTitle}>
            {t("homepage.employer.applications")}
          </p>
          <ul className={styles.applicantList}>
            {SAMPLE_APPLICANTS.map((applicant) => (
              <li key={applicant.name} className={styles.applicantRow}>
                <span className={styles.applicantAvatar} aria-hidden="true">
                  {applicant.initials}
                </span>
                <span className={styles.applicantName}>{applicant.name}</span>
                <span className={styles.applicantRole}>{applicant.role}</span>
                <span className={styles.applicantStatus}>
                  {applicationStatusLabel(applicant.status, locale)}
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.illustrativeCaption}>
            {t("homepage.illustrative")}
          </p>
        </div>
      </div>
    </section>
  );
}
