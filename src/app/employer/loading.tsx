"use client";

import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import { useLocale } from "@/components/i18n/locale-provider";
import styles from "@/app/employer/employer-home.module.scss";

// Representative home vacancy rows only. The real count, lifecycle labels,
// readiness text, expiry, and empty state are all unknown until
// loadEmployerDrafts resolves, so this skeleton reserves row structure
// without claiming any actual values.
export const EMPLOYER_HOME_VACANCY_SKELETON_COUNT = 2;

/**
 * Route-loading state for /employer. The page resolves profile,
 * capabilities, unseen applications, and employer vacancies before
 * rendering; the skeleton therefore keeps only stable structure:
 * welcome/lead geometry, one possible attention slot, the vacancies
 * section, and account data. It does not render fake display names,
 * verification claims, unseen counts, vacancy lifecycle values, or
 * per-vacancy application counts.
 */
export default function Loading() {
  const { t } = useLocale();

  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.home")}>
          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <Skeleton height="2.25rem" width="min(100%, 18rem)" radius="sm" />
              <Skeleton
                height="1.125rem"
                width="min(100%, 34rem)"
                radius="sm"
              />
            </div>
          </header>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.attention")}>
          <div className={styles.attentionCard}>
            <div className={styles.heroCopy}>
              <Skeleton height="1.25rem" width="min(100%, 12rem)" radius="sm" />
              <Skeleton height="1rem" width="min(100%, 24rem)" radius="sm" />
            </div>
            <Skeleton height="2.75rem" width="13rem" radius="sm" />
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.vacancies")}>
          <section
            className={styles.section}
            aria-label={t("employer.loading.vacancies")}
          >
            <div className={styles.sectionHeader}>
              <Skeleton height="1.5rem" width="8rem" radius="sm" />
              <Skeleton height="2.75rem" width="9rem" radius="sm" />
            </div>
            <ul className={styles.vacancyList}>
              {Array.from(
                { length: EMPLOYER_HOME_VACANCY_SKELETON_COUNT },
                (_, index) => (
                  <li key={index} className={styles.vacancyRow}>
                    <div className={styles.vacancySummary}>
                      <Skeleton
                        height="1.25rem"
                        width="min(100%, 14rem)"
                        radius="sm"
                      />
                      <Skeleton
                        height="1rem"
                        width="min(100%, 11rem)"
                        radius="sm"
                      />
                      <Skeleton
                        height="1rem"
                        width="min(100%, 22rem)"
                        radius="sm"
                      />
                    </div>
                    <div className={styles.vacancyState}>
                      <Skeleton height="1.75rem" width="7rem" radius="pill" />
                      <Skeleton height="1rem" width="8rem" radius="sm" />
                      <Skeleton height="2.75rem" width="9rem" radius="sm" />
                    </div>
                  </li>
                ),
              )}
            </ul>
            <div className={styles.inlineActions}>
              <Skeleton height="2.75rem" width="7rem" radius="sm" />
            </div>
          </section>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.accountData")}>
          <section
            className={styles.accountSection}
            aria-label={t("employer.loading.accountData")}
          >
            <div className={styles.heroCopy}>
              <Skeleton height="1.5rem" width="8rem" radius="sm" />
              <Skeleton height="1rem" width="min(100%, 28rem)" radius="sm" />
            </div>
            <div className={styles.accountActions}>
              <Skeleton height="2.75rem" width="10rem" radius="sm" />
              <Skeleton height="2.75rem" width="8rem" radius="sm" />
            </div>
          </section>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}
