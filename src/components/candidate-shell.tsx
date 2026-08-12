import { StepProgress } from "@/components/step-progress";

import styles from "./candidate-shell.module.scss";

export function CandidateShell() {
  return (
    <section
      id="candidate-experience"
      className={styles.section}
      aria-labelledby="candidate-shell-heading"
    >
      <p className={styles.eyebrow}>Candidate experience</p>
      <h1 id="candidate-shell-heading" className={styles.heading}>
        Apply as a candidate.
      </h1>
      <p className={styles.lead}>
        Let&apos;s start with what you can do. Applications do not need a CV to
        start.
      </p>
      <p className={styles.note}>
        Create an account to get started. Essential onboarding questions follow
        after you confirm your email. Matching arrives in a later step.
      </p>

      <div className={styles.actions}>
        <a className={styles.action} href="/register">
          Create account
        </a>
        <a className={styles.secondaryAction} href="/login">
          Sign in
        </a>
      </div>

      <div className={styles.progress}>
        <h2 className={styles.progressHeading}>How progress will feel</h2>
        <StepProgress />
      </div>

      <a className={styles.textLink} href="#employer-admin-experience">
        View employer and admin
      </a>
    </section>
  );
}
