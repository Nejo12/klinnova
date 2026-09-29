import "server-only";

import { buildEmployerNewApplicationEmail } from "@/lib/applications/employer-new-application-email";
import { resolveEmployerRecipientForVacancy } from "@/lib/applications/privileged-employer-recipient-lookup";
import { getPublicEnv } from "@/lib/env/public";
import { resolveSiteOrigin } from "@/lib/auth/site-origin";
import { createTransactionalEmailMessage } from "@/lib/mail/message";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import type { MailSendResult } from "@/lib/mail/transport";

export type NotifyEmployerNewApplicationInput = {
  applicationId: string;
  vacancyId: string;
};

export type NotifyEmployerNewApplicationResult =
  | { status: "sent"; providerMessageId: string }
  | { status: "recipient_unresolved"; reason: string }
  | { status: "message_invalid"; issues: string[] }
  | { status: "send_failed"; mailStatus: MailSendResult["status"] };

function reviewUrlFor(applicationId: string): string {
  const publicEnv = getPublicEnv();
  const origin = resolveSiteOrigin({
    siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.VERCEL_URL,
  });
  return new URL(`/employer/applications/${applicationId}`, origin).toString();
}

/**
 * N2 post-persistence side effect (D-070-adjacent, but email delivery is
 * never written to the application status-history audit table — see PR
 * body). Callers
 * must invoke this only after `submit_candidate_application` returns
 * `result: "submitted"` for a genuinely new row — never for
 * `already_applied` — and must await it before their own `redirect()` so
 * the attempt actually runs within the request lifecycle. This function
 * itself never throws: every failure path returns a typed result instead,
 * so a caller that (correctly, per N2 policy) ignores the result cannot be
 * broken by a mail-layer exception.
 *
 * Idempotency: `eventId` is `application-submitted:<applicationId>`,
 * deterministic from the durable application identity the RPC already
 * guarantees is unique per (candidate, vacancy). The same application
 * always yields the same event id; a different application always yields a
 * different one. This is exactly N1's guarantee (stable id propagated to
 * the provider's `Idempotency-Key`) — no delivery ledger exists, so
 * repeated calls for the same application rely on Resend's own idempotency
 * handling, not a persisted dedupe check.
 */
export async function notifyEmployerOfNewApplication(
  input: NotifyEmployerNewApplicationInput,
): Promise<NotifyEmployerNewApplicationResult> {
  const recipient = await resolveEmployerRecipientForVacancy(input.vacancyId);

  if (recipient.status !== "ready") {
    console.error("[applications] employer notification recipient unresolved", {
      applicationId: input.applicationId,
      reason: recipient.status,
    });
    return { status: "recipient_unresolved", reason: recipient.status };
  }

  const content = buildEmployerNewApplicationEmail({
    vacancyTitle: recipient.vacancyTitle,
    reviewUrl: reviewUrlFor(input.applicationId),
  });

  const messageResult = createTransactionalEmailMessage({
    to: recipient.employerEmail,
    subject: content.subject,
    text: content.text,
    html: content.html,
    eventId: `application-submitted:${input.applicationId}`,
  });

  if (messageResult.status !== "success") {
    console.error("[applications] employer notification message invalid", {
      applicationId: input.applicationId,
      issues: messageResult.issues,
    });
    return { status: "message_invalid", issues: messageResult.issues };
  }

  const sendResult = await sendTransactionalEmail(messageResult.message);

  if (sendResult.status !== "sent") {
    return { status: "send_failed", mailStatus: sendResult.status };
  }

  return { status: "sent", providerMessageId: sendResult.providerMessageId };
}
