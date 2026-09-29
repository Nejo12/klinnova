/**
 * N2 employer new-application email copy. Deliberately privacy-minimal
 * (D-070/N2): the authenticated application is where candidate detail
 * belongs, not this email. Contains only the vacancy title, Klinnova
 * identity, and a safe authenticated destination — never candidate name,
 * email, phone, address, application answers, or any internal identifier
 * beyond what the URL itself requires. No legal footer content is invented.
 */
import { renderBusinessEmailHtml } from "@/lib/mail/presentation";

export type EmployerNewApplicationEmailInput = {
  vacancyTitle: string;
  reviewUrl: string;
};

export type EmployerNewApplicationEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function buildEmployerNewApplicationEmail(
  input: EmployerNewApplicationEmailInput,
): EmployerNewApplicationEmailContent {
  return {
    subject: `New application for ${input.vacancyTitle}`,
    text: [
      `You received a new application for ${input.vacancyTitle}.`,
      "",
      "Sign in to Klinnova to review the application.",
      "",
      input.reviewUrl,
      "",
      "Need help? support@klinnova.com",
    ].join("\n"),
    html: renderBusinessEmailHtml({
      heading: `New application for ${input.vacancyTitle}`,
      paragraphs: [
        `You received a new application for ${input.vacancyTitle}. Sign in to Klinnova to review it.`,
      ],
      actionLabel: "Review application",
      actionUrl: input.reviewUrl,
    }),
  };
}
