"use client";
import { useId, useState, useTransition } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import styles from "./notification-preferences.module.scss";

export type SaveEmailPreference = (
  enabled: boolean,
) => Promise<{ status: "saved"; enabled: boolean } | { status: "failure" }>;
export function EmailPreferenceSwitch({
  initialEnabled,
  save,
}: {
  initialEnabled: boolean | null;
  save: SaveEmailPreference;
}) {
  const { t } = useLocale();
  const [enabled, setEnabled] = useState(initialEnabled ?? true);
  const [feedback, setFeedback] = useState<"saved" | "failure" | null>(null);
  const [pending, startTransition] = useTransition();
  const labelId = useId();
  if (initialEnabled === null)
    return (
      <div className={styles.emailControl}>
        <span className={styles.channelLabel}>
          {t("notificationPreferences.email")}
        </span>
        <span>{t("notificationPreferences.unavailable")}</span>
      </div>
    );
  return (
    <div className={styles.emailControl}>
      <span id={labelId} className={styles.channelLabel}>
        {t("notificationPreferences.email")}
      </span>
      <button
        type="button"
        role="switch"
        aria-labelledby={labelId}
        aria-checked={enabled}
        aria-busy={pending}
        disabled={pending}
        className={styles.switch}
        onClick={() => {
          const next = !enabled;
          setFeedback(null);
          startTransition(async () => {
            try {
              const result = await save(next);
              if (result.status === "saved") {
                setEnabled(result.enabled);
                setFeedback("saved");
              } else setFeedback("failure");
            } catch {
              setFeedback("failure");
            }
          });
        }}
      >
        <span className={styles.thumb} aria-hidden="true" />
      </button>
      <span className={styles.state}>
        {t(
          enabled
            ? "notificationPreferences.on"
            : "notificationPreferences.off",
        )}
      </span>
      <span role="status" className={styles.feedback}>
        {pending
          ? t("notificationPreferences.saving")
          : feedback === "saved"
            ? t("notificationPreferences.saved")
            : ""}
      </span>
      {feedback === "failure" ? (
        <span role="alert">{t("notificationPreferences.saveFailed")}</span>
      ) : null}
    </div>
  );
}
