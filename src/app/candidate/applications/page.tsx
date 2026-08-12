import { redirect } from "next/navigation";

import { resolveInventoryPageView } from "@/app/candidate/applications/resolve-inventory-view";
import { ApplicationInventoryList } from "@/components/candidate-applications/application-inventory-list";
import { ApplicationsEmptyState } from "@/components/candidate-applications/applications-empty-state";
import { ApplicationsErrorState } from "@/components/candidate-applications/applications-error-state";
import { CandidateApplicationsPageHeader } from "@/components/candidate-applications/candidate-applications-page-header";
import styles from "@/components/candidate-matches/candidate-matches.module.scss";
import { loadCandidateApplicationInventory } from "@/lib/applications/load-candidate-application-inventory";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Applications · Klinnova",
};

export default async function CandidateApplicationsRoutePage() {
  const supabase = await createServerSupabaseClient();
  const result = await loadCandidateApplicationInventory(supabase);
  const view = resolveInventoryPageView(result);

  if (view.kind === "redirect") {
    redirect(view.href);
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const showEmployerNav = capabilities?.hasEmployerProfile === true;

  return (
    <main className={styles.page}>
      <CandidateApplicationsPageHeader showEmployerNav={showEmployerNav} />
      <h1 className={styles.heading}>Your applications</h1>
      {view.kind === "failure" ? (
        <ApplicationsErrorState />
      ) : view.applications.length === 0 ? (
        <ApplicationsEmptyState />
      ) : (
        <ApplicationInventoryList applications={view.applications} />
      )}
    </main>
  );
}
