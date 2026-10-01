"use client";
import styles from "@/app/candidate/profile/profile.module.scss";
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
        <SkeletonRegion label={t("candidate.notifications.loading")}>
          <Skeleton height="2.25rem" width="min(100%, 18rem)" radius="sm" />
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} height="6.875rem" radius="md" />
          ))}
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}
