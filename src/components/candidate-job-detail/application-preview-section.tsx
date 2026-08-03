import type { ApplicationPreview } from "@/lib/applications/application-preview";
import { WORK_AUTHORISATION_NOTICE } from "@/components/candidate-matches/work-authorisation-notice";

import styles from "./candidate-job-detail.module.scss";

type ApplicationPreviewSectionProps = {
  preview: ApplicationPreview;
};

export function ApplicationPreviewSection({
  preview,
}: ApplicationPreviewSectionProps) {
  return (
    <section
      className={styles.section}
      aria-labelledby="application-preview-heading"
    >
      <h2 className={styles.sectionHeading} id="application-preview-heading">
        Application preview
      </h2>
      <p className={styles.previewLead}>
        This is the profile information that will be stored with your
        application for {preview.vacancyTitle} at {preview.employerDisplayName}.
      </p>

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Your name</dt>
          <dd className={styles.metaValue}>{preview.candidateDisplayName}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Job</dt>
          <dd className={styles.metaValue}>{preview.vacancyTitle}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Employer</dt>
          <dd className={styles.metaValue}>{preview.employerDisplayName}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Matched category</dt>
          <dd className={styles.metaValue}>
            {preview.matchedJobCategoryLabel}
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>German comfort</dt>
          <dd className={styles.metaValue}>{preview.germanComfortLabel}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Additional languages</dt>
          <dd className={styles.metaValue}>
            {preview.noAdditionalLanguagesLabel !== null ? (
              preview.noAdditionalLanguagesLabel
            ) : preview.relevantLanguages.length > 0 ? (
              <ul className={styles.languageList}>
                {preview.relevantLanguages.map((language) => (
                  <li
                    key={language.languageCode}
                    className={styles.languageItem}
                  >
                    {language.languageLabel} — {language.proficiencyLabel}
                  </li>
                ))}
              </ul>
            ) : null}
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Work authorisation</dt>
          <dd className={styles.metaValue}>
            {preview.workAuthorisationDeclaredLabel}
          </dd>
        </div>
        {preview.availableFromLabel !== null ? (
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Available from</dt>
            <dd className={styles.metaValue}>{preview.availableFromLabel}</dd>
          </div>
        ) : null}
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Employment preferences</dt>
          <dd className={styles.metaValue}>
            {preview.employmentPreferencesLabel}
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Shift preferences</dt>
          <dd className={styles.metaValue}>{preview.shiftPreferencesLabel}</dd>
        </div>
      </dl>

      <p className={styles.notice}>{WORK_AUTHORISATION_NOTICE}</p>
    </section>
  );
}
