import Link from "next/link";
import { redirect } from "next/navigation";

import styles from "@/app/employer/employer-home.module.scss";
import { SessionSecurity } from "@/components/auth/session-security";
import { LocalizedText } from "@/components/i18n/localized-text";
import { LanguagePreferenceControl } from "@/components/i18n/language-preference-control";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import { ThemePreferenceControl } from "@/components/theme/theme-preference-control";
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
          <h1 className={styles.heading}>
            <LocalizedText message="employer.account.heading" />
          </h1>
          <p className={styles.lead}>
            <LocalizedText message="employer.account.lead" />
          </p>
        </div>
      </header>

      <section
        className={styles.preferencesSection}
        aria-labelledby="appearance-heading"
      >
        <h2 id="appearance-heading" className={styles.sectionHeading}>
          <LocalizedText message="theme.legend" />
        </h2>
        <ThemePreferenceControl />
        <LanguagePreferenceControl />
      </section>

      <section
        className={styles.accountSection}
        aria-labelledby="account-data-heading"
      >
        <div>
          <h2 id="account-data-heading" className={styles.sectionHeading}>
            <LocalizedText message="employer.account.data" />
          </h2>
          <p className={styles.note}>
            <LocalizedText message="employer.account.exportLead" />
          </p>
        </div>
        <div className={styles.accountActions}>
          <a className={styles.textLink} href="/employer/account/export">
            <LocalizedText message="employer.account.export" />
          </a>
        </div>
      </section>

      <section
        className={styles.accountSection}
        aria-labelledby="account-delete-heading"
      >
        <h2 id="account-delete-heading" className={styles.sectionHeading}>
          <LocalizedText message="employer.account.delete" />
        </h2>
        <Link className={styles.textLink} href="/employer/account/delete">
          <LocalizedText message="employer.account.delete" />
        </Link>
      </section>

      <p>
        <Link
          className={styles.textLink}
          href="/employer/account/notifications"
        >
          <LocalizedText message="notificationPreferences.destination" />
        </Link>
      </p>

      <SessionSecurity />
    </main>
  );
}
