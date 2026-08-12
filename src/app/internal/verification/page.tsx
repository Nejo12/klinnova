import { redirect } from "next/navigation";

import { InternalUnavailable } from "@/components/internal-verification/internal-unavailable";
import styles from "@/components/internal-verification/internal-verification.module.scss";
import { PendingVerificationList } from "@/components/internal-verification/pending-verification-list";
import {
  INTERNAL_QUEUE_EMPTY,
  INTERNAL_QUEUE_LEAD,
} from "@/lib/internal/verification/messages";
import { loadPendingVerificationQueue } from "@/lib/internal/verification/load-pending-queue";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verification queue · Klinnova",
};

export default async function InternalVerificationQueuePage() {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadPendingVerificationQueue(supabase);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/internal/verification");
    }
    return <InternalUnavailable />;
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Verification queue</h1>
      <p className={styles.lead}>{INTERNAL_QUEUE_LEAD}</p>
      <p className={styles.count}>
        {loaded.rows.length}{" "}
        {loaded.rows.length === 1 ? "pending request" : "pending requests"}
      </p>

      {loaded.rows.length === 0 ? (
        <p className={styles.empty}>{INTERNAL_QUEUE_EMPTY}</p>
      ) : (
        <PendingVerificationList rows={loaded.rows} />
      )}
    </main>
  );
}
