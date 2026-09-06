"use client";

import { type ReactNode } from "react";

import styles from "./toast.module.scss";

export type ToastTone = "info" | "success" | "warning" | "error";

export type ToastAction = {
  label: string;
  onAction: () => void;
  disabled?: boolean;
};

export type ToastProps = {
  children: ReactNode;
  dismissLabel: string;
  onDismiss: () => void;
  tone?: ToastTone;
  action?: ToastAction;
};

const TONE_MARKS: Record<ToastTone, string> = {
  info: "i",
  success: "✓",
  warning: "!",
  error: "×",
};

export function Toast({
  children,
  dismissLabel,
  onDismiss,
  tone = "info",
  action,
}: ToastProps) {
  const isError = tone === "error";

  return (
    <div
      className={styles.toast}
      data-tone={tone}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <span className={styles.mark} aria-hidden="true">
        {TONE_MARKS[tone]}
      </span>

      <div className={styles.message}>{children}</div>

      <div className={styles.actions}>
        {action !== undefined ? (
          <button
            className={styles.action}
            type="button"
            disabled={action.disabled}
            onClick={action.onAction}
          >
            {action.label}
          </button>
        ) : null}
        <button
          className={styles.dismiss}
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
