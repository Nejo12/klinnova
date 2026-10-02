"use client";
import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  EmailPreferenceSwitch,
  type SaveEmailPreference,
} from "@/components/notification-preferences/email-preference-switch";
import styles from "./notification-preferences.module.scss";

export function NotificationPreferences({
  role,
  initialEnabled,
  save,
}: {
  role: "candidate" | "employer";
  initialEnabled: boolean | null;
  save: SaveEmailPreference;
}) {
  const { t } = useLocale();
  return (
    <section
      className={styles.centre}
      aria-labelledby="notification-preferences-heading"
    >
      <h1 id="notification-preferences-heading" className={styles.heading}>
        {t(`notificationPreferences.${role}.heading`)}
      </h1>
      <p className={styles.lead}>{t(`notificationPreferences.${role}.lead`)}</p>
      {initialEnabled === null ? (
        <p role="alert">{t("notificationPreferences.loadFailed")}</p>
      ) : null}
      <div className={styles.columns} aria-hidden="true">
        <span>{t("notificationPreferences.category")}</span>
        <span>{t("notificationPreferences.email")}</span>
        <span>{t("notificationPreferences.push")}</span>
      </div>
      <h2 className={styles.group}>
        {t(`notificationPreferences.${role}.group`)}
      </h2>
      <div className={styles.row}>
        <div className={styles.copy}>
          <h3>{t(`notificationPreferences.${role}.category`)}</h3>
          <p>{t(`notificationPreferences.${role}.description`)}</p>
        </div>
        <EmailPreferenceSwitch initialEnabled={initialEnabled} save={save} />
        <div className={styles.push}>
          <span className={styles.channelLabel}>
            {t("notificationPreferences.push")}
          </span>
          <span>{t("notificationPreferences.comingLater")}</span>
        </div>
      </div>
      <Link className={styles.back} href={`/${role}/account`}>
        {t("notificationPreferences.back")}
      </Link>
    </section>
  );
}
