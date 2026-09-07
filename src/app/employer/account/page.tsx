import Link from "next/link";
import { redirect } from "next/navigation";

import styles from "@/app/employer/employer-home.module.scss";
import { SessionSecurity } from "@/components/auth/session-security";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import {
  EMPLOYER_EXPORT_BUTTON_LABEL,
  EMPLOYER_EXPORT_LEAD,
} from "@/lib/account-export/messages";
import { DELETE_ACCOUNT_HEADING } from "@/lib/account-deletion/messages";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employer account · Klinnova",
};

export default async function EmployerAccountPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect("/login?next=/employer/account");
  }

  const capabilities = await loadAccountCapabilities(supabase);
  if (capabilities?.hasEmployerProfile !== true) {
    redirect("/employer/onboarding");
  }

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities.hasCandidateProfile}
        showEmployer
        currentPath="account"
      />

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1 className={styles.heading}>Account</h1>
          <p className={styles.lead}>
            Manage your employer data and Klinnova sessions.
          </p>
        </div>
      </header>

      <section
        className={styles.accountSection}
        aria-labelledby="account-data-heading"
      >
        <div>
          <h2 id="account-data-heading" className={styles.sectionHeading}>
            Account data
          </h2>
          <p className={styles.note}>{EMPLOYER_EXPORT_LEAD}</p>
        </div>
        <div className={styles.accountActions}>
          <a className={styles.textLink} href="/employer/account/export">
            {EMPLOYER_EXPORT_BUTTON_LABEL}
          </a>
          <Link className={styles.textLink} href="/employer/account/delete">
            {DELETE_ACCOUNT_HEADING}
          </Link>
        </div>
      </section>

      <SessionSecurity />
    </main>
  );
}
