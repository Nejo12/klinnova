import { redirect } from "next/navigation";
import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
import { CandidateNotificationCentre } from "@/components/candidate-notifications/candidate-notification-centre";
import { loadCandidateNotifications } from "@/lib/candidate/notifications/load-candidate-notifications";
import { loadCandidateDisplayName } from "@/lib/auth/load-candidate-display-name";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import styles from "@/app/candidate/profile/profile.module.scss";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications · Klinnova" };
export default async function CandidateNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadCandidateNotifications(supabase);
  if (loaded.status === "unauthenticated")
    redirect("/login?next=/candidate/notifications");
  if (loaded.status === "profile_missing")
    redirect("/auth/error?reason=profile");
  if (loaded.status === "incomplete") redirect("/candidate/onboarding");
  const [capabilities, displayName, query] = await Promise.all([
    loadAccountCapabilities(supabase),
    loadCandidateDisplayName(supabase),
    searchParams,
  ]);
  const notifications = loaded.status === "ready" ? loaded.notifications : [];
  return (
    <main className={styles.page}>
      <CandidateAppHeader
        showEmployerNav={capabilities?.hasEmployerProfile === true}
        displayName={displayName}
        unreadNotificationsCount={
          loaded.status === "ready"
            ? notifications.filter((n) => n.read_at === null).length
            : undefined
        }
      />
      <CandidateNotificationCentre
        notifications={notifications}
        failed={loaded.status === "failure"}
        readFailed={query.error === "read"}
        now={new Date().toISOString()}
      />
    </main>
  );
}
