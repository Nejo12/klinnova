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
        One step closer.
      </h1>
      <p className={styles.lead}>
        Let&apos;s start with what you can do. Applications do not need a CV to
        start.
      </p>
      <p className={styles.note}>
        This is a shell preview of the candidate surface. Registration and
        matching are not available yet.
      </p>

      <div className={styles.progress}>
        <h2 className={styles.progressHeading}>How progress will feel</h2>
        <StepProgress />
      </div>

      <a className={styles.action} href="#employer-admin-experience">
        View employer and admin preview
      </a>
    </section>
  );
}
