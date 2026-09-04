import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import styles from "@/components/auth/auth-form.module.scss";
import { LocalizedText } from "@/components/i18n/localized-text";
import { PublicFooter } from "@/components/public-shared/public-footer";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Register · Klinnova",
  description: "Create a candidate account.",
};

export default async function RegisterPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user !== null) {
    redirect("/candidate");
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Klinnova
      </Link>
      <h1 className={styles.heading}>
        <LocalizedText message="page.register.heading" />
      </h1>
      <p className={styles.lead}>
        <LocalizedText message="page.register.lead" />
      </p>
      <RegisterForm />
      <p className={styles.footer}>
        <LocalizedText message="page.register.already" />{" "}
        <Link className={styles.link} href="/login">
          <LocalizedText message="auth.signIn" />
        </Link>
      </p>
      <PublicFooter />
    </main>
  );
}
