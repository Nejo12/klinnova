import Link from "next/link";
import { redirect } from "next/navigation";

import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
import { LogoutButton } from "@/components/auth/logout-button";
import {
  CANDIDATE_EXPORT_BUTTON_LABEL,
  CANDIDATE_EXPORT_LEAD,
} from "@/lib/account-export/messages";
import { DELETE_ACCOUNT_HEADING } from "@/lib/account-deletion/messages";
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

  const capabilities = await loadAccountCapabilities(supabase);
  const showEmployerNav = capabilities?.hasEmployerProfile === true;

  return (
    <main className={styles.page}>
      <CandidateAppHeader current="account" showEmployerNav={showEmployerNav} />

      <h1 className={styles.heading}>Account</h1>
      <p className={styles.lead}>
        Download your data, delete your account, or sign out.
      </p>

      <section
        className={styles.section}
        aria-labelledby="account-export-heading"
      >
        <h2 className={styles.heading} id="account-export-heading">
          Your data
        </h2>
        <p className={styles.note}>{CANDIDATE_EXPORT_LEAD}</p>
        <p>
          {/* Plain anchor, not next/link: this is a real file download from
              a Route Handler, not a client-side page transition. The
              server's Content-Disposition header is the authoritative
              download mechanism, not this element. */}
          <a className={styles.secondaryLink} href="/candidate/account/export">
            {CANDIDATE_EXPORT_BUTTON_LABEL}
          </a>
        </p>
      </section>

      <section
        className={styles.section}
        aria-labelledby="account-delete-heading"
      >
        <h2 className={styles.heading} id="account-delete-heading">
          Delete account
        </h2>
        <p>
          <Link
            className={styles.secondaryLink}
            href="/candidate/account/delete"
          >
            {DELETE_ACCOUNT_HEADING}
          </Link>
        </p>
      </section>

      <section
        className={styles.section}
        aria-labelledby="account-signout-heading"
      >
        <h2 className={styles.heading} id="account-signout-heading">
          Sign out
        </h2>
        <LogoutButton />
      </section>
    </main>
  );
}
