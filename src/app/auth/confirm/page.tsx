import Link from "next/link";

import { ConfirmForm } from "@/components/auth/confirm-form";
import styles from "@/components/auth/auth-form.module.scss";
import { LocalizedText } from "@/components/i18n/localized-text";
import { PublicFooter } from "@/components/public-shared/public-footer";
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

  if (!structurallyValid)
    return (
      <main className={styles.page}>
        <Link className={styles.brand} href="/">
          Klinnova
        </Link>
        <h1 className={styles.heading}>
          <LocalizedText message="page.error.heading" />
        </h1>
        <p className={styles.lead}>
          <LocalizedText
            message={
              isRecoveryIntent
                ? "authMessage.resetInvalid"
                : "authMessage.confirmFailed"
            }
          />
        </p>
        <PublicFooter />
      </main>
    );

  const safeNext = parseInternalNextPath(params.next ?? null);
  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">
        Klinnova
      </Link>
      <h1 className={styles.heading}>
        <LocalizedText
          message={
            isRecoveryIntent
              ? "page.confirm.resetHeading"
              : "page.confirm.emailHeading"
          }
        />
      </h1>
      <p className={styles.lead}>
        <LocalizedText
          message={
            isRecoveryIntent
              ? "page.confirm.resetLead"
              : "page.confirm.emailLead"
          }
        />
      </p>
      <ConfirmForm
        tokenHash={tokenHash}
        type={params.type ?? null}
        code={code}
        next={safeNext}
        intent={isRecoveryIntent ? "recovery" : null}
      />
      <PublicFooter />
    </main>
  );
}
