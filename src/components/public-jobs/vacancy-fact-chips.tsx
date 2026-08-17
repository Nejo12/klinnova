import {
  jobCategoryLabel,
  workFrequencyLabel,
  workplaceTypeLabel,
} from "@/lib/public-jobs/labels";
import type { PublicVacancy } from "@/lib/public-jobs/domain";

import styles from "./vacancy-fact-chips.module.scss";

type VacancyFactChipsProps = {
  vacancy: PublicVacancy;
};

/**
 * Shared fact-chip row (category / location / workplace / frequency) used
 * by the public job card, the candidate match card, and the top of the
 * candidate job detail page's own "Job details" `<dl>`. Extracted from
 * those three call sites verbatim — same conditionals, same label calls,
 * same order — so it renders byte-identically to what each previously
 * rendered inline.
 */
export function VacancyFactChips({ vacancy }: VacancyFactChipsProps) {
  return (
    <dl className={styles.meta}>
      <div className={styles.metaRow}>
        <dt className={styles.metaLabel}>Category</dt>
        <dd className={styles.metaValue}>
          {jobCategoryLabel(vacancy.jobCategory)}
        </dd>
      </div>
      {vacancy.publicLocality !== null ? (
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Location</dt>
          <dd className={styles.metaValue}>{vacancy.publicLocality}, Berlin</dd>
        </div>
      ) : null}
      {vacancy.workplaceType !== null ? (
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Workplace</dt>
          <dd className={styles.metaValue}>
            {workplaceTypeLabel(vacancy.workplaceType)}
          </dd>
        </div>
      ) : null}
      {vacancy.workFrequency !== null ? (
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Frequency</dt>
          <dd className={styles.metaValue}>
            {workFrequencyLabel(vacancy.workFrequency)}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
