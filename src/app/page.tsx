import { Homepage } from "@/components/homepage/homepage";
import { loadPublicVacancies } from "@/lib/public-jobs/load-public-vacancies";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const jobsResult = await loadPublicVacancies(supabase);

  return <Homepage jobsResult={jobsResult} />;
}
