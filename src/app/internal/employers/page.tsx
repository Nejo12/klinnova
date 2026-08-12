import { redirect } from "next/navigation";

import { EmployerList } from "@/components/internal-moderation/employer-list";
import { InternalModerationUnavailable } from "@/components/internal-moderation/internal-moderation-unavailable";
import { ModerationPagination } from "@/components/internal-moderation/moderation-pagination";
import styles from "@/components/internal-verification/internal-verification.module.scss";
import {
  EMPLOYERS_LIST_EMPTY,
  EMPLOYERS_LIST_LEAD,
} from "@/lib/internal/moderation/messages";
import { loadOperatorEmployers } from "@/lib/internal/moderation/load-employers";
import { parseModerationPage } from "@/lib/internal/moderation/pagination";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employers · Klinnova",
};

type InternalEmployersPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function InternalEmployersPage({
  searchParams,
}: InternalEmployersPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = parseModerationPage(resolvedSearchParams.page);

  const supabase = await createServerSupabaseClient();
  const loaded = await loadOperatorEmployers(supabase, page);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/internal/employers");
    }
    return <InternalModerationUnavailable />;
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Employers</h1>
      <p className={styles.lead}>{EMPLOYERS_LIST_LEAD}</p>

      {loaded.rows.length === 0 && page.page === 1 ? (
        <p className={styles.empty}>{EMPLOYERS_LIST_EMPTY}</p>
      ) : (
        <>
          <EmployerList rows={loaded.rows} />
          <ModerationPagination
            basePath="/internal/employers"
            page={page.page}
            rowCount={loaded.rows.length}
            limit={page.limit}
          />
        </>
      )}
    </main>
  );
}
