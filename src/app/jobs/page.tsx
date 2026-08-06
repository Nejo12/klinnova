import { PublicJobsPage } from "@/components/public-jobs/public-jobs-page";
import { loadPublicVacancies } from "@/lib/public-jobs/load-public-vacancies";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Jobs in Berlin · Stint",
  description:
    "Browse verified Berlin vacancies that do not require fluent German. Sign in to check your eligibility and apply.",
};

export default async function PublicJobsRoutePage() {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadPublicVacancies(supabase);

  if (!loaded.ok) {
    return <PublicJobsPage status="failure" />;
  }

  return <PublicJobsPage status="success" items={loaded.vacancies} />;
}
