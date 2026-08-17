import Link from "next/link";

import { applicationStatusLabel } from "@/lib/applications/status";

import { ILLUSTRATIVE_CAPTION } from "./homepage-messages";
import styles from "./employer-band.module.scss";

const WORKFLOW_STEPS = [
  applicationStatusLabel("submitted"),
  applicationStatusLabel("reviewing"),
  applicationStatusLabel("shortlisted"),
  applicationStatusLabel("accepted"),
  applicationStatusLabel("rejected"),
];

type SampleApplicant = {
  initials: string;
  name: string;
  role: string;
  status: "submitted" | "reviewing" | "shortlisted";
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

export function EmployerBand() {
  return (
    <section
      className={styles.section}
      id="for-employers"
      aria-labelledby="employer-band-heading"
    >
      <div className={styles.copy}>
        <p className={styles.eyebrow}>For employers</p>
        <h2 className={styles.heading} id="employer-band-heading">
          Reach people who can start
        </h2>
        <ul className={styles.benefits}>
          <li>Post what the role actually needs</li>
          <li>Every application in one place</li>
          <li>Shortlist and decide faster</li>
        </ul>
        <Link className={styles.cta} href="/employer/register">
          Create an employer account
        </Link>
      </div>

      <div className={styles.panel}>
        <ol className={styles.workflowStrip} aria-label="Application workflow">
          {WORKFLOW_STEPS.map((label, index) => (
            <li key={label} className={styles.workflowStep}>
              {index > 0 ? (
                <span className={styles.workflowArrow} aria-hidden="true">
                  →
                </span>
              ) : null}
              <span className={styles.workflowChip}>{label}</span>
            </li>
          ))}
        </ol>

        <p className={styles.panelTitle}>Applications</p>
        <ul className={styles.applicantList}>
          {SAMPLE_APPLICANTS.map((applicant) => (
            <li key={applicant.name} className={styles.applicantRow}>
              <span className={styles.applicantAvatar} aria-hidden="true">
                {applicant.initials}
              </span>
              <span className={styles.applicantName}>{applicant.name}</span>
              <span className={styles.applicantRole}>{applicant.role}</span>
              <span className={styles.applicantStatus}>
                {applicationStatusLabel(applicant.status)}
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.illustrativeCaption}>{ILLUSTRATIVE_CAPTION}</p>
      </div>
    </section>
  );
}
