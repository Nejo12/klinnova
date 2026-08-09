import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import styles from "@/components/auth/auth-form.module.scss";

export const metadata = {
  title: "Reset password · Stint",
  description: "Request a password reset link for your Stint account.",
};

export default function ForgotPasswordPage() {
  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Stint
      </Link>
      <h1 className={styles.heading}>Reset your password</h1>
      <p className={styles.lead}>
        Enter your account email and we&apos;ll send you a link to set a new
        password.
      </p>
      <ForgotPasswordForm />
      <p className={styles.footer}>
        <Link className={styles.link} href="/login">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
