import Link from "next/link";
import { redirect } from "next/navigation";

import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
import { LocalizedText } from "@/components/i18n/localized-text";
import { SessionSecurity } from "@/components/auth/session-security";
import { loadCandidateDisplayName } from "@/lib/auth/load-candidate-display-name";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import styles from "../page.module.scss";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account · Klinnova",
};

export default async function CandidateAccountPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect("/login?next=/candidate/account");
  }

  const [capabilities, displayName] = await Promise.all([
    loadAccountCapabilities(supabase),
    loadCandidateDisplayName(supabase),
  ]);
  const showEmployerNav = capabilities?.hasEmployerProfile === true;

  return (
    <main className={styles.page}>
      <CandidateAppHeader
        current="account"
        showEmployerNav={showEmployerNav}
        displayName={displayName}
      />

      <h1 className={styles.heading}>
        <LocalizedText message="candidate.account.heading" />
      </h1>
      <p className={styles.lead}>
        <LocalizedText message="candidate.account.lead" />
      </p>

      <section
        className={styles.section}
        aria-labelledby="account-export-heading"
      >
        <h2 className={styles.heading} id="account-export-heading">
          <LocalizedText message="candidate.account.yourData" />
        </h2>
        <p className={styles.note}>
          <LocalizedText message="candidate.account.exportLead" />
        </p>
        <p>
          {/* Plain anchor, not next/link: this is a real file download from
              a Route Handler, not a client-side page transition. The
              server's Content-Disposition header is the authoritative
              download mechanism, not this element. */}
          <a className={styles.secondaryLink} href="/candidate/account/export">
            <LocalizedText message="candidate.account.exportAction" />
          </a>
        </p>
      </section>

      <section
        className={styles.section}
        aria-labelledby="account-delete-heading"
      >
        <h2 className={styles.heading} id="account-delete-heading">
          <LocalizedText message="candidate.account.deleteSection" />
        </h2>
        <p>
          <Link
            className={styles.secondaryLink}
            href="/candidate/account/delete"
          >
            <LocalizedText message="candidate.account.deleteHeading" />
          </Link>
        </p>
      </section>

      <p>
        <Link
          className={styles.secondaryLink}
          href="/candidate/account/notifications"
        >
          <LocalizedText message="notificationPreferences.destination" />
        </Link>
      </p>

      <SessionSecurity />
    </main>
  );
}
