"use client";

import { useActionState } from "react";

import {
  requestPasswordResetAction,
  type ForgotPasswordActionState,
} from "@/app/forgot-password/actions";
import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./auth-form.module.scss";

const initialState: ForgotPasswordActionState = { error: null, message: null };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );
  const { t } = useLocale();

  if (state.message !== null)
    return (
      <p className={styles.message} role="status">
        {state.message}
      </p>
    );

  return (
    <form className={styles.form} action={formAction} noValidate>
      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          {t("auth.email")}
        </label>
        <input
          className={styles.input}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
        />
      </div>
      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? t("auth.sending") : t("auth.sendReset")}
      </button>
    </form>
  );
}
