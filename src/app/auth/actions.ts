"use server";

import { redirect } from "next/navigation";

import { ensureCandidateProfile } from "@/lib/auth/ensure-candidate-profile";
import { AUTH_CHECK_EMAIL, AUTH_GENERIC_FAILURE } from "@/lib/auth/messages";
import {
  loginSchema,
  parseInternalNextPath,
  registerSchema,
} from "@/lib/auth/schemas";
import { resolveSiteOrigin } from "@/lib/auth/site-origin";
import {
  resolvePostAuthDestination,
  shouldEnsureCandidateProfile,
} from "@/lib/employer/capability-routing";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
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

async function resolveAuthenticatedDestination(
  formData: FormData,
): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const intentPath = parseInternalNextPath(formString(formData, "next"));
  const capabilities = (await loadAccountCapabilities(supabase)) ?? {
    hasCandidateProfile: false,
    hasEmployerProfile: false,
  };

  const destination = resolvePostAuthDestination({
    intentPath,
    capabilities,
  });

  const href =
    destination.kind === "role_choice" ? "/account/choose" : destination.href;

  if (
    shouldEnsureCandidateProfile({
      intentPath,
      destinationHref: href,
    })
  ) {
    const ensured = await ensureCandidateProfile(supabase);
    if (!ensured.ok) {
      throw new Error(`AUTH_PROFILE:${ensured.error}`);
    }
  }

  return href;
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

  const intentPath = parseInternalNextPath(formString(formData, "next"));
  const supabase = await createServerSupabaseClient();
  const env = getPublicEnv();
  const origin = resolveSiteOrigin({
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.VERCEL_URL,
  });

  const confirmUrl = new URL("/auth/confirm", origin);
  if (intentPath !== null) {
    confirmUrl.searchParams.set("next", intentPath);
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
      },
      emailRedirectTo: confirmUrl.toString(),
    },
  });

  if (error) {
    return { error: AUTH_GENERIC_FAILURE, message: null };
  }

  // Email confirmation enabled: typically no session until the user verifies.
  if (data.session === null || data.user === null) {
    return { error: null, message: AUTH_CHECK_EMAIL };
  }

  try {
    const href = await resolveAuthenticatedDestination(formData);
    redirect(href);
  } catch (caught) {
    if (caught instanceof Error && caught.message.startsWith("AUTH_PROFILE:")) {
      return {
        error: caught.message.replace("AUTH_PROFILE:", ""),
        message: null,
      };
    }
    throw caught;
  }
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

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || data.user === null) {
    return { error: AUTH_GENERIC_FAILURE, message: null };
  }

  try {
    const href = await resolveAuthenticatedDestination(formData);
    redirect(href);
  } catch (caught) {
    if (caught instanceof Error && caught.message.startsWith("AUTH_PROFILE:")) {
      return {
        error: caught.message.replace("AUTH_PROFILE:", ""),
        message: null,
      };
    }
    throw caught;
  }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
