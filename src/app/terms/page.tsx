import Link from "next/link";

import { DraftNotice } from "@/components/legal/draft-notice";
import styles from "@/components/legal/legal-page.module.scss";
import { PublicFooter } from "@/components/public-shared/public-footer";

export const metadata = {
  title: "Terms · Klinnova",
  description:
    "Beta terms for using Klinnova during the private Cohort A pilot.",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Klinnova
      </Link>
      <h1 className={styles.heading}>Terms</h1>

      <DraftNotice documentName="Terms of Service" />

      <section className={styles.section} aria-labelledby="terms-operator">
        <h2 className={styles.sectionHeading} id="terms-operator">
          1. Operator and contact
        </h2>
        <p className={styles.body}>
          These Terms govern use of Klinnova, operated by the sole trader
          identified in the{" "}
          <Link className={styles.backLink} href="/impressum">
            Impressum
          </Link>
          . Contact:{" "}
          <a className={styles.backLink} href="mailto:support@klinnova.com">
            support@klinnova.com
          </a>
          . The{" "}
          <Link className={styles.backLink} href="/privacy">
            Privacy Notice
          </Link>{" "}
          explains personal-data processing.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-purpose">
        <h2 className={styles.sectionHeading} id="terms-purpose">
          2. What Klinnova is
        </h2>
        <p className={styles.body}>
          Klinnova is a digital matching and application platform that connects
          candidates in Berlin with employers offering suitable roles, and gives
          employers tools to publish vacancies and review applicants. Klinnova
          is not the employer, is not a temporary-work agency, and does not
          guarantee interviews, hires, or vacancy volume.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-pilot">
        <h2 className={styles.sectionHeading} id="terms-pilot">
          3. Private beta status
        </h2>
        <p className={styles.body}>
          Klinnova is operated as a controlled private beta (Cohort A).
          Features, availability, and these Terms may change. No service-level
          agreement is offered.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-eligibility">
        <h2 className={styles.sectionHeading} id="terms-eligibility">
          4. Eligibility and accounts
        </h2>
        <p className={styles.body}>
          You must provide accurate registration information and keep your
          account secure. The service is not directed at users under 16. You are
          responsible for activity under your account.
        </p>
      </section>

      <section
        className={styles.section}
        aria-labelledby="terms-candidate-responsibilities"
      >
        <h2
          className={styles.sectionHeading}
          id="terms-candidate-responsibilities"
        >
          5. Candidate responsibilities
        </h2>
        <p className={styles.body}>
          Candidates are responsible for the accuracy of profile information and
          declarations they submit, including work-authorisation and language
          declarations. Klinnova does not verify residence titles in the MVP.
          Applying through Klinnova does not guarantee a job outcome.
        </p>
      </section>

      <section
        className={styles.section}
        aria-labelledby="terms-employer-responsibilities"
      >
        <h2
          className={styles.sectionHeading}
          id="terms-employer-responsibilities"
        >
          6. Employer responsibilities and fees
        </h2>
        <p className={styles.body}>
          Employers are responsible for the accuracy of vacancy and company
          information they publish, and must only hire people who are allowed to
          work in Germany for the roles they post. During the M5 private beta,
          employer use is free of charge — no subscription, placement fee, or
          commission. Future commercial terms, if any, will be communicated
          separately before they apply.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-misuse">
        <h2 className={styles.sectionHeading} id="terms-misuse">
          7. Prohibited misuse
        </h2>
        <p className={styles.body}>
          Misuse is prohibited, including fraudulent listings,
          misrepresentation, undeclared or cash-in-hand arrangements, unlawful
          discrimination, scraping, or attempts to circumvent moderation.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-moderation">
        <h2 className={styles.sectionHeading} id="terms-moderation">
          8. Moderation, suspension, and removal
        </h2>
        <p className={styles.body}>
          An operator may suspend an account or remove a vacancy from public
          discovery when reasonably necessary to keep the platform safe and
          lawful. Moderation does not by itself delete historical account or
          application records required for integrity or legal purposes.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-licence">
        <h2 className={styles.sectionHeading} id="terms-licence">
          9. User content licence
        </h2>
        <p className={styles.body}>
          You retain ownership of content you submit. You grant Klinnova a
          non-exclusive, worldwide, royalty-free licence to host, display,
          transmit, and otherwise process that content as needed to operate the
          service (including profiles, vacancies, and application snapshots).
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-availability">
        <h2 className={styles.sectionHeading} id="terms-availability">
          10. Availability
        </h2>
        <p className={styles.body}>
          No uptime, match-quality, or outcome guarantee is offered during this
          beta. The operator may modify or discontinue features with reasonable
          effort to notify users of material changes via the site or email.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-liability">
        <h2 className={styles.sectionHeading} id="terms-liability">
          11. Liability
        </h2>
        <p className={styles.body}>
          Nothing in these Terms limits liability for intent, gross negligence,
          injury to life, body, or health, or any liability that cannot be
          limited under mandatory German law.
        </p>
        <p className={styles.body}>
          For other damages caused by simple negligence, Klinnova is liable only
          for breach of duties essential to performing this contract, and only
          for foreseeable damage typical for this kind of service. For pure
          financial loss arising from defects of the beta service, liability is
          limited to EUR 100 per incident and EUR 500 per user per calendar
          year, unless mandatory law requires otherwise.
        </p>
        <p className={styles.body}>
          Klinnova is not liable for hiring decisions, employment outcomes, the
          truthfulness of user statements beyond the operator&apos;s moderation
          role, or downtime during the beta.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-termination">
        <h2 className={styles.sectionHeading} id="terms-termination">
          12. Termination and account closure
        </h2>
        <p className={styles.body}>
          You may stop using Klinnova and request account deletion through the
          product where available, or via{" "}
          <a className={styles.backLink} href="mailto:support@klinnova.com">
            support@klinnova.com
          </a>
          . The operator may suspend or end access for breach of these Terms or
          when winding down the beta. Provisions that by nature should survive
          (including liability limits, governing law, and licences needed for
          residual lawful records) survive termination.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-governing-law">
        <h2 className={styles.sectionHeading} id="terms-governing-law">
          13. Governing law and jurisdiction
        </h2>
        <p className={styles.body}>
          These Terms are governed by the laws of the Federal Republic of
          Germany. If you are a merchant (Unternehmer), the exclusive place of
          jurisdiction is Berlin. If you are a consumer (Verbraucher), mandatory
          venue protections remain unaffected.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-changes">
        <h2 className={styles.sectionHeading} id="terms-changes">
          14. Changes
        </h2>
        <p className={styles.body}>
          We may update these Terms for the beta. The current version is the one
          published on this page.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-severability">
        <h2 className={styles.sectionHeading} id="terms-severability">
          15. Severability
        </h2>
        <p className={styles.body}>
          If any provision is invalid, the remaining provisions continue in
          effect.
        </p>
      </section>

      <PublicFooter />
    </main>
  );
}
