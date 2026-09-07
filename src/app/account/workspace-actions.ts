"use server";

import { redirect } from "next/navigation";

import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isActiveWorkspace,
  workspaceHref,
} from "@/lib/workspace/active-workspace";
import { writeActiveWorkspace } from "@/lib/workspace/active-workspace.server";

/**
 * The only mutation performed here is the browser-local workspace cookie.
 * Profile creation remains in the existing candidate/employer onboarding
 * flows and all route/RLS checks remain authoritative.
 */
export async function activateWorkspaceAction(
  formData: FormData,
): Promise<void> {
  const requested = formData.get("workspace");
  if (!isActiveWorkspace(requested)) {
    redirect("/account/choose");
  }

  const supabase = await createServerSupabaseClient();
  const capabilities = await loadAccountCapabilities(supabase);
  if (capabilities === null) {
    redirect("/login");
  }

  await writeActiveWorkspace(requested);

  if (requested === "employer" && !capabilities.hasEmployerProfile) {
    redirect("/employer/onboarding");
  }

  redirect(workspaceHref(requested));
}
