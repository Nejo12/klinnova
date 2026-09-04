"use client";

import { useActionState } from "react";

import { loginAction, type AuthActionState } from "@/app/auth/actions";
import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./auth-form.module.scss";

const initialState: AuthActionState = {
  error: null,
  message: null,
};

type LoginFormProps = {
  /** Empty string means no intent (role-choice may apply after sign-in). */
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const { t } = useLocale();

  return (
    <form className={styles.form} action={formAction} noValidate>
      <input type="hidden" name="next" value={nextPath} />

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

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          {t("auth.password")}
        </label>
        <input
          className={styles.input}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </div>

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </button>
    </form>
  );
}
