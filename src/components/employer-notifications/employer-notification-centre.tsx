"use client";

import {
  markAllEmployerNotificationsReadAction,
  openEmployerNotificationAction,
} from "@/app/employer/notifications/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatApplicationTimestamp } from "@/lib/employer/applications/format-timestamp";
import type { EmployerNotification } from "@/lib/employer/notifications/schemas";

import styles from "./employer-notification-centre.module.scss";

type EmployerNotificationCentreProps = {
  notifications: EmployerNotification[];
};

export function EmployerNotificationCentre({
  notifications,
}: EmployerNotificationCentreProps) {
  const { locale, t } = useLocale();
  const unreadCount = notifications.filter(
    (notification) => notification.read_at === null,
  ).length;

  return (
    <section aria-labelledby="notifications-heading" className={styles.centre}>
      <div className={styles.headingRow}>
        <div className={styles.headingCopy}>
          <h1 id="notifications-heading" className={styles.heading}>
            {t("employer.notifications.heading")}
          </h1>
          <p className={styles.lead}>{t("employer.notifications.lead")}</p>
        </div>
        {notifications.length > 0 ? (
          <form action={markAllEmployerNotificationsReadAction}>
            <button
              className={styles.markAll}
              type="submit"
              disabled={unreadCount === 0}
            >
              {t("employer.notifications.markAllRead")}
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>{t("employer.notifications.emptyHeading")}</h2>
          <p>{t("employer.notifications.emptyCopy")}</p>
        </div>
      ) : (
        <ul
          className={styles.list}
          aria-label={t("employer.notifications.listLabel")}
        >
          {notifications.map((notification) => {
            const unread = notification.read_at === null;
            return (
              <li key={notification.notification_id}>
                <form action={openEmployerNotificationAction}>
                  <input
                    type="hidden"
                    name="notificationId"
                    value={notification.notification_id}
                  />
                  <button
                    type="submit"
                    className={styles.notification}
                    data-unread={unread ? "true" : "false"}
                    aria-label={`${t("employer.notifications.openApplication")} ${notification.vacancy_title}`}
                  >
                    <span className={styles.copy}>
                      <span className={styles.title}>
                        {t("employer.notifications.newApplication")}
                      </span>
                      <span className={styles.context}>
                        {t("employer.notifications.applicationFor")}{" "}
                        <strong>{notification.vacancy_title}</strong>
                      </span>
                    </span>
                    <span className={styles.meta}>
                      <time dateTime={notification.created_at}>
                        {formatApplicationTimestamp(
                          notification.created_at,
                          locale,
                        )}
                      </time>
                      <span className={unread ? styles.unread : styles.read}>
                        {t(
                          unread
                            ? "employer.notifications.unread"
                            : "employer.notifications.read",
                        )}
                      </span>
                    </span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
