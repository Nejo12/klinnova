import Link from "next/link";

import { DraftNotice } from "@/components/legal/draft-notice";
import styles from "@/components/legal/legal-page.module.scss";
import { PublicFooter } from "@/components/public-shared/public-footer";

export const metadata = {
  title: "Terms · Klinnova",
  description: "Draft terms placeholder — legal review required.",
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

      <section className={styles.section} aria-labelledby="terms-purpose">
        <h2 className={styles.sectionHeading} id="terms-purpose">
          Service purpose
        </h2>
        <p className={styles.body}>
          Klinnova connects candidates in Berlin with employers offering roles
          that do not require fluent German, and gives employers tools to
          publish vacancies and review applicants.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-pilot">
        <h2 className={styles.sectionHeading} id="terms-pilot">
          Pilot / beta status
        </h2>
        <p className={styles.body}>
          Klinnova is currently operated as a controlled, founder-operated
          pilot. Features, availability, and these terms may change without the
          notice period a general-availability product would give.
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
          Candidate responsibilities
        </h2>
        <p className={styles.body}>
          Candidates are responsible for the accuracy of the profile information
          and declarations they submit, including work-authorisation and
          language declarations.
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
          Employer responsibilities and lawful vacancies
        </h2>
        <p className={styles.body}>
          Employers are responsible for the accuracy of vacancy and company
          information they publish, and must only hire people who are allowed to
          work in Germany for the roles they post — the same confirmation
          employers make during onboarding.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-misuse">
        <h2 className={styles.sectionHeading} id="terms-misuse">
          Prohibited misuse
        </h2>
        <p className={styles.body}>
          Misuse of the platform — including fraudulent listings,
          misrepresentation, or attempts to circumvent moderation — is
          prohibited and may result in account suspension.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-moderation">
        <h2 className={styles.sectionHeading} id="terms-moderation">
          Moderation, suspension, and removal
        </h2>
        <p className={styles.body}>
          An operator may suspend an employer account or remove a vacancy from
          public discovery when reasonably necessary to keep the platform safe.
          This does not delete historical account or application data.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-availability">
        <h2 className={styles.sectionHeading} id="terms-availability">
          Availability
        </h2>
        <p className={styles.body}>
          No service-level guarantee is offered during this pilot.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-liability">
        <h2 className={styles.sectionHeading} id="terms-liability">
          Liability
        </h2>
        <p className={styles.body}>
          Placeholder — liability terms have not been drafted and require legal
          review before public launch.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-termination">
        <h2 className={styles.sectionHeading} id="terms-termination">
          Termination and account closure
        </h2>
        <p className={styles.body}>
          Placeholder — account-closure terms have not been finalised.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="terms-governing-law">
        <h2 className={styles.sectionHeading} id="terms-governing-law">
          Governing law and jurisdiction
        </h2>
        <p className={styles.body}>Placeholder — not yet determined.</p>
      </section>

      <section className={styles.section} aria-labelledby="terms-contact">
        <h2 className={styles.sectionHeading} id="terms-contact">
          Contact
        </h2>
        <p className={styles.body}>
          Placeholder — a defined contact channel has not yet been established
          for this pilot build.
        </p>
      </section>

      <PublicFooter />
    </main>
  );
}
