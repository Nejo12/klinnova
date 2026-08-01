import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { ensureCandidateProfile } from "@/lib/auth/ensure-candidate-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Candidate · Stint",
};

export default async function CandidatePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect("/login?next=/candidate");
  }

  const ensured = await ensureCandidateProfile(supabase);
  if (!ensured.ok) {
    redirect(
      ensured.reason === "profile"
        ? "/auth/error?reason=profile"
        : "/login?next=/candidate",
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.brand} href="/">
          Stint
        </Link>
        <LogoutButton />
      </div>
      <h1 className={styles.heading}>Welcome, {ensured.displayName}</h1>
      <p className={styles.lead}>
        You are signed in. Essential onboarding questions arrive in the next
        step so we can match you carefully.
      </p>
      <p className={styles.note}>
        Your account and profile are ready. Onboarding fields are not collected
        here yet.
      </p>
    </main>
  );
}
