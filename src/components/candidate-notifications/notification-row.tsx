"use client";
import { useFormStatus } from "react-dom";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatApplicationTimestamp } from "@/lib/employer/applications/format-timestamp";
import type { CandidateNotification } from "@/lib/candidate/notifications/schemas";
import styles from "./candidate-notification-centre.module.scss";
export function NotificationRow({
  notification,
  locale,
  title,
}: {
  notification: CandidateNotification;
  locale: "en" | "de";
  title: string;
}) {
  const { pending } = useFormStatus();
  const { t } = useLocale();
  const unread = notification.read_at === null;
  return (
    <button
      type="submit"
      disabled={pending}
      className={styles.notification}
      data-unread={unread}
      data-kind={notification.kind}
      aria-label={`${title}: ${notification.vacancy_title} · ${t(unread ? "candidate.notifications.unread" : "candidate.notifications.read")} · ${t("candidate.notifications.openApplication")}`}
    >
      <span className={styles.copy}>
        <span className={styles.title}>{title}</span>
        <span className={styles.context}>
          {notification.vacancy_title}
          {notification.employer_display_name
            ? ` · ${notification.employer_display_name}`
            : ""}
          {notification.kind === "application_accepted"
            ? ` · ${t("candidate.notifications.acceptedCopy")}`
            : notification.kind === "application_rejected"
              ? ` · ${t("candidate.notifications.rejectedCopy")}`
              : ""}
        </span>
      </span>
      <span className={styles.meta}>
        <time dateTime={notification.created_at}>
          {formatApplicationTimestamp(notification.created_at, locale)}
        </time>
        <span className={unread ? styles.unread : styles.read}>
          {t(
            unread
              ? "candidate.notifications.unread"
              : "candidate.notifications.read",
          )}
        </span>
      </span>
    </button>
  );
}
