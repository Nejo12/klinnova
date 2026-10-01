"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useLocale } from "@/components/i18n/locale-provider";
import styles from "./candidate-notification-centre.module.scss";

const countSchema = z.object({ unreadCount: z.number().int().min(0) });
export function CandidateNotificationUtility({
  unreadCount,
}: {
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [loaded, setLoaded] = useState<{
    path: string | null;
    count: number;
  } | null>(null);
  useEffect(() => {
    if (unreadCount !== undefined) return;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/candidate/notifications/unread", {
          cache: "no-store",
          signal: controller.signal,
        });
        const parsed = countSchema.safeParse(await response.json());
        if (response.ok && parsed.success && !controller.signal.aborted)
          setLoaded({ path: pathname, count: parsed.data.unreadCount });
      } catch {
        /* Keep the utility reachable when its count cannot be loaded. */
      }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [pathname, unreadCount]);
  const count =
    unreadCount ?? (loaded?.path === pathname ? loaded?.count : undefined);
  return (
    <Link
      href="/candidate/notifications"
      className={styles.utility}
      aria-label={`${t("candidate.notifications.heading")}${count !== undefined && count > 0 ? ` ${count} ${t("candidate.notifications.unread")}` : ""}`}
      data-unread={count !== undefined && count > 0}
      aria-current={
        pathname === "/candidate/notifications" ? "page" : undefined
      }
    >
      <span>{t("candidate.notifications.heading")}</span>
      {count !== undefined && count > 0 ? (
        <span className={styles.utilityCount}>
          {count} {t("candidate.notifications.unread")}
        </span>
      ) : null}
    </Link>
  );
}
