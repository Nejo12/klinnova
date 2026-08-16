"use server";

import { redirect } from "next/navigation";

import { confirmAuthCallback } from "@/lib/auth/confirm";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function formString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * The one-time-token-consuming step (C4G-R). Reached only via the
 * interstitial's own explicit human form submission — never via the GET
 * that renders that interstitial, which performs zero Supabase Auth calls.
 * Reuses confirmAuthCallback unchanged; only the caller (POST here, GET
 * previously) has moved.
 */
export async function confirmAction(formData: FormData): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const result = await confirmAuthCallback(supabase, {
    token_hash: formString(formData, "token_hash"),
    type: formString(formData, "type"),
    code: formString(formData, "code"),
    next: formString(formData, "next"),
    intent: formString(formData, "intent"),
  });

  if (!result.ok) {
    const path =
      result.reason === "profile"
        ? "/auth/error?reason=profile"
        : result.reason === "recovery"
          ? "/auth/error?reason=recovery"
          : "/auth/error";
    redirect(path);
  }

  redirect(result.nextPath);
}
