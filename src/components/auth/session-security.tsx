"use client";

import { LogoutAllDevices } from "@/components/auth/logout-all-devices";
import { LogoutButton } from "@/components/auth/logout-button";
import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./session-security.module.scss";

export function SessionSecurity() {
  const { t } = useLocale();

  return (
    <section
      className={styles.section}
      aria-labelledby="session-security-heading"
    >
      <h2 className={styles.heading} id="session-security-heading">
        {t("account.sessionSecurity")}
      </h2>
      <div className={styles.actionGroup}>
        <div>
          <h3 className={styles.actionHeading}>{t("auth.logOut")}</h3>
          <p className={styles.description}>{t("account.logOutLocalHint")}</p>
        </div>
        <LogoutButton />
      </div>
      <div className={styles.actionGroup}>
        <div>
          <h3 className={styles.actionHeading}>{t("auth.logOutAll")}</h3>
          <p className={styles.description}>{t("account.logOutAllHint")}</p>
        </div>
        <LogoutAllDevices />
      </div>
    </section>
  );
}
