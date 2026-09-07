"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { ApplicationIntroductionDisplay } from "@/components/application-introduction/application-introduction-display";

import {
  formatSubmittedAtUtc,
  type ApplicationConfirmation,
} from "@/lib/applications/application-confirmation";
import { candidateStatusDisplayLabel } from "@/lib/applications/candidate-status-labels";
import {
  employmentTypeLabel,
  formatIsoCalendarDate,
  germanComfortLabel,
  germanRequirementLabel,
  jobCategoryLabel,
  joinLabels,
  languageLabel,
  languageProficiencyLabel,
  shiftLabel,
} from "@/lib/matching/labels";
import type { CandidateApplicationHistoryEntry } from "@/lib/applications/load-candidate-application-history";
import type { CandidateApplicationOutcomeEntry } from "@/lib/applications/load-candidate-application-outcomes";
import { ApplicationOutcomeTimeline } from "@/components/candidate-application-confirmation/application-outcome-timeline";
import { ApplicationStatusTimeline } from "@/components/candidate-application-confirmation/application-status-timeline";
import { CandidateApplicationsPageHeader } from "@/components/candidate-applications/candidate-applications-page-header";
import { WorkAuthorisationNotice } from "@/components/candidate-matches/work-authorisation-notice";

import styles from "./application-confirmation.module.scss";

type ApplicationConfirmationPageProps = { showEmployerNav: boolean } & (
  | {
      status: "ready";
      confirmation: ApplicationConfirmation;
      history: CandidateApplicationHistoryEntry[];
      outcomes: CandidateApplicationOutcomeEntry[];
    }
  | { status: "unavailable" }
  | { status: "failure" }
);

