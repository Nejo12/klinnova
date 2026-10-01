"use client";

import { useState } from "react";
import {
  markAllCandidateNotificationsReadAction,
  openCandidateNotificationAction,
} from "@/app/candidate/notifications/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import type { CandidateNotification } from "@/lib/candidate/notifications/schemas";
import type { MessageKey } from "@/lib/i18n/messages";
import { MarkAllRead } from "./mark-all-read";
import { NotificationRow } from "./notification-row";
import styles from "./candidate-notification-centre.module.scss";

const titles: Record<CandidateNotification["kind"], MessageKey> = {
  application_shortlisted: "candidate.notifications.shortlisted",
  application_accepted: "candidate.notifications.accepted",
  application_rejected: "candidate.notifications.rejected",
};

export function CandidateNotificationCentre({
  notifications,
  failed = false,
  readFailed = false,
  now,
}: {
  notifications: CandidateNotification[];
  failed?: boolean;
  readFailed?: boolean;
  now: string;
}) {
  const { locale, t } = useLocale();
  const [filter, setFilter] = useState("all");
  const unread = notifications.some((n) => n.read_at === null);
  const day = (value: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  const groups = [
    {
      key: "candidate.notifications.today" as const,
      rows: notifications.filter((n) => day(n.created_at) === day(now)),
    },
    {
      key: "candidate.notifications.earlier" as const,
      rows: notifications.filter((n) => day(n.created_at) !== day(now)),
    },
  ];
  return (
    <section aria-labelledby="notifications-heading" className={styles.centre}>
      <div className={styles.headingCopy}>
        <h1 id="notifications-heading" className={styles.heading}>
          {t("candidate.notifications.heading")}
        </h1>
        <p className={styles.lead}>{t("candidate.notifications.lead")}</p>
      </div>
      {failed ? (
        <div role="alert" className={styles.emptyState}>
          <p>{t("candidate.notifications.loadError")}</p>
          <a href="/candidate/notifications">
            {t("candidate.notifications.retry")}
          </a>
        </div>
      ) : (
        <>
          {readFailed ? (
            <p role="alert">{t("candidate.notifications.readError")}</p>
          ) : null}
          {notifications.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>{t("candidate.notifications.emptyHeading")}</h2>
              <p>{t("candidate.notifications.emptyCopy")}</p>
              <p>{t("candidate.notifications.historyCopy")}</p>
            </div>
          ) : (
            <>
              <div className={styles.controls}>
                <div
                  role="group"
                  aria-label={t("candidate.notifications.filterLabel")}
                  className={styles.filters}
                >
                  {["all", "applications"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={filter === value}
                      className={styles.filter}
                      onClick={() => setFilter(value)}
                    >
                      {t(
                        value === "all"
                          ? "candidate.notifications.all"
                          : "candidate.notifications.applications",
                      )}
                    </button>
                  ))}
                </div>
                <form action={markAllCandidateNotificationsReadAction}>
                  <MarkAllRead disabled={!unread} />
                </form>
              </div>
              {groups
                .filter((g) => g.rows.length > 0)
                .map((group) => (
                  <div key={group.key} className={styles.group}>
                    <h2 className={styles.groupHeading}>{t(group.key)}</h2>
                    <ul className={styles.list} aria-label={t(group.key)}>
                      {group.rows.map((notification) => (
                        <li key={notification.notification_id}>
                          <form action={openCandidateNotificationAction}>
                            <input
                              type="hidden"
                              name="notificationId"
                              value={notification.notification_id}
                            />
                            <NotificationRow
                              notification={notification}
                              locale={locale}
                              title={t(titles[notification.kind])}
                            />
                          </form>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
