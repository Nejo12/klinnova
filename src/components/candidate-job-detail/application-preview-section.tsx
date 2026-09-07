"use client";

import type { ApplicationPreview } from "@/lib/applications/application-preview";
import { WorkAuthorisationNotice } from "@/components/candidate-matches/work-authorisation-notice";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  employmentTypeLabel,
  formatIsoCalendarDate,
  germanComfortLabel,
  jobCategoryLabel,
  joinLabels,
  languageLabel,
  languageProficiencyLabel,
  shiftLabel,
} from "@/lib/matching/labels";

import styles from "./candidate-job-detail.module.scss";

type ApplicationPreviewSectionProps = {
  preview: ApplicationPreview;
};

export function ApplicationPreviewSection({
  preview,
}: ApplicationPreviewSectionProps) {
  const { locale, t } = useLocale();
  const categoryLabel = preview.matchedJobCategory
    ? jobCategoryLabel(preview.matchedJobCategory, locale)
    : preview.matchedJobCategoryLabel;
  const comfortLabel = preview.germanComfort
    ? germanComfortLabel(preview.germanComfort, locale)
    : preview.germanComfortLabel;
  const authorisationLabel =
    preview.workAuthorisationDeclared === undefined
      ? preview.workAuthorisationDeclaredLabel
      : preview.workAuthorisationDeclared
        ? t("candidate.onboarding.yes")
        : t("candidate.onboarding.notSure");
  const availableLabel =
    preview.availableFrom === undefined
      ? preview.availableFromLabel
      : preview.availableFrom
        ? formatIsoCalendarDate(preview.availableFrom, locale)
        : null;
  const employmentLabel = preview.employmentPreferences
    ? joinLabels(
        preview.employmentPreferences.map((code) =>
          employmentTypeLabel(code, locale),
        ),
        locale,
      )
    : preview.employmentPreferencesLabel;
  const shiftsLabel = preview.shiftPreferences
    ? joinLabels(
        preview.shiftPreferences.map((code) => shiftLabel(code, locale)),
        locale,
      )
    : preview.shiftPreferencesLabel;
  return (
    <section
      className={styles.section}
      aria-labelledby="application-preview-heading"
    >
      <h2 className={styles.sectionHeading} id="application-preview-heading">
        {t("candidate.jobs.applicationPreview")}
      </h2>
      <p className={styles.previewLead}>
        {t("candidate.jobs.previewLeadStart")} {preview.vacancyTitle}{" "}
        {t("candidate.jobs.previewLeadAt")} {preview.employerDisplayName}.
      </p>

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>{t("candidate.jobs.yourName")}</dt>
          <dd className={styles.metaValue}>{preview.candidateDisplayName}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>{t("candidate.jobs.job")}</dt>
          <dd className={styles.metaValue}>{preview.vacancyTitle}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>{t("candidate.jobs.employer")}</dt>
          <dd className={styles.metaValue}>{preview.employerDisplayName}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>
            {t("candidate.jobs.matchedCategory")}
          </dt>
          <dd className={styles.metaValue}>{categoryLabel}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>
            {t("candidate.jobs.germanComfort")}
          </dt>
          <dd className={styles.metaValue}>{comfortLabel}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>
            {t("candidate.jobs.additionalLanguages")}
          </dt>
          <dd className={styles.metaValue}>
            {preview.noAdditionalLanguagesLabel !== null ? (
              t("candidate.applications.noAdditionalLanguages")
            ) : preview.relevantLanguages.length > 0 ? (
              <ul className={styles.languageList}>
                {preview.relevantLanguages.map((language) => (
                  <li
                    key={language.languageCode}
                    className={styles.languageItem}
                  >
                    {languageLabel(language.languageCode, locale)} —{" "}
                    {language.proficiency
                      ? languageProficiencyLabel(language.proficiency, locale)
                      : language.proficiencyLabel}
                  </li>
                ))}
              </ul>
            ) : null}
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>
            {t("candidate.jobs.workAuthorisation")}
          </dt>
          <dd className={styles.metaValue}>{authorisationLabel}</dd>
        </div>
        {availableLabel !== null ? (
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.jobs.availableFrom")}
            </dt>
            <dd className={styles.metaValue}>{availableLabel}</dd>
          </div>
        ) : null}
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>
            {t("candidate.jobs.employmentPreferences")}
          </dt>
          <dd className={styles.metaValue}>{employmentLabel}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>
            {t("candidate.jobs.shiftPreferences")}
          </dt>
          <dd className={styles.metaValue}>{shiftsLabel}</dd>
        </div>
      </dl>

      <WorkAuthorisationNotice />
    </section>
  );
}
