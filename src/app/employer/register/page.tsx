import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import styles from "@/components/auth/auth-form.module.scss";
import { PublicFooter } from "@/components/public-shared/public-footer";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Employer registration · Stint",
  description: "Create a Stint account to hire as an employer.",
};

const EMPLOYER_NEXT = "/employer/onboarding";

export default async function EmployerRegisterPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user !== null) {
    redirect(EMPLOYER_NEXT);
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Stint
      </Link>
      <h1 className={styles.heading}>Create an employer account</h1>
      <p className={styles.lead}>
        Register to set up your employer profile. You can also use an existing
        Stint account — candidate and employer capabilities can coexist.
      </p>
      <RegisterForm nextPath={EMPLOYER_NEXT} />
      <p className={styles.footer}>
        Already have an account?{" "}
        <Link
          className={styles.link}
          href={`/login?next=${encodeURIComponent(EMPLOYER_NEXT)}`}
        >
          Sign in
        </Link>
      </p>
      <PublicFooter />
    </main>
  );
}
