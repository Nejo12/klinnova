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

      <figure className={styles.visual}>
        <Image
          className={styles.illustration}
          src="/images/klinnova-berlin-work.webp"
          alt={t("homepage.hero.imageAlt")}
          width={1024}
          height={1024}
          priority
          sizes="(min-width: 1024px) 46vw, (min-width: 768px) 70vw, 100vw"
        />
        <figcaption className={styles.frostedPanel}>
          <span className={styles.frostedMark} aria-hidden="true">
            ✓
          </span>
          <span>
            <strong>{t("homepage.hero.verifiedOnly")}</strong>
            <small>{t("homepage.hero.builtForBerlin")}</small>
          </span>
        </figcaption>
      </figure>
    </section>
  );
}
