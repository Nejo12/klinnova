import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import styles from "@/components/auth/auth-form.module.scss";
import { AUTH_RESET_LINK_INVALID } from "@/lib/auth/messages";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set new password · Stint",
};

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    return (
      <main className={styles.page}>
        <Link className={styles.brand} href="/">
          Stint
        </Link>
        <h1 className={styles.heading}>We could not finish that step</h1>
        <p className={styles.lead}>{AUTH_RESET_LINK_INVALID}</p>
        <p className={styles.footer}>
          <Link className={styles.link} href="/forgot-password">
            Request another reset
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Stint
      </Link>
      <h1 className={styles.heading}>Set a new password</h1>
      <p className={styles.lead}>
        Choose a new password for your Stint account.
      </p>
      <ResetPasswordForm />
    </main>
  );
}
