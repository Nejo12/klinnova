import Link from "next/link";

import { DraftNotice } from "@/components/legal/draft-notice";
import styles from "@/components/legal/legal-page.module.scss";
import { PublicFooter } from "@/components/public-shared/public-footer";

export const metadata = {
  title: "Privacy · Klinnova",
  description: "Draft privacy placeholder — legal review required.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Klinnova
      </Link>
      <h1 className={styles.heading}>Privacy</h1>

      <DraftNotice documentName="Privacy Policy" />

      <section className={styles.section} aria-labelledby="privacy-controller">
        <h2 className={styles.sectionHeading} id="privacy-controller">
          Controller / responsible party
        </h2>
        <p className={styles.body}>
          Placeholder — the legal entity operating Klinnova has not yet been
          finalised. See{" "}
          <Link className={styles.backLink} href="/impressum">
            Impressum
          </Link>{" "}
          for the current operator details as they become available.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-processed">
        <h2 className={styles.sectionHeading} id="privacy-processed">
          What Klinnova currently processes
        </h2>
        <p className={styles.body}>
          As of this pilot build, Klinnova processes: candidate account and
          profile information you provide during onboarding (name, city,
          language and work-authorisation declarations, availability, and job
          preferences); employer account and profile information (display name,
          locality, contact details, and — for organisations — a company name);
          vacancy and application information created through normal use of the
          product; and operator-facing moderation/audit records generated when
          an operator reviews, suspends, or moderates an account or vacancy.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-providers">
        <h2 className={styles.sectionHeading} id="privacy-providers">
          Authentication, hosting, and database
        </h2>
        <p className={styles.body}>
          Account authentication is handled by Supabase Auth. The application
          database, backing this pilot, also runs on Supabase. The web
          application is hosted on Vercel. No other subprocessor is currently
          integrated.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-analytics">
        <h2 className={styles.sectionHeading} id="privacy-analytics">
          Analytics
        </h2>
        <p className={styles.body}>
          No third-party analytics, tracking pixels, or advertising cookies have
          been added as of this pilot build. Internal pilot-readiness
          measurement is derived directly from existing product data, not from a
          separate tracking integration — this is a statement of current
          implementation status, not a permanent commitment.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-retention">
        <h2 className={styles.sectionHeading} id="privacy-retention">
          Retention
        </h2>
        <p className={styles.body}>
          Retention periods are not yet defined and remain subject to legal
          review before public launch.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-requests">
        <h2 className={styles.sectionHeading} id="privacy-requests">
          Data-subject and contact requests
        </h2>
        <p className={styles.body}>
          Placeholder — a defined contact channel for access, correction, or
          deletion requests has not yet been established for this pilot build.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-changes">
        <h2 className={styles.sectionHeading} id="privacy-changes">
          Changes
        </h2>
        <p className={styles.body}>
          This page will change as the product and its legal review progress. It
          carries no version history yet.
        </p>
      </section>

      <PublicFooter />
    </main>
  );
}
