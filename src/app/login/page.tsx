import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import styles from "@/components/auth/auth-form.module.scss";
import { safeNextPath } from "@/lib/auth/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sign in · Stint",
  description: "Sign in to your candidate account.",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user !== null) {
    redirect(nextPath);
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Stint
      </Link>
      <h1 className={styles.heading}>Sign in</h1>
      <p className={styles.lead}>
        Use the email and password for your candidate account.
      </p>
      <LoginForm nextPath={nextPath} />
      <p className={styles.footer}>
        New here?{" "}
        <Link className={styles.link} href="/register">
          Create an account
        </Link>
      </p>
    </main>
  );
}
