import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { CapabilityNav } from "@/components/employer-onboarding/capability-nav";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

type EmployerVacancyPageHeaderProps = {
  showCandidate: boolean;
  showEmployer: boolean;
  currentPath: "home" | "vacancies" | "verification";
};

export function EmployerVacancyPageHeader({
  showCandidate,
  showEmployer,
  currentPath,
}: EmployerVacancyPageHeaderProps) {
  return (
    <div className={styles.header}>
      <Link className={styles.brand} href="/">
        Stint
      </Link>
      <div className={styles.headerActions}>
        <nav aria-label="Employer">
          <ul className={styles.appNav}>
            <li>
              <Link
                className={styles.appNavLink}
                href="/employer"
                aria-current={currentPath === "home" ? "page" : undefined}
              >
                Employer home
              </Link>
            </li>
            <li>
              <Link
                className={styles.appNavLink}
                href="/employer/vacancies"
                aria-current={currentPath === "vacancies" ? "page" : undefined}
              >
                Vacancies
              </Link>
            </li>
            <li>
              <Link
                className={styles.appNavLink}
                href="/employer/verification"
                aria-current={
                  currentPath === "verification" ? "page" : undefined
                }
              >
                Verification
              </Link>
            </li>
          </ul>
        </nav>
        <CapabilityNav
          showCandidate={showCandidate}
          showEmployer={showEmployer}
          current="employer"
        />
        <LogoutButton />
      </div>
    </div>
  );
}
