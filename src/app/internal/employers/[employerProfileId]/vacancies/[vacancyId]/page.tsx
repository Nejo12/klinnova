import Link from "next/link";
import { redirect } from "next/navigation";

import { InternalModerationUnavailable } from "@/components/internal-moderation/internal-moderation-unavailable";
import { VacancyModerationDetail } from "@/components/internal-moderation/vacancy-moderation-detail";
import styles from "@/components/internal-verification/internal-verification.module.scss";
import { loadVacancyModeration } from "@/lib/internal/moderation/load-vacancy-moderation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type InternalVacancyDetailPageProps = {
  params: Promise<{ employerProfileId: string; vacancyId: string }>;
};

export async function generateMetadata({
  params,
}: InternalVacancyDetailPageProps) {
  const { vacancyId } = await params;
  return {
    title: "Vacancy moderation · Klinnova",
    description: `Operator moderation ${vacancyId}`,
  };
}

export default async function InternalVacancyDetailPage({
  params,
}: InternalVacancyDetailPageProps) {
  const { employerProfileId, vacancyId } = await params;
  const supabase = await createServerSupabaseClient();
  const loaded = await loadVacancyModeration(
    supabase,
    employerProfileId,
    vacancyId,
  );

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect(
        `/login?next=/internal/employers/${employerProfileId}/vacancies/${vacancyId}`,
      );
    }
    return <InternalModerationUnavailable />;
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>{loaded.vacancy.title}</h1>

      <VacancyModerationDetail vacancy={loaded.vacancy} />

      <p>
        <Link
          className={styles.linkButton}
          href={`/internal/employers/${employerProfileId}`}
        >
          Back to employer
        </Link>
      </p>
    </main>
  );
}
