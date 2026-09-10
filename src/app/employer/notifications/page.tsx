import { redirect } from "next/navigation";

import { EmployerNotificationCentre } from "@/components/employer-notifications/employer-notification-centre";
import { EmployerRestrictedNotice } from "@/components/employer-shared/employer-restricted-notice";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/app/employer/employer-home.module.scss";
import { loadUnseenApplicationsCount } from "@/lib/employer/applications/load-unseen-applications-count";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadEmployerNotifications } from "@/lib/employer/notifications/load-employer-notifications";
import { loadCurrentEmployerSuspensionStatus } from "@/lib/employer/suspension-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications · Klinnova",
};

export default async function EmployerNotificationsPage() {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadEmployerNotifications(supabase);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/employer/notifications");
    }
    if (loaded.reason === "incomplete") {
      redirect("/employer/onboarding");
    }
    redirect("/auth/error?reason=profile");
  }

  const [capabilities, unseenApplicationsCount, suspension] = await Promise.all(
    [
      loadAccountCapabilities(supabase),
      loadUnseenApplicationsCount(supabase),
      loadCurrentEmployerSuspensionStatus(supabase),
    ],
  );

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="notifications"
        unseenApplicationsCount={unseenApplicationsCount}
      />
      {suspension.ok && suspension.suspended ? (
        <EmployerRestrictedNotice />
      ) : (
        <EmployerNotificationCentre notifications={loaded.notifications} />
      )}
    </main>
  );
}
