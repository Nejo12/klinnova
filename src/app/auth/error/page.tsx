import Link from "next/link";

import styles from "@/components/auth/auth-form.module.scss";
import { LocalizedText } from "@/components/i18n/localized-text";
import { PublicFooter } from "@/components/public-shared/public-footer";

export const metadata = { title: "Confirmation issue · Klinnova" };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const message =
    params.reason === "profile"
      ? "authMessage.profileRequired"
      : params.reason === "recovery"
        ? "authMessage.resetInvalid"
        : "authMessage.confirmFailed";

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Klinnova
      </Link>
      <h1 className={styles.heading}>
        <LocalizedText message="page.error.heading" />
      </h1>
      <p className={styles.lead}>
        <LocalizedText message={message} />
      </p>
      {params.reason === "recovery" ? (
        <p className={styles.footer}>
          <Link className={styles.link} href="/forgot-password">
            <LocalizedText message="page.error.requestAnother" />
          </Link>
        </p>
      ) : (
        <p className={styles.footer}>
          <Link className={styles.link} href="/login">
            <LocalizedText message="auth.signIn" />
          </Link>
          {" · "}
          <Link className={styles.link} href="/register">
            <LocalizedText message="page.login.createAccount" />
          </Link>
        </p>
      )}
      <PublicFooter />
    </main>
  );
}
