"use server";

import { redirect } from "next/navigation";

import { ensureCandidateProfile } from "@/lib/auth/ensure-candidate-profile";
import { AUTH_CHECK_EMAIL, AUTH_GENERIC_FAILURE } from "@/lib/auth/messages";
import { loginSchema, registerSchema, safeNextPath } from "@/lib/auth/schemas";
import { resolveSiteOrigin } from "@/lib/auth/site-origin";
import { getPublicEnv } from "@/lib/env/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error: string | null;
  message: string | null;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    displayName: formString(formData, "displayName"),
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? AUTH_GENERIC_FAILURE,
      message: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const env = getPublicEnv();
  const origin = resolveSiteOrigin({
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.VERCEL_URL,
  });

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
      },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    return { error: AUTH_GENERIC_FAILURE, message: null };
  }

  // Email confirmation enabled: typically no session until the user verifies.
  if (data.session === null || data.user === null) {
    return { error: null, message: AUTH_CHECK_EMAIL };
  }

  const ensured = await ensureCandidateProfile(supabase);
  if (!ensured.ok) {
    return { error: ensured.error, message: null };
  }

  redirect("/candidate");
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? AUTH_GENERIC_FAILURE,
      message: null,
    };
  }

  const next = safeNextPath(formString(formData, "next"));
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || data.user === null) {
    return { error: AUTH_GENERIC_FAILURE, message: null };
  }

  const ensured = await ensureCandidateProfile(supabase);
  if (!ensured.ok) {
    return { error: ensured.error, message: null };
  }

  redirect(next);
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