export function ApplicationConfirmationPage(
  props: ApplicationConfirmationPageProps,
) {
  const { locale, t } = useLocale();
  if (props.status !== "ready") {
    return (
      <main className={styles.page}>
        <CandidateApplicationsPageHeader
          showEmployerNav={props.showEmployerNav}
        />
        <section
          className={styles.unavailable}
          aria-labelledby="unavailable-heading"
        >
          <h1 className={styles.unavailableHeading} id="unavailable-heading">
            {t("candidate.applications.notAvailableHeading")}
          </h1>
          <p className={styles.unavailableBody}>
            {t("candidate.applications.notAvailableBody")}
          </p>
          <Link className={styles.cta} href="/candidate/matches">
            {t("candidate.applications.backMatches")}
          </Link>
        </section>
      </main>
    );
  }

  const { confirmation, history, outcomes } = props;
  const statusLabel = candidateStatusDisplayLabel(confirmation.status, locale);
  const submittedAtLabel =
    formatSubmittedAtUtc(confirmation.submittedAtIso, locale) ??
    confirmation.submittedAtLabel;
  const vacancyCategoryLabel = confirmation.vacancyJobCategory
    ? jobCategoryLabel(confirmation.vacancyJobCategory, locale)
    : confirmation.vacancyJobCategoryLabel;
  const vacancyEmploymentLabel = confirmation.vacancyEmploymentTypes
    ? joinLabels(
        confirmation.vacancyEmploymentTypes.map((code) =>
          employmentTypeLabel(code, locale),
        ),
        locale,
      )
    : confirmation.vacancyEmploymentTypesLabel;
  const vacancyShiftsLabel = confirmation.vacancyShiftRequirements
    ? joinLabels(
        confirmation.vacancyShiftRequirements.map((code) =>
          shiftLabel(code, locale),
        ),
        locale,
      )
    : confirmation.vacancyShiftRequirementsLabel;
  const vacancyGermanLabel = confirmation.vacancyGermanRequirement
    ? germanRequirementLabel(confirmation.vacancyGermanRequirement, locale)
    : confirmation.vacancyGermanRequirementLabel;
  const vacancyAvailableLabel =
    confirmation.vacancyAvailableFrom === undefined
      ? confirmation.vacancyAvailableFromLabel
      : confirmation.vacancyAvailableFrom === null
        ? t("candidate.applications.flexibleStart")
        : `${t("candidate.applications.from")} ${formatIsoCalendarDate(
            confirmation.vacancyAvailableFrom,
            locale,
          )}`;
  const candidateCategoryLabel = confirmation.candidateMatchedCategory
    ? jobCategoryLabel(confirmation.candidateMatchedCategory, locale)
    : confirmation.candidateMatchedCategoryLabel;
  const candidateGermanLabel = confirmation.candidateGermanComfort
    ? germanComfortLabel(confirmation.candidateGermanComfort, locale)
    : confirmation.candidateGermanComfortLabel;
  const candidateAuthorisationLabel =
    confirmation.candidateWorkAuthorisation === undefined
      ? confirmation.candidateWorkAuthorisationLabel
      : confirmation.candidateWorkAuthorisation
        ? t("candidate.onboarding.yes")
        : t("candidate.onboarding.notSure");
  const candidateAvailableLabel =
    confirmation.candidateAvailableFrom === undefined
      ? confirmation.candidateAvailableFromLabel
      : confirmation.candidateAvailableFrom === null
        ? null
        : formatIsoCalendarDate(confirmation.candidateAvailableFrom, locale);
  const candidateEmploymentLabel = confirmation.candidateEmploymentPreferences
    ? joinLabels(
        confirmation.candidateEmploymentPreferences.map((code) =>
          employmentTypeLabel(code, locale),
        ),
        locale,
      )
    : confirmation.candidateEmploymentPreferencesLabel;
  const candidateShiftsLabel = confirmation.candidateShiftPreferences
    ? joinLabels(
        confirmation.candidateShiftPreferences.map((code) =>
          shiftLabel(code, locale),
        ),
        locale,
      )
    : confirmation.candidateShiftPreferencesLabel;
  const vacancyLanguagesHeadingId = "confirmation-vacancy-languages";
  const candidateLanguagesHeadingId = "confirmation-candidate-languages";

  return (
    <main className={styles.page}>
      <CandidateApplicationsPageHeader
        showEmployerNav={props.showEmployerNav}
      />

      <section className={styles.hero} aria-labelledby="confirmation-heading">
        <p className={styles.eyebrow}>
          {t("candidate.applications.receiptMarker")}
        </p>
        <div className={styles.titleRow}>
          <h1 className={styles.heading} id="confirmation-heading">
            {t("candidate.applications.receiptHeading")}
          </h1>
          {confirmation.demoLabel !== null ? (
            <p className={styles.demoLabel}>{t("publicJobs.demo")}</p>
          ) : null}
        </div>
        <p className={styles.lead}>
          {locale === "de" ? "Deine Bewerbung für " : "Your application for "}
          {confirmation.vacancyTitle}
          {locale === "de" ? " ist jetzt bei " : " is now with "}
          {confirmation.employerDisplayName}.
        </p>
      </section>

      <section className={styles.statusPanel} aria-labelledby="status-heading">
        <h2 className={styles.statusHeading} id="status-heading">
          {t("candidate.applications.currentStatus")}
        </h2>
        <p className={styles.statusValue}>{statusLabel}</p>
        <p className={styles.support}>
          {t("candidate.applications.receiptBody")}
        </p>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.applications.status")}
            </dt>
            <dd className={styles.metaValue}>{statusLabel}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.applications.submitted")}
            </dt>
            <dd className={styles.metaValue}>
              <time dateTime={confirmation.submittedAtIso}>
                {submittedAtLabel}
              </time>
            </dd>
          </div>
        </dl>
      </section>

      {confirmation.status === "accepted" ? (
        <section
          className={styles.acceptedBanner}
          aria-labelledby="accepted-banner-heading"
        >
          <h2
            className={styles.acceptedBannerHeading}
            id="accepted-banner-heading"
          >
            {t("candidate.applications.acceptedHeading")}
          </h2>
          <p className={styles.acceptedBannerBody}>
            {t("candidate.applications.acceptedBody")}
          </p>
        </section>
      ) : null}

      <ApplicationIntroductionDisplay
        audience="candidate"
        text={confirmation.introductionText}
      />

      <section
        className={styles.section}
        aria-labelledby="confirmation-vacancy-heading"
      >
        <h2 className={styles.sectionHeading} id="confirmation-vacancy-heading">
          {t("candidate.applications.jobDetails")}
        </h2>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>{t("candidate.jobs.job")}</dt>
            <dd className={styles.metaValue}>{confirmation.vacancyTitle}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>{t("candidate.jobs.employer")}</dt>
            <dd className={styles.metaValue}>
              {confirmation.employerDisplayName}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.applications.location")}
            </dt>
            <dd className={styles.metaValue}>{confirmation.city}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.matches.category")}
            </dt>
            <dd className={styles.metaValue}>{vacancyCategoryLabel}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.applications.employment")}
            </dt>
            <dd className={styles.metaValue}>{vacancyEmploymentLabel}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.applications.shifts")}
            </dt>
            <dd className={styles.metaValue}>{vacancyShiftsLabel}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.applications.german")}
            </dt>
            <dd className={styles.metaValue}>{vacancyGermanLabel}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.applications.available")}
            </dt>
            <dd className={styles.metaValue}>{vacancyAvailableLabel}</dd>
          </div>
        </dl>

        <h3 className={styles.subHeading} id={vacancyLanguagesHeadingId}>
          {t("candidate.jobs.additionalLanguages")}
        </h3>
        {confirmation.vacancyNoAdditionalLanguagesLabel !== null ? (
          <p className={styles.support}>
            {t("candidate.applications.noAdditionalLanguages")}
          </p>
        ) : (
          <ul
            className={styles.languageList}
            aria-labelledby={vacancyLanguagesHeadingId}
          >
            {confirmation.vacancyLanguageRequirements.map((requirement) => (
              <li
                key={requirement.languageCode}
                className={styles.languageItem}
              >
                {languageLabel(requirement.languageCode, locale)} —{" "}
                {requirement.minProficiency
                  ? languageProficiencyLabel(requirement.minProficiency, locale)
                  : requirement.minProficiencyLabel}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={styles.section}
        aria-labelledby="confirmation-candidate-heading"
      >
        <h2
          className={styles.sectionHeading}
          id="confirmation-candidate-heading"
        >
          {t("candidate.applications.yourSubmittedProfile")}
        </h2>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>{t("candidate.jobs.yourName")}</dt>
            <dd className={styles.metaValue}>
              {confirmation.candidateDisplayName}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.jobs.matchedCategory")}
            </dt>
            <dd className={styles.metaValue}>{candidateCategoryLabel}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.jobs.germanComfort")}
            </dt>
            <dd className={styles.metaValue}>{candidateGermanLabel}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.jobs.workAuthorisation")}
            </dt>
            <dd className={styles.metaValue}>{candidateAuthorisationLabel}</dd>
          </div>
          {candidateAvailableLabel !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>
                {t("candidate.jobs.availableFrom")}
              </dt>
              <dd className={styles.metaValue}>{candidateAvailableLabel}</dd>
            </div>
          ) : null}
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.jobs.employmentPreferences")}
            </dt>
            <dd className={styles.metaValue}>{candidateEmploymentLabel}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>
              {t("candidate.jobs.shiftPreferences")}
            </dt>
            <dd className={styles.metaValue}>{candidateShiftsLabel}</dd>
          </div>
        </dl>

        <h3 className={styles.subHeading} id={candidateLanguagesHeadingId}>
          {t("candidate.jobs.additionalLanguages")}
        </h3>
        {confirmation.candidateNoAdditionalLanguagesLabel !== null ? (
          <p className={styles.support}>
            {t("candidate.applications.noAdditionalLanguages")}
          </p>
        ) : (
          <ul
            className={styles.languageList}
            aria-labelledby={candidateLanguagesHeadingId}
          >
            {confirmation.candidateLanguages.map((language) => (
              <li key={language.languageCode} className={styles.languageItem}>
                {languageLabel(language.languageCode, locale)} —{" "}
                {language.proficiency
                  ? languageProficiencyLabel(language.proficiency, locale)
                  : language.proficiencyLabel}
              </li>
            ))}
          </ul>
        )}

        <WorkAuthorisationNotice />
      </section>

      <ApplicationStatusTimeline history={history} />

      {outcomes.length > 0 ? (
        <ApplicationOutcomeTimeline outcomes={outcomes} />
      ) : null}

      <nav
        className={styles.nav}
        aria-label={t("candidate.applications.nextSteps")}
      >
        <Link
          className={styles.cta}
          href={`/candidate/jobs/${confirmation.vacancyId}`}
        >
          {t("candidate.applications.viewJob")}
        </Link>
        <Link className={styles.secondaryLink} href="/candidate/matches">
          {t("candidate.applications.backMatches")}
        </Link>
      </nav>
    </main>
  );
}
