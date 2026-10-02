import { redirect } from "next/navigation";
import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
import { loadCandidateDisplayName } from "@/lib/auth/load-candidate-display-name";
import { NotificationPreferences } from "@/components/notification-preferences/notification-preferences";
import { loadCurrentEmailPreference } from "@/lib/notification-preferences/current-preference";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveCandidateEmailPreference } from "@/app/candidate/account/notifications/actions";
import styles from "@/app/candidate/page.module.scss";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Candidate notification preferences · Klinnova",
};
export default async function CandidateNotificationPreferencesPage() {
  const preference = await loadCurrentEmailPreference(
    "candidate_application_updates",
  );
  if (preference.status === "unauthenticated")
    redirect("/login?next=/candidate/account/notifications");
  if (preference.status === "unavailable") redirect("/candidate/onboarding");
  const supabase = await createServerSupabaseClient();
  const [capabilities, displayName] = await Promise.all([
    loadAccountCapabilities(supabase),
    loadCandidateDisplayName(supabase),
  ]);
  return (
    <main className={styles.page}>
      <CandidateAppHeader
        current="account"
        showEmployerNav={capabilities?.hasEmployerProfile === true}
        displayName={displayName}
      />
      <NotificationPreferences
        role="candidate"
        initialEnabled={
          preference.status === "ready" ? preference.enabled : null
        }
        save={saveCandidateEmailPreference}
      />
    </main>
  );
}
