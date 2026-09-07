"use client";

import { logoutAction } from "@/app/auth/actions";
import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./logout-button.module.scss";

export function LogoutButton() {
  const { t } = useLocale();

  return (
    <form action={logoutAction}>
      <button className={styles.button} type="submit">
        {t("auth.logOut")}
      </button>
    </form>
  );
}
