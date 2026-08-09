"use client";

import { useActionState } from "react";

import {
  requestPasswordResetAction,
  type ForgotPasswordActionState,
} from "@/app/forgot-password/actions";

import styles from "./auth-form.module.scss";

const initialState: ForgotPasswordActionState = {
  error: null,
  message: null,
};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  if (state.message !== null) {
    return (
      <p className={styles.message} role="status">
        {state.message}
      </p>
    );
  }

  return (
    <form className={styles.form} action={formAction} noValidate>
      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          Email
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
        {pending ? "Sending…" : "Send reset instructions"}
      </button>
    </form>
  );
}
