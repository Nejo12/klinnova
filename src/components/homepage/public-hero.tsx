"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { presentMatchReasons } from "@/lib/matching/present-reasons";
import type { MatchReason } from "@/lib/matching/types";
import {
  jobCategoryLabel,
  languageLabel,
  languageProficiencyLabel,
  workFrequencyLabel,
  workplaceTypeLabel,
} from "@/lib/public-jobs/labels";

import styles from "./public-hero.module.scss";

/**
 * Synthetic but real MatchReason values, run through the production
 * presentMatchReason function so the illustrative copy can never drift
 * from what the authenticated matches UI actually says.
 */
const HERO_MATCH_REASONS: MatchReason[] = [
  { code: "german_requirement_met", germanRequirement: "basic" },
  { code: "availability_match", kind: "flexible_start" },
  { code: "berlin_job", city: "Berlin" },
];

export function PublicHero({
  authenticatedDestination,
}: {
  authenticatedDestination?: string;
}) {
  const { locale, t } = useLocale();
  const reasons = presentMatchReasons(HERO_MATCH_REASONS, locale);

  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{t("homepage.hero.eyebrow")}</p>
        <h1 className={styles.heading} id="hero-heading">
          {t("homepage.hero.heading")}{" "}
          <span className={styles.accent}>{t("homepage.hero.accent")}</span>
        </h1>
        <p className={styles.lead}>{t("homepage.hero.lead")}</p>
        <div className={styles.ctas}>
          {authenticatedDestination === undefined ? (
            <>
              <Link className={styles.primaryCta} href="/register">
                {t("homepage.hero.candidateCta")}
              </Link>
              <Link className={styles.secondaryCta} href="/employer/register">
                {t("homepage.hero.employerCta")}
              </Link>
            </>
          ) : (
            <Link className={styles.primaryCta} href={authenticatedDestination}>
              {t("shell.dashboard")}
            </Link>
          )}
        </div>
        <ul className={styles.trustList}>
          <li className={styles.trustItem}>
            {t("homepage.hero.verifiedOnly")}
          </li>
          <li className={styles.trustItem}>
            {t("homepage.hero.builtForBerlin")}
          </li>
        </ul>
      </div>

      <div
        className={styles.previewCard}
        role="group"
        aria-labelledby="hero-preview-title"
      >
        <div className={styles.previewHeader}>
          <div>
            <p className={styles.previewTitle} id="hero-preview-title">
              Reinigungskraft
            </p>
            <p className={styles.previewCompany}>Hauswerk Berlin · Mitte</p>
          </div>
          <span className={styles.verifiedBadge}>
            {t("homepage.hero.verifiedEmployer")}
          </span>
        </div>

        <ul className={styles.previewChips}>
          <li className={styles.previewChip}>
            {jobCategoryLabel("cleaning", locale)}
          </li>
          <li className={styles.previewChip}>
            {workplaceTypeLabel("private_home", locale)}
          </li>
          <li className={styles.previewChip}>
            {workFrequencyLabel("recurring", locale)}
          </li>
          <li className={styles.previewChip}>
            {languageLabel("de", locale)} —{" "}
            {languageProficiencyLabel("basic", locale)}
          </li>
        </ul>

        <div className={styles.previewReasons}>
          <p className={styles.previewReasonsHeading}>
            {t("homepage.hero.reasonsHeading")}
          </p>
          <ul className={styles.reasonsList}>
            {reasons.map((reason) => (
              <li key={reason.key} className={styles.reasonItem}>
                {reason.text}
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.previewNote}>
          {t(
            authenticatedDestination === undefined
              ? "homepage.hero.signInNote"
              : "homepage.hero.dashboardNote",
          )}
        </p>
        <p className={styles.illustrativeCaption}>
          {t("homepage.illustrative")}
        </p>
      </div>
    </section>
  );
}
