import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import styles from "@/components/auth/auth-form.module.scss";
import { isEmployerIntentPath } from "@/lib/auth/paths";
import { parseInternalNextPath } from "@/lib/auth/schemas";
import { resolvePostAuthDestination } from "@/lib/employer/capability-routing";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sign in · Stint",
  description: "Sign in to your Stint account.",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const intentPath = parseInternalNextPath(params.next);
  const nextPathForForm = intentPath ?? "";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user !== null) {
    const capabilities = (await loadAccountCapabilities(supabase)) ?? {
      hasCandidateProfile: false,
      hasEmployerProfile: false,
    };
    const destination = resolvePostAuthDestination({
      intentPath,
      capabilities,
    });
    redirect(
      destination.kind === "role_choice" ? "/account/choose" : destination.href,
    );
  }

  const employerIntent =
    intentPath !== null && isEmployerIntentPath(intentPath);
  const registerHref = employerIntent ? "/employer/register" : "/register";

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Stint
      </Link>
      <h1 className={styles.heading}>Sign in</h1>
      <p className={styles.lead}>
        {employerIntent
          ? "Use the email and password for your Stint account to continue as an employer."
          : "Use the email and password for your Stint account."}
      </p>
      <LoginForm nextPath={nextPathForForm} />
      <p className={styles.footer}>
        New here?{" "}
        <Link className={styles.link} href={registerHref}>
          Create an account
        </Link>
      </p>
    </main>
  );
}
