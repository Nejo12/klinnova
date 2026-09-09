"use client";

import styles from "@/app/employer/employer-home.module.scss";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";

export default function Loading() {
  const { t } = useLocale();

  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label={t("employer.notifications.loading")}>
          <div className={styles.heroCopy}>
            <Skeleton height="2.25rem" width="min(100%, 18rem)" radius="sm" />
            <Skeleton height="1rem" width="min(100%, 24rem)" radius="sm" />
          </div>
          <div className={styles.list}>
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} height="6.875rem" radius="md" />
            ))}
          </div>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}
