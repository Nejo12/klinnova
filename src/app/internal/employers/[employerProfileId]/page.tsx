import Link from "next/link";
import { redirect } from "next/navigation";

import { EmployerModerationDetail } from "@/components/internal-moderation/employer-moderation-detail";
import { InternalModerationUnavailable } from "@/components/internal-moderation/internal-moderation-unavailable";
import styles from "@/components/internal-verification/internal-verification.module.scss";
import { loadEmployerModeration } from "@/lib/internal/moderation/load-employer-moderation";
import { parseModerationPage } from "@/lib/internal/moderation/pagination";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type InternalEmployerDetailPageProps = {
  params: Promise<{ employerProfileId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export async function generateMetadata({
  params,
}: InternalEmployerDetailPageProps) {
  const { employerProfileId } = await params;
  return {
    title: "Employer moderation · Klinnova",
    description: `Operator moderation ${employerProfileId}`,
  };
}

export default async function InternalEmployerDetailPage({
  params,
  searchParams,
}: InternalEmployerDetailPageProps) {
  const { employerProfileId } = await params;
  const resolvedSearchParams = await searchParams;
  const vacancyPage = parseModerationPage(resolvedSearchParams.page);

  const supabase = await createServerSupabaseClient();
  const loaded = await loadEmployerModeration(
    supabase,
    employerProfileId,
    vacancyPage,
  );

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect(`/login?next=/internal/employers/${employerProfileId}`);
    }
    return <InternalModerationUnavailable />;
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>
        {loaded.employer.displayName ?? "Employer"}
      </h1>

      <EmployerModerationDetail
        employer={loaded.employer}
        vacancies={loaded.vacancies}
        vacancyPage={vacancyPage.page}
        vacancyLimit={vacancyPage.limit}
      />

      <p>
        <Link className={styles.linkButton} href="/internal/employers">
          Back to employers
        </Link>
      </p>
    </main>
  );
}
