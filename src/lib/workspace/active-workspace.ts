import type { AccountCapabilities } from "@/lib/employer/capability-routing";

export const ACTIVE_WORKSPACE_COOKIE = "klinnova-active-workspace";

export type ActiveWorkspace = "candidate" | "employer";

export function isActiveWorkspace(value: unknown): value is ActiveWorkspace {
  return value === "candidate" || value === "employer";
}

export function workspaceHref(workspace: ActiveWorkspace): string {
  return workspace === "candidate" ? "/candidate" : "/employer";
}

/**
 * Resolve a browser-local preference against the capabilities that RLS says
 * the current identity actually owns. The preference is presentation state;
 * it can never grant a capability or authorize a route.
 */
export function resolveActiveWorkspace(options: {
  capabilities: AccountCapabilities;
  preference: ActiveWorkspace | null;
}): ActiveWorkspace | null {
  const { capabilities, preference } = options;

  if (preference === "candidate" && capabilities.hasCandidateProfile) {
    return "candidate";
  }

  if (preference === "employer" && capabilities.hasEmployerProfile) {
    return "employer";
  }

  if (capabilities.hasCandidateProfile && !capabilities.hasEmployerProfile) {
    return "candidate";
  }

  if (capabilities.hasEmployerProfile && !capabilities.hasCandidateProfile) {
    return "employer";
  }

  return null;
}
