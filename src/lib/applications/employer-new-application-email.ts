/**
 * N2 employer new-application email copy. Deliberately privacy-minimal
 * (D-070/N2): the authenticated application is where candidate detail
 * belongs, not this email. Contains only the vacancy title, Klinnova
 * identity, and a safe authenticated destination — never candidate name,
 * email, phone, address, application answers, or any internal identifier
 * beyond what the URL itself requires. Plain text only; no HTML — this is a
 * one-line attention nudge, not a document. Structure kept easy to revise
 * once Unit H legal review lands; no legal footer content is invented here.
 */
export type EmployerNewApplicationEmailInput = {
  vacancyTitle: string;
  reviewUrl: string;
};

export type EmployerNewApplicationEmailContent = {
  subject: string;
  text: string;
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
    ].join("\n"),
  };
}
