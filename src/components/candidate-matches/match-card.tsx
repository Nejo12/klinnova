import {
  employmentTypeLabel,
  formatIsoCalendarDate,
  germanRequirementLabel,
  joinLabels,
  shiftLabel,
} from "@/lib/matching/labels";
import type { CandidateMatch } from "@/lib/matching/types";

import { MatchReasons } from "@/components/candidate-matches/match-reasons";

import styles from "./candidate-matches.module.scss";

type MatchCardProps = {
  match: CandidateMatch;
};

export function MatchCard({ match }: MatchCardProps) {
  const { vacancy, reasons } = match;
  const titleId = `match-title-${vacancy.id}`;
  const reasonsId = `match-reasons-${vacancy.id}`;
  const availableFromText =
    vacancy.availableFrom === null
      ? "Flexible start"
      : `From ${formatIsoCalendarDate(vacancy.availableFrom)}`;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle} id={titleId}>
          {vacancy.title}
        </h2>
        <p className={styles.demoLabel}>Demo vacancy</p>
      </div>

      <p className={styles.company}>{vacancy.company.name}</p>
      {vacancy.summary.trim().length > 0 ? (
        <p className={styles.summary}>{vacancy.summary}</p>
      ) : null}

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Location</dt>
          <dd className={styles.metaValue}>Berlin</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Employment</dt>
          <dd className={styles.metaValue}>
            {joinLabels(vacancy.employmentTypes.map(employmentTypeLabel))}
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Shifts</dt>
          <dd className={styles.metaValue}>
            {joinLabels(vacancy.shiftRequirements.map(shiftLabel))}
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>German</dt>
          <dd className={styles.metaValue}>
            {germanRequirementLabel(vacancy.germanRequirement)}
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Available</dt>
          <dd className={styles.metaValue}>{availableFromText}</dd>
        </div>
      </dl>

      <MatchReasons reasons={reasons} labelledBy={reasonsId} />
    </article>
  );
}
