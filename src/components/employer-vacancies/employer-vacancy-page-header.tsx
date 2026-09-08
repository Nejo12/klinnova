"use client";

import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

import responsiveStyles from "./employer-vacancy-page-header.module.scss";

type EmployerVacancyPageHeaderProps = {
  showCandidate: boolean;
  showEmployer: boolean;
  currentPath:
    "home" | "vacancies" | "applications" | "verification" | "account";
  /** N4: unseen-application count for the Applications nav indicator. No badge when 0/omitted. */
  unseenApplicationsCount?: number;
};

export function EmployerVacancyPageHeader({
  showCandidate,
  showEmployer,
  currentPath,
  unseenApplicationsCount,
}: EmployerVacancyPageHeaderProps) {
  const { locale, t } = useLocale();
  return (
    <div className={`${styles.header} ${responsiveStyles.header}`}>
      <div className={responsiveStyles.topRow}>
        <Link className={styles.brand} href="/">
          Klinnova
        </Link>
        <div className={responsiveStyles.utilities}>
          <WorkspaceSwitcher
            current="employer"
            hasCandidate={showCandidate}
            hasEmployer={showEmployer}
          />
          <LogoutButton />
        </div>
      </div>
      <nav
        className={responsiveStyles.primaryNav}
        aria-label={t("employer.nav.label")}
      >
        <ul className={`${styles.appNav} ${responsiveStyles.appNav}`}>
          <li>
            <Link
              className={styles.appNavLink}
              href="/employer"
              aria-label={t("employer.nav.home")}
              aria-current={currentPath === "home" ? "page" : undefined}
            >
              <span className={responsiveStyles.desktopHomeLabel}>
                {t("employer.nav.home")}
              </span>
              <span className={responsiveStyles.mobileHomeLabel}>
                {locale === "de" ? "Start" : "Home"}
              </span>
            </Link>
          </li>
          <li>
            <Link
              className={styles.appNavLink}
              href="/employer/vacancies"
              aria-current={currentPath === "vacancies" ? "page" : undefined}
            >
              {t("employer.nav.vacancies")}
            </Link>
          </li>
          <li>
            <Link
              className={styles.appNavLink}
              href="/employer/applications"
              aria-current={currentPath === "applications" ? "page" : undefined}
            >
              {t("employer.nav.applications")}
              {unseenApplicationsCount !== undefined &&
                unseenApplicationsCount > 0 && (
                  <>
                    {" "}
                    <span className={styles.navBadge}>
                      {unseenApplicationsCount}
                      <span className={styles.srOnly}>
                        {" "}
                        {t("employer.nav.newApplications")}
                      </span>
                    </span>
                  </>
                )}
            </Link>
          </li>
          <li>
            <Link
              className={styles.appNavLink}
              href="/employer/verification"
              aria-current={currentPath === "verification" ? "page" : undefined}
            >
              {t("employer.nav.verification")}
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
