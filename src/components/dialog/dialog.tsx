"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";

import styles from "./dialog.module.scss";

export type DialogSize = "small" | "medium";
export type DialogType = "info" | "confirmation" | "destructive";

type DialogAction = {
  label: string;
  onAction: () => void;
  disabled?: boolean;
};

type DialogCommonProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  size?: DialogSize;
  action: DialogAction;
  onClose: () => void;
};

type InfoDialogProps = DialogCommonProps & {
  type?: "info";
  cancellable?: boolean;
  cancelLabel?: never;
  destructiveContext?: never;
};

type ConfirmationDialogProps = DialogCommonProps & {
  type: "confirmation";
  cancellable?: true;
  cancelLabel: string;
  destructiveContext?: never;
};

type DestructiveDialogProps = DialogCommonProps & {
  type: "destructive";
  cancellable?: true;
  cancelLabel: string;
  destructiveContext?: ReactNode;
};

export type DialogProps =
  InfoDialogProps | ConfirmationDialogProps | DestructiveDialogProps;

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(dialog: HTMLDialogElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function Dialog({
  open,
  title,
  description,
  children,
  size = "small",
  type = "info",
  action,
  onClose,
  cancellable = true,
  cancelLabel,
  destructiveContext,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const bodyOverflowRef = useRef("");
  const titleId = useId();
  const descriptionId = useId();
  const hasCancelAction = type !== "info";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }

    if (open && !dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialog.showModal();

      const initialTarget = hasCancelAction
        ? cancelRef.current
        : actionRef.current;
      initialTarget?.focus();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
      document.body.style.overflow = bodyOverflowRef.current;
      if (returnFocusRef.current?.isConnected) {
        returnFocusRef.current.focus();
      }
      returnFocusRef.current = null;
    }
  }, [hasCancelAction, open]);

  useEffect(
    () => () => {
      const dialog = dialogRef.current;
      if (dialog?.open) {
        dialog.close();
      }
      document.body.style.overflow = bodyOverflowRef.current;
      if (returnFocusRef.current?.isConnected) {
        returnFocusRef.current.focus();
      }
    },
    [],
  );

  function handleCancel(event: React.SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    if (cancellable) {
      onClose();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }

    const focusableElements = getFocusableElements(dialog);
    const first = focusableElements[0];
    const last = focusableElements.at(-1);
    if (first === undefined || last === undefined) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!dialog.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      data-size={size}
      data-type={type}
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      aria-modal="true"
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.content}>
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        {description !== undefined ? (
          <div
            className={
              type === "destructive"
                ? styles.destructiveDescription
                : styles.description
            }
            id={descriptionId}
          >
            {description}
          </div>
        ) : null}
        {children}
        {type === "destructive" && destructiveContext !== undefined ? (
          <div className={styles.destructiveContext}>{destructiveContext}</div>
        ) : null}
      </div>

      <div className={styles.actions}>
        {hasCancelAction ? (
          <button
            ref={cancelRef}
            className={styles.cancelAction}
            type="button"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
        ) : null}
        <button
          ref={actionRef}
          className={
            type === "destructive"
              ? styles.destructiveAction
              : styles.primaryAction
          }
          type="button"
          disabled={action.disabled}
          onClick={action.onAction}
        >
          {action.label}
        </button>
      </div>
    </dialog>
  );
}
