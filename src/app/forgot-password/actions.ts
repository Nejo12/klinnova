"use server";

import { AUTH_RESET_REQUEST_SENT } from "@/lib/auth/messages";
import { forgotPasswordSchema } from "@/lib/auth/schemas";
import { resolveSiteOrigin } from "@/lib/auth/site-origin";
import { getPublicEnv } from "@/lib/env/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ForgotPasswordActionState = {
  error: string | null;
  message: string | null;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Requests a password-reset email. Enumeration-safe by construction: the
 * returned state never depends on whether resetPasswordForEmail
 * succeeded, errored, or the address exists — every request-shaped input
 * gets the identical generic message. Does not log the submitted email.
 */
export async function requestPasswordResetAction(
  _prev: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formString(formData, "email"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
      message: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const env = getPublicEnv();
  const origin = resolveSiteOrigin({
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.VERCEL_URL,
  });
  const redirectUrl = new URL("/auth/confirm", origin);
  redirectUrl.searchParams.set("intent", "recovery");

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: redirectUrl.toString(),
  });

  return { error: null, message: AUTH_RESET_REQUEST_SENT };
}
