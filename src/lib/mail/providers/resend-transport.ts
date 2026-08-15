import "server-only";

import { getMailEnv } from "@/lib/mail/env";
import type { TransactionalEmailMessage } from "@/lib/mail/message";
import type { MailSendResult, MailTransport } from "@/lib/mail/transport";

const RESEND_API_URL = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;

type ResendSuccessBody = { id?: unknown };
type ResendErrorBody = { message?: unknown; name?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * Direct-HTTP Resend transport (no SDK dependency — smallest sufficient
 * implementation over `fetch`, matching N1's "keep provider-specific HTTP
 * details behind the transport boundary" requirement). Reads config lazily
 * per call via `getMailEnv()` so a missing/invalid secret fails the send,
 * not module load. Propagates the message's `eventId` as an `Idempotency-Key`
 * request header; see `send-transactional-email.ts` for what guarantee that
 * does and does not provide.
 */
export function createResendTransport(): MailTransport {
  return {
    async send(message: TransactionalEmailMessage): Promise<MailSendResult> {
      let env;
      try {
        env = getMailEnv();
      } catch (error) {
        return {
          status: "config_error",
          message: error instanceof Error ? error.message : "invalid config",
        };
      }

      let response: Response;
      try {
        response = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Idempotency-Key": message.eventId,
          },
          body: JSON.stringify({
            from: env.MAIL_FROM_ADDRESS,
            to: message.to,
            subject: message.subject,
            text: message.text,
            ...(message.html !== undefined ? { html: message.html } : {}),
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        return {
          status: "transport_error",
          message:
            error instanceof Error ? error.message : "network request failed",
        };
      }

      const body = await parseJsonSafely(response);

      if (!response.ok) {
        const errorBody: ResendErrorBody = isRecord(body) ? body : {};
        return {
          status: "provider_rejected",
          httpStatus: response.status,
          message:
            typeof errorBody.message === "string"
              ? errorBody.message
              : `provider rejected request (${response.status})`,
        };
      }

      const successBody: ResendSuccessBody = isRecord(body) ? body : {};
      if (typeof successBody.id !== "string" || successBody.id.length === 0) {
        return {
          status: "transport_error",
          message: "provider returned an unexpected response shape",
        };
      }

      return { status: "sent", providerMessageId: successBody.id };
    },
  };
}
