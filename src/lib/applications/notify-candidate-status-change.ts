import "server-only";

import {
  buildCandidateStatusEmail,
  type NotifiableApplicationStatus,
} from "@/lib/applications/candidate-status-email";
import { resolveCandidateRecipientForApplication } from "@/lib/applications/privileged-candidate-recipient-lookup";
import { getPublicEnv } from "@/lib/env/public";
import { resolveSiteOrigin } from "@/lib/auth/site-origin";
import { createTransactionalEmailMessage } from "@/lib/mail/message";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import type { MailSendResult } from "@/lib/mail/transport";

export type NotifyCandidateStatusChangeInput = {
  applicationId: string;
  toStatus: NotifiableApplicationStatus;
};

export type NotifyCandidateStatusChangeResult =
  | { status: "sent"; providerMessageId: string }
  | { status: "recipient_unresolved"; reason: string }
  | { status: "message_invalid"; issues: string[] }
  | { status: "send_failed"; mailStatus: MailSendResult["status"] };

function applicationUrlFor(applicationId: string): string {
  const publicEnv = getPublicEnv();
  const origin = resolveSiteOrigin({
    siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.VERCEL_URL,
  });
  return new URL(`/candidate/applications/${applicationId}`, origin).toString();
}

/**
 * N3 post-persistence side effect. Callers must invoke this only after
 * `transition_current_employer_application_status` returns
 * `result: "updated"` with a `current_status` in
 * `NOTIFIABLE_APPLICATION_STATUSES` — never for `already_in_state`
 * (no real transition occurred), and never for a resulting status of
 * `submitted` or `reviewing`. This function itself never throws: every
 * failure path returns a typed result instead, so a caller that (per N3
 * policy) ignores the result cannot be broken by a mail-layer exception.
 *
 * Idempotency: `eventId` is `application-status:<applicationId>:<toStatus>`.
 * This is safe specifically because `_application_allowed_transitions`
 * (D-070) is a verified forward-only, terminal-state matrix — `accepted`
 * and `rejected` have no outgoing transitions, and `shortlisted` transitions
 * only to `accepted`/`rejected`, never back to itself or an earlier state.
 * A given application can therefore reach each of `shortlisted`/`accepted`/
 * `rejected` at most once in its entire lifetime, so this pair is already a
 * durable, unique transition identity — no status-history-table row id or
 * other schema addition is needed. The RPC's own
 * `already_in_state` result (a literal same-status call finds no
 * transition to make) is a second, independent defense against a caller
 * retry ever reaching this function twice for the same real transition.
 * As with N1/N2: no delivery ledger exists, so a genuine double-call still
 * relies on Resend's own `Idempotency-Key` handling, not a persisted
 * dedupe check.
 */
export async function notifyCandidateOfStatusChange(
  input: NotifyCandidateStatusChangeInput,
): Promise<NotifyCandidateStatusChangeResult> {
  const recipient = await resolveCandidateRecipientForApplication(
    input.applicationId,
  );

  if (recipient.status !== "ready") {
    console.error(
      "[applications] candidate notification recipient unresolved",
      {
        applicationId: input.applicationId,
        toStatus: input.toStatus,
        reason: recipient.status,
      },
    );
    return { status: "recipient_unresolved", reason: recipient.status };
  }

  const content = buildCandidateStatusEmail({
    toStatus: input.toStatus,
    vacancyTitle: recipient.vacancyTitle,
    applicationUrl: applicationUrlFor(input.applicationId),
  });

  const messageResult = createTransactionalEmailMessage({
    to: recipient.candidateEmail,
    subject: content.subject,
    text: content.text,
    html: content.html,
    eventId: `application-status:${input.applicationId}:${input.toStatus}`,
  });

  if (messageResult.status !== "success") {
    console.error("[applications] candidate notification message invalid", {
      applicationId: input.applicationId,
      toStatus: input.toStatus,
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
