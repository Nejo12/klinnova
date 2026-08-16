import Link from "next/link";

import { ConfirmForm } from "@/components/auth/confirm-form";
import styles from "@/components/auth/auth-form.module.scss";
import {
  AUTH_CONFIRM_FAILED,
  AUTH_RESET_LINK_INVALID,
} from "@/lib/auth/messages";
import { isAllowedConfirmOtpType } from "@/lib/auth/confirm";
import { parseInternalNextPath } from "@/lib/auth/schemas";

export const metadata = {
  title: "Confirm · Klinnova",
  robots: { index: false, follow: false },
};

type AuthConfirmPageProps = {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    code?: string;
    next?: string;
    intent?: string;
  }>;
};

/**
 * Scanner-resistant Auth confirmation/recovery interstitial (C4G-R).
 *
 * This GET render performs zero Supabase Auth calls — no verifyOtp, no
 * exchangeCodeForSession, no session/profile mutation of any kind. It only
 * parses and structurally validates the incoming URL parameters and renders
 * a page with a single explicit human action (ConfirmForm's own submit
 * button), which alone triggers the token-consuming confirmAction Server
 * Action. An automated email-link-prefetch/security scanner that fetches
 * this URL sees only this static interstitial and consumes nothing.
 */
export default async function AuthConfirmPage({
  searchParams,
}: AuthConfirmPageProps) {
  const params = await searchParams;
  const isRecoveryIntent =
    params.intent === "recovery" || params.type === "recovery";

  const tokenHash =
    typeof params.token_hash === "string" && params.token_hash.length > 0
      ? params.token_hash
      : null;
  const code =
    typeof params.code === "string" && params.code.length > 0
      ? params.code
      : null;
  const typeIsUsable =
    isRecoveryIntent ||
    (typeof params.type === "string" && isAllowedConfirmOtpType(params.type));

  const structurallyValid =
    (tokenHash !== null && typeIsUsable) || code !== null;

  if (!structurallyValid) {
    return (
      <main className={styles.page}>
        <Link className={styles.brand} href="/">
          Klinnova
        </Link>
        <h1 className={styles.heading}>We could not finish that step</h1>
        <p className={styles.lead}>
          {isRecoveryIntent ? AUTH_RESET_LINK_INVALID : AUTH_CONFIRM_FAILED}
        </p>
      </main>
    );
  }

  const safeNext = parseInternalNextPath(params.next ?? null);

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Klinnova
      </Link>
      <h1 className={styles.heading}>
        {isRecoveryIntent
          ? "Reset your password"
          : "Confirm your email address"}
      </h1>
      <p className={styles.lead}>
        {isRecoveryIntent
          ? "Click below to continue to password reset."
          : "Click below to finish confirming this email address."}
      </p>
      <ConfirmForm
        tokenHash={tokenHash}
        type={params.type ?? null}
        code={code}
        next={safeNext}
        intent={isRecoveryIntent ? "recovery" : null}
      />
    </main>
  );
}
