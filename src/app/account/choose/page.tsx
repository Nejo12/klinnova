import Link from "next/link";
import { redirect } from "next/navigation";

import { activateWorkspaceAction } from "@/app/account/workspace-actions";
import { LogoutButton } from "@/components/auth/logout-button";
import { LocalizedText } from "@/components/i18n/localized-text";
import styles from "@/components/employer-onboarding/employer-onboarding.module.scss";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  resolveActiveWorkspace,
  workspaceHref,
} from "@/lib/workspace/active-workspace";
import { readActiveWorkspace } from "@/lib/workspace/active-workspace.server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose where to continue · Klinnova",
};

/**
 * Legacy fallback for a dual-capability account with no safe browser-local
 * workspace preference. Ordinary sign-in bypasses this page once chosen.
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

  const resolvedWorkspace = resolveActiveWorkspace({
    capabilities,
    preference: await readActiveWorkspace(),
  });
  if (resolvedWorkspace !== null) {
    redirect(workspaceHref(resolvedWorkspace));
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.brand} href="/">
          Klinnova
        </Link>
        <LogoutButton />
      </div>

      <h1 className={styles.heading}>
        <LocalizedText message="workspace.chooseHeading" />
      </h1>
      <p className={styles.lead}>
        <LocalizedText message="workspace.chooseLead" />
      </p>

      <div className={styles.actions}>
        <form action={activateWorkspaceAction}>
          <input type="hidden" name="workspace" value="candidate" />
          <button className={styles.button} type="submit">
            <LocalizedText message="workspace.continueCandidate" />
          </button>
        </form>
        <form action={activateWorkspaceAction}>
          <input type="hidden" name="workspace" value="employer" />
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            type="submit"
          >
            <LocalizedText message="workspace.continueEmployer" />
          </button>
        </form>
      </div>
    </main>
  );
}
