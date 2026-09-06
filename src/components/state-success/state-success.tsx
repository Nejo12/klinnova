import { type ReactNode } from "react";

import styles from "./state-success.module.scss";

export type StateSuccessAnnouncement = "off" | "polite";

export type StateSuccessProps = {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  announcement?: StateSuccessAnnouncement;
  className?: string;
};

export function StateSuccess({
  title,
  children,
  action,
  announcement = "off",
  className,
}: StateSuccessProps) {
  const classNames = [styles.state, className].filter(Boolean).join(" ");
  const announcementProps =
    announcement === "polite"
      ? {
          role: "status",
          "aria-live": "polite" as const,
          "aria-atomic": true,
        }
      : {};

  return (
    <div className={classNames} {...announcementProps}>
      <span className={styles.mark} aria-hidden="true">
        ✓
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
