import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import styles from "@/components/auth/auth-form.module.scss";
import { LocalizedText } from "@/components/i18n/localized-text";
import { PublicFooter } from "@/components/public-shared/public-footer";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set new password · Klinnova" };

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null)
    return (
      <main className={styles.page}>
        <Link className={styles.brand} href="/">
          Klinnova
        </Link>
        <h1 className={styles.heading}>
          <LocalizedText message="page.reset.problem" />
        </h1>
        <p className={styles.lead}>
          <LocalizedText message="authMessage.resetInvalid" />
        </p>
        <p className={styles.footer}>
          <Link className={styles.link} href="/forgot-password">
            <LocalizedText message="page.reset.requestAnother" />
          </Link>
        </p>
        <PublicFooter />
      </main>
    );

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Klinnova
      </Link>
      <h1 className={styles.heading}>
        <LocalizedText message="page.reset.heading" />
      </h1>
      <p className={styles.lead}>
        <LocalizedText message="page.reset.lead" />
      </p>
      <ResetPasswordForm />
      <PublicFooter />
    </main>
  );
}
