import { redirect } from "next/navigation";

import {
  cancelEmployerAccountDeletionAction,
  confirmEmployerAccountDeletionAction,
} from "@/app/employer/account/delete/actions";
import { DeleteAccountPanel } from "@/components/account-deletion/delete-account-panel";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Delete account · Stint",
};

export default async function EmployerDeleteAccountPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect("/login?next=/employer/account/delete");
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const dualCapability =
    capabilities?.hasCandidateProfile === true &&
    capabilities.hasEmployerProfile === true;

  return (
    <DeleteAccountPanel
      dualCapability={dualCapability}
      confirmAction={confirmEmployerAccountDeletionAction}
      cancelAction={cancelEmployerAccountDeletionAction}
    />
  );
}
