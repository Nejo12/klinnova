import Link from "next/link";

import { DraftNotice } from "@/components/legal/draft-notice";
import styles from "@/components/legal/legal-page.module.scss";
import { PublicFooter } from "@/components/public-shared/public-footer";

export const metadata = {
  title: "Privacy · Klinnova",
  description:
    "Privacy notice for Klinnova — how we process personal data in the private beta.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Klinnova
      </Link>
      <h1 className={styles.heading}>Privacy</h1>

      <DraftNotice documentName="Privacy Notice" />

      <section className={styles.section} aria-labelledby="privacy-controller">
        <h2 className={styles.sectionHeading} id="privacy-controller">
          1. Controller
        </h2>
        <p className={styles.body}>
          The controller is the natural person operating Klinnova as a sole
          trader (nicht eingetragenes Einzelunternehmen), as identified in the{" "}
          <Link className={styles.backLink} href="/impressum">
            Impressum
          </Link>
          . For privacy and data-subject requests during Cohort A, contact{" "}
          <a className={styles.backLink} href="mailto:support@klinnova.com">
            support@klinnova.com
          </a>
          . No data protection officer is appointed for this private beta unless
          later required.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-scope">
        <h2 className={styles.sectionHeading} id="privacy-scope">
          2. Scope
        </h2>
        <p className={styles.body}>
          This notice describes personal-data processing for the Klinnova
          private beta (Cohort A). It may change as the product and founder
          verification progress. It is not a claim of full GDPR certification.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-processed">
        <h2 className={styles.sectionHeading} id="privacy-processed">
          3. What we process
        </h2>
        <p className={styles.body}>
          Depending on how you use Klinnova, we may process:
        </p>
        <ul className={styles.list}>
          <li>
            Candidate account and profile data you provide (name, Berlin
            locality/travel preferences, languages, German comfort,
            work-authorisation self-declaration, availability, job preferences);
            applications and submission snapshots; optional CV or candidate
            documents only if that feature is enabled and you upload them.
          </li>
          <li>
            Employer account and profile data (display name, locality, contact
            details, organisation name where applicable); verification
            attestation data; vacancies; applicant information made available
            through the product for review.
          </li>
          <li>
            Operator moderation and audit records created when an operator
            reviews, suspends, restores, or otherwise moderates an account or
            vacancy.
          </li>
          <li>
            Technical data needed to run and secure the service (authentication
            session cookies, security logs, and — where monitoring is enabled —
            scrubbed error events).
          </li>
        </ul>
        <p className={styles.body}>
          Klinnova does not collect identity or residence-title documents in the
          MVP. Work authorisation is a self-declaration. Exact private
          residential workplace addresses are not collected for public job
          surfaces; public locality remains privacy-safe.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-bases">
        <h2 className={styles.sectionHeading} id="privacy-bases">
          4. Why we process data (legal bases)
        </h2>
        <ul className={styles.list}>
          <li>
            Providing accounts, profiles, vacancies, matching, and applications:
            Art. 6(1)(b) GDPR (contract / steps at your request).
          </li>
          <li>
            Security, abuse prevention, and service integrity: Art. 6(1)(f) GDPR
            (legitimate interests), and Art. 6(1)(b) where needed to operate
            your account.
          </li>
          <li>
            Moderation and the operator audit ledger: Art. 6(1)(f) GDPR, and
            Art. 6(1)(c) where a legal obligation applies.
          </li>
          <li>
            Support and data-subject requests via{" "}
            <a className={styles.backLink} href="mailto:support@klinnova.com">
              support@klinnova.com
            </a>
            : Art. 6(1)(b)/(f)/(c) GDPR as applicable.
          </li>
          <li>
            Transactional product email (when configured): Art. 6(1)(b) GDPR.
          </li>
          <li>
            Error monitoring (Sentry), where enabled: Art. 6(1)(f) GDPR —
            keeping the service reliable and secure.
          </li>
        </ul>
        <p className={styles.body}>
          Cohort A does not use separate marketing email. If marketing is added
          later, it will require a distinct legal basis (typically consent).
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-providers">
        <h2 className={styles.sectionHeading} id="privacy-providers">
          5. Processors and service providers
        </h2>
        <ul className={styles.list}>
          <li>
            <strong>Supabase</strong> — authentication, application database,
            and private document storage where used.
          </li>
          <li>
            <strong>Vercel</strong> — web application hosting and delivery.
          </li>
          <li>
            <strong>Zoho</strong> — hosting of the{" "}
            <a className={styles.backLink} href="mailto:support@klinnova.com">
              support@klinnova.com
            </a>{" "}
            mailbox.
          </li>
          <li>
            <strong>Resend</strong> — transactional product email only when
            Production mail is configured. Until that configuration is live,
            automated product email may be unavailable.
          </li>
          <li>
            <strong>Sentry</strong> — error monitoring under the boundary below.
          </li>
        </ul>
        <p className={styles.body}>
          We do not sell personal data and do not use advertising networks or
          third-party product analytics (for example PostHog) in Cohort A.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-sentry">
        <h2 className={styles.sectionHeading} id="privacy-sentry">
          6. Monitoring (Sentry)
        </h2>
        <p className={styles.body}>
          Klinnova uses Sentry for error monitoring only, with a
          privacy-conscious configuration: no session replay; no request-body or
          application/vacancy payload capture; default PII sending disabled;
          additional scrubbing of sensitive fields; EU region preferred where
          available on the selected plan; retention target of 30 days or less
          where supported.
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Preview:</strong> Sentry is active for hosted Preview under
            the boundary above.
          </li>
          <li>
            <strong>Production:</strong> Sentry is intentionally not enabled
            until the founder separately authorizes Production activation. When
            authorized, Production is intended to use the same privacy boundary
            as Preview. This notice will be updated if that changes.
          </li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="privacy-transfers">
        <h2 className={styles.sectionHeading} id="privacy-transfers">
          7. International transfers
        </h2>
        <p className={styles.body}>
          Some providers may process data outside the EEA. Where required, we
          rely on appropriate transfer mechanisms offered by those providers
          (such as Standard Contractual Clauses) and prefer EU-region options
          where we have configured them.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-cookies">
        <h2 className={styles.sectionHeading} id="privacy-cookies">
          8. Cookies and similar technologies
        </h2>
        <p className={styles.body}>
          Klinnova uses essential cookies and similar technologies required for
          authentication sessions and secure operation of the site. Cohort A
          does not add non-essential advertising or analytics cookies.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-retention">
        <h2 className={styles.sectionHeading} id="privacy-retention">
          9. Retention
        </h2>
        <ul className={styles.list}>
          <li>
            Account and profile data: for the life of the account, then handled
            under the account-deletion process (anonymization/tombstones as
            implemented in the product).
          </li>
          <li>
            Support mailbox correspondence: only as long as needed to resolve
            the request, plus an operational buffer of up to 24 months, unless a
            longer hold is required for a dispute or legal obligation.
          </li>
          <li>Sentry error events: 30 days or less where supported.</li>
          <li>
            Moderation/audit taxonomy records may be retained in anonymized or
            redacted form as required for integrity of the audit trail.
          </li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="privacy-rights">
        <h2 className={styles.sectionHeading} id="privacy-rights">
          10. Your rights
        </h2>
        <p className={styles.body}>
          Subject to applicable law, you may request access, rectification,
          erasure, restriction, portability, and objection to processing based
          on legitimate interests. You can use in-product account export and
          deletion where available, or email{" "}
          <a className={styles.backLink} href="mailto:support@klinnova.com">
            support@klinnova.com
          </a>
          . You may lodge a complaint with the Berliner Beauftragte für
          Datenschutz und Informationsfreiheit (or another competent supervisory
          authority).
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-age">
        <h2 className={styles.sectionHeading} id="privacy-age">
          11. Age
        </h2>
        <p className={styles.body}>
          Klinnova is not directed at children under 16. Accounts should only be
          created by users who are at least 16 years old (or older if required
          for the work they seek).
        </p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-changes">
        <h2 className={styles.sectionHeading} id="privacy-changes">
          12. Changes
        </h2>
        <p className={styles.body}>
          We may update this notice as the beta and legal verification progress.
          Material changes will be reflected on this page.
        </p>
      </section>

      <PublicFooter />
    </main>
  );
}
