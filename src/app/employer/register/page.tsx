import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import styles from "@/components/auth/auth-form.module.scss";
import { LocalizedText } from "@/components/i18n/localized-text";
import { PublicFooter } from "@/components/public-shared/public-footer";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Employer registration · Klinnova",
  description: "Create a Klinnova account to hire as an employer.",
};
const EMPLOYER_NEXT = "/employer/onboarding";

export default async function EmployerRegisterPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user !== null) redirect(EMPLOYER_NEXT);

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Klinnova
      </Link>
      <h1 className={styles.heading}>
        <LocalizedText message="page.employerRegister.heading" />
      </h1>
      <p className={styles.lead}>
        <LocalizedText message="page.employerRegister.lead" />
      </p>
      <RegisterForm nextPath={EMPLOYER_NEXT} />
      <p className={styles.footer}>
        <LocalizedText message="page.register.already" />{" "}
        <Link
          className={styles.link}
          href={`/login?next=${encodeURIComponent(EMPLOYER_NEXT)}`}
        >
          <LocalizedText message="auth.signIn" />
        </Link>
      </p>
      <PublicFooter />
    </main>
  );
}
