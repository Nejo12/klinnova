import Link from "next/link";

import { presentMatchReasons } from "@/lib/matching/present-reasons";
import type { MatchReason } from "@/lib/matching/types";
import {
  jobCategoryLabel,
  languageLabel,
  languageProficiencyLabel,
  workFrequencyLabel,
  workplaceTypeLabel,
} from "@/lib/public-jobs/labels";

import { ILLUSTRATIVE_CAPTION } from "./homepage-messages";
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

export function PublicHero() {
  const reasons = presentMatchReasons(HERO_MATCH_REASONS);

  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Berlin · working now</p>
        <h1 className={styles.heading} id="hero-heading">
          Jobs that match your situation.{" "}
          <span className={styles.accent}>In Berlin.</span>
        </h1>
        <p className={styles.lead}>
          Language level, availability and location — checked against what
          each vacancy needs.
        </p>
        <div className={styles.ctas}>
          <Link className={styles.primaryCta} href="/register">
            I&apos;m a candidate
          </Link>
          <Link className={styles.secondaryCta} href="/employer/register">
            I&apos;m an employer
          </Link>
        </div>
        <ul className={styles.trustList}>
          <li className={styles.trustItem}>Verified employers only</li>
          <li className={styles.trustItem}>Built for Berlin</li>
        </ul>
      </div>

      <div
        className={styles.previewCard}
        role="group"
        aria-labelledby="hero-preview-title"
      >
        <div className={styles.previewHeader}>
          <div>
            <h3 className={styles.previewTitle} id="hero-preview-title">
              Reinigungskraft
            </h3>
            <p className={styles.previewCompany}>Hauswerk Berlin · Mitte</p>
          </div>
          <span className={styles.verifiedBadge}>Verified employer</span>
        </div>

        <ul className={styles.previewChips}>
          <li className={styles.previewChip}>{jobCategoryLabel("cleaning")}</li>
          <li className={styles.previewChip}>
            {workplaceTypeLabel("private_home")}
          </li>
          <li className={styles.previewChip}>
            {workFrequencyLabel("recurring")}
          </li>
          <li className={styles.previewChip}>
            {languageLabel("de")} — {languageProficiencyLabel("basic")}
          </li>
        </ul>

        <div className={styles.previewReasons}>
          <p className={styles.previewReasonsHeading}>Why this fits you</p>
          <ul className={styles.reasonsList}>
            {reasons.map((reason) => (
              <li key={reason.key} className={styles.reasonItem}>
                {reason.text}
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.previewNote}>
          Sign in to check your fit and apply.
        </p>
        <p className={styles.illustrativeCaption}>{ILLUSTRATIVE_CAPTION}</p>
      </div>
    </section>
  );
}
