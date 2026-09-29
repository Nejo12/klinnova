/**
 * N3 candidate status-change email copy. Sent only for a genuinely
 * successful transition into one of these three statuses (D-070's
 * forward-only/terminal matrix: `submitted`/`reviewing` are never terminal
 * and never notified — see `notify-candidate-status-change.ts`).
 */
import { renderBusinessEmailHtml } from "@/lib/mail/presentation";

export const NOTIFIABLE_APPLICATION_STATUSES = [
  "shortlisted",
  "accepted",
  "rejected",
] as const;

export type NotifiableApplicationStatus =
  (typeof NOTIFIABLE_APPLICATION_STATUSES)[number];

export function isNotifiableApplicationStatus(
  value: string,
): value is NotifiableApplicationStatus {
  return (NOTIFIABLE_APPLICATION_STATUSES as readonly string[]).includes(value);
}

/**
 * Deliberately has no field for an employer-authored rejection reason (or
 * any other private history field) — the candidate-safe boundary is
 * architectural, not a filtering step a future edit could accidentally
 * bypass. `accepted` copy is high-scrutiny (D-070: `accepted != hired`,
 * `hired` is a separate application outcome event) and must never claim
 * employment, a contract, a scheduled shift, or a start date.
 */
export type CandidateStatusEmailInput = {
  toStatus: NotifiableApplicationStatus;
  vacancyTitle: string;
  applicationUrl: string;
};

export type CandidateStatusEmailContent = {
  subject: string;
  text: string;
  html: string;
};

function signInLines(applicationUrl: string): string[] {
  return [
    "",
    "Sign in to Klinnova to view your application status.",
    "",
    applicationUrl,
    "",
    "Need help? support@klinnova.com",
  ];
}

function statusHtml(
  heading: string,
  paragraphs: string[],
  applicationUrl: string,
): string {
  return renderBusinessEmailHtml({
    heading,
    paragraphs,
    actionLabel: "View application",
    actionUrl: applicationUrl,
  });
}

function buildShortlisted(
  input: CandidateStatusEmailInput,
): CandidateStatusEmailContent {
  return {
    subject: `Your application for ${input.vacancyTitle} was shortlisted`,
    text: [
      `Your application for ${input.vacancyTitle} has been shortlisted.`,
      ...signInLines(input.applicationUrl),
    ].join("\n"),
    html: statusHtml(
      `Your application for ${input.vacancyTitle} was shortlisted`,
      [
        `Your application for ${input.vacancyTitle} has been shortlisted.`,
        "Sign in to Klinnova to view your application status.",
      ],
      input.applicationUrl,
    ),
  };
}

function buildAccepted(
  input: CandidateStatusEmailInput,
): CandidateStatusEmailContent {
  return {
    subject: `Your application for ${input.vacancyTitle} was accepted`,
    text: [
      `Your application for ${input.vacancyTitle} has been accepted.`,
      "",
      "Acceptance in Klinnova does not by itself confirm that you have been hired or that a work agreement has been completed.",
      ...signInLines(input.applicationUrl),
    ].join("\n"),
    html: statusHtml(
      `Your application for ${input.vacancyTitle} was accepted`,
      [
        `Your application for ${input.vacancyTitle} has been accepted.`,
        "Acceptance in Klinnova does not by itself confirm that you have been hired or that a work agreement has been completed.",
        "Sign in to Klinnova to view your application status.",
      ],
      input.applicationUrl,
    ),
  };
}

function buildRejected(
  input: CandidateStatusEmailInput,
): CandidateStatusEmailContent {
  return {
    subject: `Update on your application for ${input.vacancyTitle}`,
    text: [
      `Your application for ${input.vacancyTitle} was not selected.`,
      ...signInLines(input.applicationUrl),
    ].join("\n"),
    html: statusHtml(
      `Update on your application for ${input.vacancyTitle}`,
      [
        `Your application for ${input.vacancyTitle} was not selected.`,
        "Sign in to Klinnova to view your application status.",
      ],
      input.applicationUrl,
    ),
  };
}

export function buildCandidateStatusEmail(
  input: CandidateStatusEmailInput,
): CandidateStatusEmailContent {
  switch (input.toStatus) {
    case "shortlisted":
      return buildShortlisted(input);
    case "accepted":
      return buildAccepted(input);
    case "rejected":
      return buildRejected(input);
    default: {
      const exhaustive: never = input.toStatus;
      return exhaustive;
    }
  }
}
