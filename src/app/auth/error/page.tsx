import Link from "next/link";

import styles from "@/components/auth/auth-form.module.scss";
import {
  AUTH_CONFIRM_FAILED,
  AUTH_PROFILE_REQUIRED,
} from "@/lib/auth/messages";

export const metadata = {
  title: "Confirmation issue · Stint",
};

type AuthErrorPageProps = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const params = await searchParams;
  const message =
    params.reason === "profile" ? AUTH_PROFILE_REQUIRED : AUTH_CONFIRM_FAILED;

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Stint
      </Link>
      <h1 className={styles.heading}>We could not finish that step</h1>
      <p className={styles.lead}>{message}</p>
      <p className={styles.footer}>
        <Link className={styles.link} href="/login">
          Sign in
        </Link>
        {" · "}
        <Link className={styles.link} href="/register">
          Create an account
        </Link>
      </p>
    </main>
  );
}
