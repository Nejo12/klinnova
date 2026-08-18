"use client";

import { useEffect, useId, useRef } from "react";

import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { APPLICATION_REASON_MAX_LENGTH } from "@/lib/employer/applications/messages";

type StatusTransitionConfirmDialogProps = {
  targetStatus: "accepted" | "rejected";
  pending: boolean;
  onCancel: () => void;
};

// Queried fresh on every Tab keypress (see the keydown handler below) rather
// than cached, since the reason textarea only exists for
// `targetStatus === "rejected"` — a cached list would go stale the moment
// that field mounts/unmounts.
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const COPY = {
  accepted: {
    heading: "Accept this application?",
    body: "Accepting records that you want to proceed with this candidate. It does not record a hire or an employment contract, and you arrange the details with them directly.",
    note: "This ends the application. It cannot be changed afterwards.",
    confirmLabel: "Accept application",
  },
  rejected: {
    heading: "Reject this application?",
    body: "The application will be recorded as rejected. This ends it, and it cannot be changed afterwards.",
    note: 'The candidate sees this as "Not selected". No reason is shared with them.',
    confirmLabel: "Reject application",
  },
} as const;

/**
 * The dialog's confirm button is a real `type="submit"` button targeting
 * the same outer `<form action={formAction}>` that `ApplicationStatusActions`
 * renders — this component has no form of its own (two nested `<form>`s
 * would be invalid HTML) and makes no request itself; `onCancel` is the
 * only callback it needs. The optional rejection reason renders
 * uncontrolled: each open is a fresh mount (the parent unmounts this
 * component on cancel/submit), so there is no stale value to carry
 * between opens.
 */
export function StatusTransitionConfirmDialog({
  targetStatus,
  pending,
  onCancel,
}: StatusTransitionConfirmDialogProps) {
  const headingId = useId();
  const reasonId = `${headingId}-reason`;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const copy = COPY[targetStatus];

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
        return;
      }

      if (event.key === "Tab") {
        const panel = panelRef.current;
        if (panel === null) {
          return;
        }
        // Queried at trap-time, not cached — the reason textarea only
        // exists for targetStatus === "rejected".
        const focusable = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusable.length === 0) {
          return;
        }
        const first = focusable[0]!;
        const activeIndex = focusable.indexOf(
          document.activeElement as HTMLElement,
        );

        if (event.shiftKey) {
          if (activeIndex <= 0) {
            event.preventDefault();
            focusable[focusable.length - 1]!.focus();
          }
        } else if (activeIndex === -1 || activeIndex === focusable.length - 1) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className={styles.dialogOverlay}>
      <div
        ref={panelRef}
        className={styles.dialogPanel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <h3
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className={styles.dialogHeading}
        >
          {copy.heading}
        </h3>
        <p className={styles.support}>{copy.body}</p>
        <p className={styles.note}>{copy.note}</p>

        {targetStatus === "rejected" ? (
          <div className={styles.field}>
            <label className={styles.label} htmlFor={reasonId}>
              Reason (optional)
            </label>
            <textarea
              id={reasonId}
              className={styles.textarea}
              name="reason"
              maxLength={APPLICATION_REASON_MAX_LENGTH}
              disabled={pending}
            />
          </div>
        ) : null}

        <div className={`${styles.actions} ${styles.statusActionsGroup}`}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="submit"
            name="targetStatus"
            value={targetStatus}
            className={
              targetStatus === "rejected" ? styles.buttonDanger : styles.button
            }
            disabled={pending}
          >
            {copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
