import { z } from "zod";

/**
 * Deterministic, provider-neutral transactional-email representation. N1
 * scope only — no newsletter/campaign/audience/template-CMS/attachment/
 * marketing-tracking/preferences/unsubscribe concepts. Later business
 * triggers (N2/N3) construct one of these per event; N1 does not construct
 * or send any product-specific message itself.
 */
const transactionalEmailMessageSchema = z.object({
  to: z.email(),
  subject: z.string().min(1),
  text: z.string().min(1),
  html: z.string().min(1).optional(),
  /**
   * Stable per-business-event identifier (e.g. `application-created:<id>`).
   * Propagated to the transport layer for provider-side idempotency
   * support — see `send-transactional-email.ts` for exactly what N1 does
   * and does not guarantee.
   */
  eventId: z.string().min(1),
  /** Provider-neutral structured fields. No PII beyond what the caller already owns. */
  metadata: z.record(z.string(), z.string()).optional(),
});

export type TransactionalEmailMessage = z.infer<
  typeof transactionalEmailMessageSchema
>;

export type CreateTransactionalEmailMessageInput = z.input<
  typeof transactionalEmailMessageSchema
>;

export type CreateTransactionalEmailMessageResult =
  | { status: "success"; message: TransactionalEmailMessage }
  | { status: "invalid"; issues: string[] };

/**
 * Pure, deterministic construction: identical input always produces an
 * identical (frozen) output, with no implicit clock/randomness. Validation
 * failures are returned, not thrown — callers (future N2/N3 triggers) decide
 * how to handle a malformed message without a domain-flow-halting throw.
 */
export function createTransactionalEmailMessage(
  input: CreateTransactionalEmailMessageInput,
): CreateTransactionalEmailMessageResult {
  const parsed = transactionalEmailMessageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "invalid",
      issues: parsed.error.issues.map((issue) => {
        const path = issue.path.join(".") || "message";
        return `${path}: ${issue.message}`;
      }),
    };
  }

  return { status: "success", message: Object.freeze(parsed.data) };
}
