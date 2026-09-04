import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import styles from "@/components/auth/auth-form.module.scss";
import { LocalizedText } from "@/components/i18n/localized-text";
import { PublicFooter } from "@/components/public-shared/public-footer";
import { isEmployerIntentPath } from "@/lib/auth/paths";
import { parseInternalNextPath } from "@/lib/auth/schemas";
import { resolvePostAuthDestination } from "@/lib/employer/capability-routing";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sign in · Klinnova",
  description: "Sign in to your Klinnova account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const intentPath = parseInternalNextPath(params.next);
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
        Klinnova
      </Link>
      <h1 className={styles.heading}>
        <LocalizedText message="page.login.heading" />
      </h1>
      <p className={styles.lead}>
        <LocalizedText
          message={
            employerIntent ? "page.login.employerLead" : "page.login.lead"
          }
        />
      </p>
      <LoginForm nextPath={intentPath ?? ""} />
      <p className={styles.footer}>
        <Link className={styles.link} href="/forgot-password">
          <LocalizedText message="page.login.forgot" />
        </Link>
      </p>
      <p className={styles.footer}>
        <LocalizedText message="page.login.newHere" />{" "}
        <Link className={styles.link} href={registerHref}>
          <LocalizedText message="page.login.createAccount" />
        </Link>
      </p>
      <PublicFooter />
    </main>
  );
}
