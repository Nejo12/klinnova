"use client";

import { useActionState } from "react";

import {
  continueToSignInAction,
  updatePasswordAction,
  type ResetPasswordActionState,
} from "@/app/reset-password/actions";
import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./auth-form.module.scss";

const initialState: ResetPasswordActionState = {
  error: null,
  message: null,
};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );
  const { t } = useLocale();

  if (state.message !== null) {
    return (
      <>
        <p className={styles.message} role="status">
          {state.message}
        </p>
        <form action={continueToSignInAction}>
          <button className={styles.submit} type="submit">
            {t("auth.continueSignIn")}
          </button>
        </form>
      </>
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
        <label className={styles.label} htmlFor="password">
          {t("auth.newPassword")}
        </label>
        <input
          className={styles.input}
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={pending}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="confirmPassword">
          {t("auth.confirmNewPassword")}
        </label>
        <input
          className={styles.input}
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={pending}
        />
      </div>

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? t("auth.settingPassword") : t("auth.setNewPassword")}
      </button>
    </form>
  );
}
