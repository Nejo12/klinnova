"use client";

import Link from "next/link";

import { activateWorkspaceAction } from "@/app/account/workspace-actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { Popover } from "@/components/popover-menu/popover-menu";
import type { ActiveWorkspace } from "@/lib/workspace/active-workspace";

import styles from "./workspace-switcher.module.scss";

type WorkspaceSwitcherProps = {
  current: ActiveWorkspace;
  hasCandidate: boolean;
  hasEmployer: boolean;
};

export function WorkspaceSwitcher({
  current,
  hasCandidate,
  hasEmployer,
}: WorkspaceSwitcherProps) {
  const { t } = useLocale();
  const currentLabel =
    current === "candidate"
      ? t("workspace.candidate")
      : t("workspace.employer");
  const otherWorkspace: ActiveWorkspace =
    current === "candidate" ? "employer" : "candidate";
  const otherAvailable =
    otherWorkspace === "candidate" ? hasCandidate : hasEmployer;
  const otherLabel =
    otherWorkspace === "candidate"
      ? t("workspace.candidate")
      : t("workspace.employer");
  const addCapabilityLabel =
    otherWorkspace === "candidate"
      ? t("workspace.alsoCandidate")
      : t("workspace.alsoEmployer");

  return (
    <Popover
      align="end"
      title={t("workspace.switch")}
      trigger={
        <button
          className={styles.trigger}
          type="button"
          aria-label={`${t("workspace.menu")}: ${currentLabel}`}
        >
          <span>{currentLabel}</span>
          <span aria-hidden="true">⌄</span>
        </button>
      }
      action={
        <Link
          className={styles.securityLink}
          href={
            current === "candidate" ? "/candidate/account" : "/employer/account"
          }
        >
          {t("workspace.security")}
        </Link>
      }
    >
      <div className={styles.options}>
        <div className={styles.current} aria-current="true">
          <span>{currentLabel}</span>
          <span className={styles.currentStatus}>
            <span aria-hidden="true">✓</span> {t("workspace.current")}
          </span>
        </div>

        <form action={activateWorkspaceAction}>
          <input type="hidden" name="workspace" value={otherWorkspace} />
          <button className={styles.switchAction} type="submit">
            {otherAvailable ? otherLabel : addCapabilityLabel}
          </button>
        </form>
      </div>
    </Popover>
  );
}
