"use client";

import { useActionState } from "react";

import { registerAction, type AuthActionState } from "@/app/auth/actions";
import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./auth-form.module.scss";

const initialState: AuthActionState = {
  error: null,
  message: null,
};

type RegisterFormProps = {
  /** Validated internal next path preserved through signup confirmation. */
  nextPath?: string;
};

export function RegisterForm({ nextPath }: RegisterFormProps) {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );
  const { t } = useLocale();

  return (
    <form className={styles.form} action={formAction} noValidate>
      {nextPath !== undefined ? (
        <input type="hidden" name="next" value={nextPath} />
      ) : null}

      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      {state.message !== null ? (
        <p className={styles.message} role="status">
          {state.message}
        </p>
      ) : null}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="displayName">
          {t("auth.displayName")}
        </label>
        <input
          className={styles.input}
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="nickname"
          required
          maxLength={80}
          disabled={pending}
        />
      </div>

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
          autoComplete="new-password"
          required
          minLength={8}
          disabled={pending}
        />
      </div>

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? t("auth.creatingAccount") : t("auth.createAccount")}
      </button>
    </form>
  );
}
