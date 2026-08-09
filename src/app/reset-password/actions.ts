"use server";

import { redirect } from "next/navigation";

import { AUTH_RESET_SUCCESS } from "@/lib/auth/messages";
import { resetPasswordSchema } from "@/lib/auth/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ResetPasswordActionState = {
  error: string | null;
  message: string | null;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Sets a new password for the currently authenticated session (reached via
 * the recovery-link callback). Never exposes raw Supabase Auth errors —
 * only the repo's own generic failure copy.
 */
export async function updatePasswordAction(
  _prev: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Check your password and try again.",
      message: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    return {
      error: "Your session has expired. Request a new password reset link.",
      message: null,
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error !== null) {
    return {
      error: "Your password could not be updated. Try again.",
      message: null,
    };
  }

  return { error: null, message: AUTH_RESET_SUCCESS };
}

/**
 * Deliberate separate step (mirrors the account-deletion completed-state
 * pattern, D-081/PART S): the user has already seen the success message.
 * Ending the recovery session here and sending them to /login — rather
 * than continuing silently in the session the recovery link established —
 * is the explicit "normal login after reset" the recovery contract
 * requires, not an automatic redirect.
 */
export async function continueToSignInAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
