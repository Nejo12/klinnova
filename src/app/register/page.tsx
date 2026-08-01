import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import styles from "@/components/auth/auth-form.module.scss";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Register · Stint",
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
        Stint
      </Link>
      <h1 className={styles.heading}>Create your account</h1>
      <p className={styles.lead}>
        Start with an email and a name we can use to address you. You will
        confirm your email before continuing.
      </p>
      <RegisterForm />
      <p className={styles.footer}>
        Already have an account?{" "}
        <Link className={styles.link} href="/login">
          Sign in
        </Link>
      </p>
    </main>
  );
}
