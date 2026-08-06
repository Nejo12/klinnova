import { notFound } from "next/navigation";
import { cache } from "react";

import { PublicJobDetailPage } from "@/components/public-jobs/public-job-detail-page";
import { loadPublicVacancyDetail } from "@/lib/public-jobs/load-public-vacancy-detail";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PublicJobDetailRouteProps = {
  params: Promise<{ vacancyId: string }>;
};

const getDetail = cache(async (vacancyId: string) => {
  const supabase = await createServerSupabaseClient();
  return loadPublicVacancyDetail(supabase, vacancyId);
});

export async function generateMetadata({ params }: PublicJobDetailRouteProps) {
  const { vacancyId } = await params;
  const result = await getDetail(vacancyId);
  if (result.status !== "ready") {
    return { title: "Job not found · Stint" };
  }
  const description = (result.vacancy.description ?? "").slice(0, 160);
  return {
    title: `${result.vacancy.title} · Stint`,
    description: description.length > 0 ? description : undefined,
  };
}

export default async function PublicJobDetailRoutePage({
  params,
}: PublicJobDetailRouteProps) {
  const { vacancyId } = await params;
  const result = await getDetail(vacancyId);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "failure") {
    return <PublicJobDetailPage status="failure" />;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PublicJobDetailPage
      status="ready"
      vacancy={result.vacancy}
      languages={result.languages}
      authenticated={user !== null}
    />
  );
}
