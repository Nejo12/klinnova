"use client";

import { useFormStatus } from "react-dom";

import { confirmAction } from "@/app/auth/confirm/actions";
import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./auth-form.module.scss";

type ConfirmFormProps = {
  tokenHash: string | null;
  type: string | null;
  code: string | null;
  next: string | null;
  intent: "recovery" | null;
};

function SubmitButton({ isRecovery }: { isRecovery: boolean }) {
  const { pending } = useFormStatus();
  const { t } = useLocale();

  return (
    <button className={styles.submit} type="submit" disabled={pending}>
      {pending
        ? t("auth.confirming")
        : isRecovery
          ? t("auth.continuePasswordReset")
          : t("auth.confirmEmail")}
    </button>
  );
}

/**
 * The interstitial's own form. Rendering this component performs no
 * Supabase Auth call — only the human's own submit triggers confirmAction,
 * the one-time-token-consuming Server Action (C4G-R).
 */
export function ConfirmForm({
  tokenHash,
  type,
  code,
  next,
  intent,
}: ConfirmFormProps) {
  return (
    <form className={styles.form} action={confirmAction} noValidate>
      {tokenHash !== null ? (
        <input type="hidden" name="token_hash" value={tokenHash} />
      ) : null}
      {type !== null ? <input type="hidden" name="type" value={type} /> : null}
      {code !== null ? <input type="hidden" name="code" value={code} /> : null}
      {next !== null ? <input type="hidden" name="next" value={next} /> : null}
      {intent !== null ? (
        <input type="hidden" name="intent" value={intent} />
      ) : null}
      <SubmitButton isRecovery={intent === "recovery"} />
    </form>
  );
}
