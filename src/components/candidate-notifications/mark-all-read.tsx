"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@nova-component/ui";
import styles from "./candidate-notification-centre.module.scss";
import { useLocale } from "@/components/i18n/locale-provider";

export function MarkAllRead({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const { t } = useLocale();
  return (
    <Button
      type="submit"
      variant="secondary"
      className={styles.markAll}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {t("candidate.notifications.markAllRead")}
    </Button>
  );
}
