import { redirect } from "next/navigation";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import { NotificationPreferences } from "@/components/notification-preferences/notification-preferences";
import { loadCurrentEmailPreference } from "@/lib/notification-preferences/current-preference";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveEmployerEmailPreference } from "@/app/employer/account/notifications/actions";
import styles from "@/app/employer/employer-home.module.scss";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Employer notification preferences · Klinnova",
};
export default async function EmployerNotificationPreferencesPage() {
  const preference = await loadCurrentEmailPreference(
    "employer_new_applicants",
  );
  if (preference.status === "unauthenticated")
    redirect("/login?next=/employer/account/notifications");
  if (preference.status === "unavailable") redirect("/employer/onboarding");
  const supabase = await createServerSupabaseClient();
  const capabilities = await loadAccountCapabilities(supabase);

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        currentPath="account"
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer
      />
      <NotificationPreferences
        role="employer"
        initialEnabled={
          preference.status === "ready" ? preference.enabled : null
        }
        save={saveEmployerEmailPreference}
      />
    </main>
  );
}
