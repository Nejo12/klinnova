import { Homepage } from "@/components/homepage/homepage";
import { resolvePostAuthDestination } from "@/lib/employer/capability-routing";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadPublicVacancies } from "@/lib/public-jobs/load-public-vacancies";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active-workspace";
import { readActiveWorkspace } from "@/lib/workspace/active-workspace.server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const jobsResult = await loadPublicVacancies(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    return <Homepage jobsResult={jobsResult} />;
  }

  const capabilities = (await loadAccountCapabilities(supabase)) ?? {
    hasCandidateProfile: false,
    hasEmployerProfile: false,
  };
  const preference = await readActiveWorkspace();
  const workspace = resolveActiveWorkspace({ capabilities, preference });
  const destination = resolvePostAuthDestination({
    intentPath: null,
    capabilities,
    activeWorkspace: preference,
  });

  return (
    <Homepage
      jobsResult={jobsResult}
      viewer={{
        destination:
          destination.kind === "role_choice"
            ? "/account/choose"
            : destination.href,
        workspace,
      }}
    />
  );
}
