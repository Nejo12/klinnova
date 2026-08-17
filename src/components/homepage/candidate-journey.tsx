import { applicationStatusLabel } from "@/lib/applications/status";

import { ILLUSTRATIVE_CAPTION } from "./homepage-messages";
import styles from "./candidate-journey.module.scss";

const STEPS = [
  "Your situation, set once",
  "Vacancies that match it",
  "Apply, a CV only when a role needs one",
  "Status you can see, updates by email",
];

export function CandidateJourney() {
  return (
    <section
      className={styles.section}
      id="for-candidates"
      aria-labelledby="candidate-journey-heading"
    >
      <div className={styles.copy}>
        <p className={styles.eyebrow}>From profile to decision</p>
        <h2 className={styles.heading} id="candidate-journey-heading">
          You never wonder where it went
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li
              key={step}
              className={styles.step}
              aria-label={`Step ${index + 1}`}
            >
              <span className={styles.stepNumber}>{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div
        className={styles.timelineCard}
        role="group"
        aria-labelledby="candidate-timeline-title"
      >
        <div className={styles.timelineHeader}>
          <h3 className={styles.timelineTitle} id="candidate-timeline-title">
            Küchenhilfe · Restaurant Mira
          </h3>
          <span className={styles.statusBadge}>
            {applicationStatusLabel("shortlisted")}
          </span>
        </div>
        <ol className={styles.timelineList}>
          <li className={styles.timelineItemDone}>
            <span className={styles.timelineDot} aria-hidden="true" />
            <div>
              <p className={styles.timelineStatus}>
                {applicationStatusLabel("submitted")}
              </p>
              <p className={styles.timelineTime}>4 August</p>
            </div>
          </li>
          <li className={styles.timelineItemDone}>
            <span className={styles.timelineDot} aria-hidden="true" />
            <div>
              <p className={styles.timelineStatus}>
                {applicationStatusLabel("reviewing")}
              </p>
              <p className={styles.timelineTime}>6 August</p>
            </div>
          </li>
          <li className={styles.timelineItemPending}>
            <span className={styles.timelineDotPending} aria-hidden="true" />
            <div>
              <p className={styles.timelineStatusPending}>Decision</p>
              <p className={styles.timelineTime}>Waiting on the employer</p>
            </div>
          </li>
        </ol>
        <p className={styles.illustrativeCaption}>{ILLUSTRATIVE_CAPTION}</p>
      </div>
    </section>
  );
}
