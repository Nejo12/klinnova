"use client";

import { useState, useTransition } from "react";

import { logoutAllDevicesAction } from "@/app/auth/actions";
import { Dialog } from "@/components/dialog/dialog";
import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./logout-button.module.scss";

export function LogoutAllDevices() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { t } = useLocale();

  return (
    <>
      <button
        className={styles.button}
        type="button"
        onClick={() => setOpen(true)}
      >
        {t("auth.logOutAll")}
      </button>
      <Dialog
        open={open}
        type="confirmation"
        title={t("auth.logOutAll")}
        description={t("auth.logOutAllDescription")}
        cancelLabel={t("common.cancel")}
        onClose={() => setOpen(false)}
        action={{
          label: t("auth.logOutAllConfirm"),
          disabled: pending,
          onAction: () => {
            startTransition(async () => {
              await logoutAllDevicesAction();
            });
          },
        }}
      />
    </>
  );
}
