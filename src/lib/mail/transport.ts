import type { TransactionalEmailMessage } from "@/lib/mail/message";

/**
 * Provider-neutral send result. Distinguishes enough failure categories to
 * diagnose an incident without leaking secrets/PII: config problems (N1's
 * own responsibility) versus provider rejection versus transport/network
 * failure versus a response the transport could not make sense of.
 */
export type MailSendResult =
  | { status: "sent"; providerMessageId: string }
  | { status: "config_error"; message: string }
  | { status: "provider_rejected"; httpStatus: number; message: string }
  | { status: "transport_error"; message: string };

/**
 * Transport/provider boundary. Business-domain trigger code (N2/N3) never
 * depends on this directly — it depends on `sendTransactionalEmail` in
 * `send-transactional-email.ts`, which resolves a `MailTransport`
 * implementation. Swapping providers later means adding a new
 * implementation of this interface, not touching domain trigger code.
 */
export type MailTransport = {
  send(message: TransactionalEmailMessage): Promise<MailSendResult>;
};
