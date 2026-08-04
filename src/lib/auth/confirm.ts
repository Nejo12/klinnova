import { type EmailOtpType, type SupabaseClient } from "@supabase/supabase-js";

import { ensureCandidateProfile } from "@/lib/auth/ensure-candidate-profile";
import { parseInternalNextPath, safeNextPath } from "@/lib/auth/schemas";
import {
  resolvePostAuthDestination,
  shouldEnsureCandidateProfile,
} from "@/lib/employer/capability-routing";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import type { Database } from "@/types/database";

/** OTP types accepted by the confirmation callback for Slice 1 registration. */
const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "email",
  "invite",
  "email_change",
]);

export type ConfirmSearchParams = {
  token_hash?: string | null;
  type?: string | null;
  code?: string | null;
  next?: string | null;
};

export type ConfirmResult =
  { ok: true; nextPath: string } | { ok: false; reason: "invalid" | "profile" };

export function isAllowedConfirmOtpType(value: string): value is EmailOtpType {
  return ALLOWED_OTP_TYPES.has(value as EmailOtpType);
}

/**
 * Verify email confirmation and route by validated intent (D-047).
 * Employer destinations do not create candidate profiles.
 * Does not log tokens. Destination is always a safe internal path.
 */
export async function confirmAuthCallback(
  supabase: SupabaseClient<Database>,
  params: ConfirmSearchParams,
): Promise<ConfirmResult> {
  const intentPath = parseInternalNextPath(params.next);
  const tokenHash = params.token_hash;
  const typeParam = params.type;
  const code = params.code;

  let verified = false;

  if (
    tokenHash !== null &&
    tokenHash !== undefined &&
    tokenHash.length > 0 &&
    typeParam !== null &&
    typeParam !== undefined &&
    isAllowedConfirmOtpType(typeParam)
  ) {
    const { error } = await supabase.auth.verifyOtp({
      type: typeParam,
      token_hash: tokenHash,
    });
    verified = error === null;
  } else if (code !== null && code !== undefined && code.length > 0) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = error === null;
  }

  if (!verified) {
    return { ok: false, reason: "invalid" };
  }

  const capabilities = (await loadAccountCapabilities(supabase)) ?? {
    hasCandidateProfile: false,
    hasEmployerProfile: false,
  };

  const destination = resolvePostAuthDestination({
    intentPath,
    capabilities,
  });

  const nextPath =
    destination.kind === "role_choice" ? "/account/choose" : destination.href;

  if (
    shouldEnsureCandidateProfile({
      intentPath,
      destinationHref: nextPath,
    })
  ) {
    const ensured = await ensureCandidateProfile(supabase);
    if (!ensured.ok) {
      return {
        ok: false,
        reason: ensured.reason === "profile" ? "profile" : "invalid",
      };
    }
  }

  // Invalid next values are already null; keep safeNextPath fallback for
  // any residual empty destination (should not happen).
  return { ok: true, nextPath: safeNextPath(nextPath) };
}
