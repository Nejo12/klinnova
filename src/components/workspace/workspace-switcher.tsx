"use client";

import Link from "next/link";

import { activateWorkspaceAction } from "@/app/account/workspace-actions";
import { logoutAction } from "@/app/auth/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { Popover } from "@/components/popover-menu/popover-menu";
import type { ActiveWorkspace } from "@/lib/workspace/active-workspace";

import styles from "./workspace-switcher.module.scss";

type WorkspaceSwitcherProps = {
  current: ActiveWorkspace;
  hasCandidate: boolean;
  hasEmployer: boolean;
  displayName?: string | null;
};

export function WorkspaceSwitcher({
  current,
  hasCandidate,
  hasEmployer,
  displayName = null,
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
  const initials =
    current === "candidate" && displayName !== null
      ? displayName
          .trim()
          .split(/\s+/)
          .filter((part) => part.length > 0)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("")
      : null;

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
          {initials !== null && displayName !== null ? (
            <>
              <span className={styles.avatar} aria-hidden="true">
                {initials || "?"}
              </span>
              <span className={styles.identityName}>{displayName}</span>
            </>
          ) : (
            <span>{currentLabel}</span>
          )}
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
        {current === "candidate" && displayName !== null ? (
          <div className={styles.identitySummary}>
            <span className={styles.avatar} aria-hidden="true">
              {initials || "?"}
            </span>
            <span>
              <strong>{displayName}</strong>
              <small>{currentLabel}</small>
            </span>
          </div>
        ) : null}
        {current === "candidate" && displayName !== null ? (
          <Link className={styles.menuLink} href="/candidate/profile">
            {t("candidate.nav.profile")}
          </Link>
        ) : null}
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
        {current === "candidate" && displayName !== null ? (
          <form action={logoutAction}>
            <button className={styles.signOutAction} type="submit">
              {t("auth.logOut")}
            </button>
          </form>
        ) : null}
      </div>
    </Popover>
  );
}
