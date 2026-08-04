import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import styles from "@/components/employer-onboarding/employer-onboarding.module.scss";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose where to continue · Stint",
};

/**
 * Explicit role-choice when a dual-capability user signs in without intent (D-047).
 * No hidden default-role preference is stored.
 */
export default async function AccountChoosePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect("/login");
  }

  const capabilities = await loadAccountCapabilities(supabase);
  if (capabilities === null) {
    redirect("/auth/error?reason=profile");
  }

  if (!(capabilities.hasCandidateProfile && capabilities.hasEmployerProfile)) {
    if (capabilities.hasEmployerProfile) {
      redirect("/employer");
    }
    redirect("/candidate");
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.brand} href="/">
          Stint
        </Link>
        <LogoutButton />
      </div>

      <h1 className={styles.heading}>Choose where to continue</h1>
      <p className={styles.lead}>
        This account has both candidate and employer profiles. Pick the space
        you want to open. Nothing is chosen for you automatically.
      </p>

      <div className={styles.actions}>
        <Link className={styles.button} href="/candidate">
          Continue as candidate
        </Link>
        <Link
          className={`${styles.button} ${styles.buttonSecondary}`}
          href="/employer"
        >
          Continue as employer
        </Link>
      </div>
    </main>
  );
}
