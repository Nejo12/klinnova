import "server-only";

import { createResendTransport } from "@/lib/mail/providers/resend-transport";
import type { TransactionalEmailMessage } from "@/lib/mail/message";
import type { MailSendResult, MailTransport } from "@/lib/mail/transport";

const defaultTransport = createResendTransport();

/**
 * Privacy-conscious structured log: transport identifier, the message's own
 * event id, and success/failure category plus provider message/HTTP status
 * where safe. Deliberately omits the recipient address (no existing
 * repository convention establishes an operational need to log it), the
 * message body, and any provider secret.
 */
function logSendResult(eventId: string, result: MailSendResult): void {
  const base = { transport: "resend", eventId } as const;

  if (result.status === "sent") {
    console.info("[mail] send succeeded", {
      ...base,
      status: result.status,
      providerMessageId: result.providerMessageId,
    });
    return;
  }

  if (result.status === "provider_rejected") {
    console.error("[mail] send rejected by provider", {
      ...base,
      status: result.status,
      httpStatus: result.httpStatus,
    });
    return;
  }

  console.error("[mail] send failed", { ...base, status: result.status });
}

/**
 * The application-facing mail service (N1's "application mail service"
 * boundary). Future business triggers (N2/N3) call this with an already
 * `createTransactionalEmailMessage`-validated message — this module never
 * constructs product-specific copy itself.
 *
 * Idempotency: this function guarantees only that the message's `eventId`
 * is propagated unchanged to the transport (here, as Resend's
 * `Idempotency-Key` header). It does not itself deduplicate calls, persist
 * a delivery ledger, or guarantee exactly-once delivery — a caller that
 * invokes this twice for the same event relies entirely on the configured
 * provider's own idempotency-key handling. N2/N3 must decide, per trigger
 * point, whether that provider-side guarantee is sufficient or whether a
 * persisted dedupe check is required.
 *
 * Failure handling: provider/config/transport failures are returned as a
 * typed `MailSendResult`, never thrown. Whether a failed send should also
 * fail the triggering business transaction is a decision left entirely to
 * the caller (N2/N3) — this function does not make that decision.
 */
export async function sendTransactionalEmail(
  message: TransactionalEmailMessage,
  transport: MailTransport = defaultTransport,
): Promise<MailSendResult> {
  const result = await transport.send(message);
  logSendResult(message.eventId, result);
  return result;
}
