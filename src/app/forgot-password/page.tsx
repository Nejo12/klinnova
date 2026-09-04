import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import styles from "@/components/auth/auth-form.module.scss";
import { LocalizedText } from "@/components/i18n/localized-text";
import { PublicFooter } from "@/components/public-shared/public-footer";

export const metadata = {
  title: "Reset password · Klinnova",
  description: "Request a password reset link for your Klinnova account.",
};

export default function ForgotPasswordPage() {
  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Klinnova
      </Link>
      <h1 className={styles.heading}>
        <LocalizedText message="page.forgot.heading" />
      </h1>
      <p className={styles.lead}>
        <LocalizedText message="page.forgot.lead" />
      </p>
      <ForgotPasswordForm />
      <p className={styles.footer}>
        <Link className={styles.link} href="/login">
          <LocalizedText message="page.forgot.back" />
        </Link>
      </p>
      <PublicFooter />
    </main>
  );
}
