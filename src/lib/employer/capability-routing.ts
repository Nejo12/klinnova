/**
 * Post-auth destination resolution for dual-capability accounts (D-047).
 * Validated internal next always wins. No hidden default-role field.
 */

import { isCandidateIntentPath, isEmployerIntentPath } from "@/lib/auth/paths";
import {
  resolveActiveWorkspace,
  type ActiveWorkspace,
  workspaceHref,
} from "@/lib/workspace/active-workspace";

export type AccountCapabilities = {
  hasCandidateProfile: boolean;
  hasEmployerProfile: boolean;
};

export type PostAuthDestination =
  { kind: "redirect"; href: string } | { kind: "role_choice" };

/**
 * Resolve where to send an authenticated user after login/confirm.
 * `intentPath` is a validated internal path, or null when no intent was given.
 */
export function resolvePostAuthDestination(options: {
  intentPath: string | null;
  capabilities: AccountCapabilities;
  activeWorkspace?: ActiveWorkspace | null;
}): PostAuthDestination {
  const { intentPath, capabilities, activeWorkspace = null } = options;

  if (intentPath !== null) {
    return { kind: "redirect", href: intentPath };
  }

  const { hasCandidateProfile, hasEmployerProfile } = capabilities;

  if (hasCandidateProfile && hasEmployerProfile) {
    const resolved = resolveActiveWorkspace({
      capabilities,
      preference: activeWorkspace,
    });
    return resolved === null
      ? { kind: "role_choice" }
      : { kind: "redirect", href: workspaceHref(resolved) };
  }

  if (hasEmployerProfile && !hasCandidateProfile) {
    return { kind: "redirect", href: "/employer" };
  }

  // Candidate-only, neither, or employer-less: candidate space remains the
  // generic authenticated home when no employer intent is present.
  return { kind: "redirect", href: "/candidate" };
}

/** Whether login/confirm should ensure a candidate profile for this destination. */
export function shouldEnsureCandidateProfile(options: {
  intentPath: string | null;
  destinationHref: string;
}): boolean {
  const { intentPath, destinationHref } = options;

  if (intentPath !== null && isEmployerIntentPath(intentPath)) {
    return false;
  }

  if (isEmployerIntentPath(destinationHref)) {
    return false;
  }

  if (destinationHref === "/account/choose") {
    return false;
  }

  return (
    isCandidateIntentPath(destinationHref) || destinationHref === "/candidate"
  );
}
