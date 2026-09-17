"use client";

import Image from "next/image";
import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./public-hero.module.scss";

export function PublicHero({
  authenticatedDestination,
}: {
  authenticatedDestination?: string;
}) {
  const { t } = useLocale();

  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.stage}>
        <Image
          className={styles.illustration}
          src="/images/klinnova-berlin-work.webp"
          alt={t("homepage.hero.imageAlt")}
          fill
          priority
          sizes="(min-width: 1280px) 1184px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)"
        />
        <div className={styles.wash} aria-hidden="true" />

        <div className={styles.copy}>
          <p className={styles.eyebrow}>{t("homepage.hero.eyebrow")}</p>
          <h1 className={styles.heading} id="hero-heading">
            {t("homepage.hero.heading")} {t("homepage.hero.accent")}
          </h1>
          <p className={styles.lead}>{t("homepage.hero.lead")}</p>
        </div>

        <div className={styles.actionPanel}>
          {authenticatedDestination === undefined ? (
            <>
              <Link className={styles.primaryCta} href="/jobs">
                {t("homepage.final.browseJobs")}
              </Link>
              <Link className={styles.secondaryCta} href="/register">
                {t("homepage.hero.candidateCta")}
              </Link>
              <Link className={styles.secondaryCta} href="/employer/register">
                {t("homepage.hero.employerCta")}
              </Link>
            </>
          ) : (
            <>
              <Link className={styles.primaryCta} href="/jobs">
                {t("homepage.final.browseJobs")}
              </Link>
              <Link
                className={styles.secondaryCta}
                href={authenticatedDestination}
              >
                {t("shell.dashboard")}
              </Link>
            </>
          )}
        </div>
      </div>

      <div className={styles.trustBar}>
        <p>
          <strong>{t("homepage.pillars.heading")}</strong>{" "}
          {t("homepage.hero.lead")}
        </p>
        <ul className={styles.trustList}>
          <li>{t("homepage.hero.verifiedOnly")}</li>
          <li>{t("homepage.hero.builtForBerlin")}</li>
        </ul>
      </div>
    </section>
  );
}
