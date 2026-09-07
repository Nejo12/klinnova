import { type EmailOtpType, type SupabaseClient } from "@supabase/supabase-js";

import { ensureCandidateProfile } from "@/lib/auth/ensure-candidate-profile";
import { parseInternalNextPath, safeNextPath } from "@/lib/auth/schemas";
import {
  resolvePostAuthDestination,
  shouldEnsureCandidateProfile,
} from "@/lib/employer/capability-routing";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import type { Database } from "@/types/database";
import type { ActiveWorkspace } from "@/lib/workspace/active-workspace";

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
  intent?: string | null;
  activeWorkspace?: ActiveWorkspace | null;
};

export type ConfirmResult =
  | { ok: true; nextPath: string }
  | { ok: false; reason: "invalid" | "profile" | "recovery" };

export function isAllowedConfirmOtpType(value: string): value is EmailOtpType {
  return ALLOWED_OTP_TYPES.has(value as EmailOtpType);
}

/**
 * Verify email confirmation and route by validated intent (D-047).
 * Employer destinations do not create candidate profiles.
 * Does not log tokens. Destination is always a safe internal path.
 *
 * Password recovery (M5.1 Unit C / D-M5-21) is handled as an entirely
 * separate branch, gated on our own `intent=recovery` marker rather than
 * Supabase's `type` query param. Confirmed empirically against the
 * installed local Supabase version: `resetPasswordForEmail`'s email link
 * points at GoTrue's own `/auth/v1/verify` endpoint, which verifies the
 * token server-side and 303-redirects to `redirectTo` carrying only a
 * PKCE `code` — the `type=recovery` marker is consumed by GoTrue and does
 * NOT survive onto our route. `redirectTo` itself does survive (GoTrue
 * appends `code` as an additional query param on whatever we passed), so
 * `requestPasswordResetAction` sets `?intent=recovery` on the redirectTo
 * it hands to `resetPasswordForEmail` — that is the actual signal this
 * branch keys on. `token_hash`+`type=recovery` is also accepted here, in
 * case a differently-configured Supabase project ever emails a direct
 * OTP-hash link instead of the verify-redirect form.
 *
 * This branch never ensures a candidate profile and never resolves a
 * capability-based destination — that would be wrong for a password-reset
 * click, which must never create a profile or land in onboarding.
 */
export async function confirmAuthCallback(
  supabase: SupabaseClient<Database>,
  params: ConfirmSearchParams,
): Promise<ConfirmResult> {
  const tokenHash = params.token_hash;
  const typeParam = params.type;
  const isRecoveryIntent =
    params.intent === "recovery" || typeParam === "recovery";

  if (isRecoveryIntent) {
    let recoveryVerified = false;

    if (tokenHash !== null && tokenHash !== undefined && tokenHash.length > 0) {
      const { error } = await supabase.auth.verifyOtp({
        type: "recovery",
        token_hash: tokenHash,
      });
      recoveryVerified = error === null;
    } else if (
      params.code !== null &&
      params.code !== undefined &&
      params.code.length > 0
    ) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      recoveryVerified = error === null;
    }

    if (!recoveryVerified) {
      return { ok: false, reason: "recovery" };
    }
    return { ok: true, nextPath: "/reset-password" };
  }

  const intentPath = parseInternalNextPath(params.next);
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
    activeWorkspace: params.activeWorkspace,
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
