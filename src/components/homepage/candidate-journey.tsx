"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import { applicationStatusLabel } from "@/lib/applications/status";
import type { MessageKey } from "@/lib/i18n/messages";

import styles from "./candidate-journey.module.scss";

const STEPS: MessageKey[] = [
  "homepage.candidate.stepProfile",
  "homepage.candidate.stepMatches",
  "homepage.candidate.stepApply",
  "homepage.candidate.stepStatus",
];

export function CandidateJourney() {
  const { locale, t } = useLocale();

  return (
    <section
      className={styles.section}
      id="for-candidates"
      aria-labelledby="candidate-journey-heading"
    >
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{t("homepage.candidate.eyebrow")}</p>
        <h2 className={styles.heading} id="candidate-journey-heading">
          {t("homepage.candidate.heading")}
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step} className={styles.step}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <span>{t(step)}</span>
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
            {applicationStatusLabel("shortlisted", locale)}
          </span>
        </div>
        <ol className={styles.timelineList}>
          <li className={styles.timelineItemDone}>
            <span className={styles.timelineDot} aria-hidden="true" />
            <div>
              <p className={styles.timelineStatus}>
                {applicationStatusLabel("submitted", locale)}
              </p>
              <p className={styles.timelineTime}>
                {t("homepage.candidate.dateSubmitted")}
              </p>
            </div>
          </li>
          <li className={styles.timelineItemDone}>
            <span className={styles.timelineDot} aria-hidden="true" />
            <div>
              <p className={styles.timelineStatus}>
                {applicationStatusLabel("reviewing", locale)}
              </p>
              <p className={styles.timelineTime}>
                {t("homepage.candidate.dateReviewing")}
              </p>
            </div>
          </li>
          <li className={styles.timelineItemPending}>
            <span className={styles.timelineDotPending} aria-hidden="true" />
            <div>
              <p className={styles.timelineStatusPending}>
                {t("homepage.candidate.decision")}
              </p>
              <p className={styles.timelineTime}>
                {t("homepage.candidate.waiting")}
              </p>
            </div>
          </li>
        </ol>
        <p className={styles.illustrativeCaption}>
          {t("homepage.illustrative")}
        </p>
      </div>
    </section>
  );
}
