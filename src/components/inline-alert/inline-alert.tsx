import { type ReactNode } from "react";

import styles from "./inline-alert.module.scss";

export type InlineAlertTone = "info" | "success" | "warning" | "error";

export type InlineAlertAnnouncement = "off" | "polite" | "assertive";

export type InlineAlertProps = {
  title: ReactNode;
  children: ReactNode;
  tone?: InlineAlertTone;
  action?: ReactNode;
  announcement?: InlineAlertAnnouncement;
};

const TONE_MARKS: Record<InlineAlertTone, string> = {
  info: "i",
  success: "✓",
  warning: "!",
  error: "×",
};

export function InlineAlert({
  title,
  children,
  tone = "info",
  action,
  announcement = "off",
}: InlineAlertProps) {
  const announcementProps =
    announcement === "off"
      ? {}
      : {
          role: announcement === "assertive" ? "alert" : "status",
          "aria-live": announcement,
          "aria-atomic": true,
        };

  return (
    <div className={styles.alert} data-tone={tone} {...announcementProps}>
      <span className={styles.mark} aria-hidden="true">
        {TONE_MARKS[tone]}
      </span>

      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        <div className={styles.body}>{children}</div>
        {action !== undefined ? (
          <div className={styles.action}>{action}</div>
        ) : null}
      </div>
    </div>
  );
}
