export const EMPLOYER_GENERIC_FAILURE =
  "Something went wrong. Please try again.";

export const EMPLOYER_UNAUTHENTICATED =
  "You must be signed in to continue as an employer.";

export const EMPLOYER_TYPE_LOCKED =
  "Your employer type can no longer be changed. Complete onboarding with the current type, or contact support if you need help.";

export const EMPLOYER_SLUG_CONFLICT =
  "That company web address is already in use. Choose a different slug.";

export const EMPLOYER_COMPLETION_INCOMPLETE =
  "Some required employer details are still missing. Review the form and try again.";

export const EMPLOYER_LAWFUL_HIRING_SUPPORT =
  "Confirm that you will only hire people who are allowed to work in Germany for the roles you post.";

export const EMPLOYER_VERIFICATION_NOTICE =
  "Your employer profile is complete. Verification is required before a vacancy can be published.";

export const EMPLOYER_HOME_LEAD =
  "Your hiring workspace: new applications first, vacancy readiness second.";

export const EMPLOYER_RESTRICTED_NOTICE =
  "Your employer account is temporarily restricted. Some employer actions are unavailable while the restriction is active.";

export const EMPLOYER_RESTRICTED_APPLICATIONS =
  "Applications are unavailable while your employer account is restricted.";

export const EMPLOYER_RESTRICTED_ACTION =
  "This action is unavailable while your employer account is restricted.";

export const EMPLOYER_RESTRICTED_VERIFICATION =
  "Verification requests are unavailable while your employer account is restricted.";

export const EMPLOYER_VACANCY_HIDDEN_WHILE_RESTRICTED =
  "Hidden while account is restricted";

// ---------------------------------------------------------------------------
// P3 employer home — attention slot, "needs your action" side card, mini-list
// ---------------------------------------------------------------------------

/** Attention-slot heading when there are unopened applications. Precedence:
 * unseen applications beat the readiness/verification card (Task F). */
export function unseenApplicationsHeading(count: number): string {
  const noun = count === 1 ? "application" : "applications";
  const verb = count === 1 ? "is" : "are";
  return `${count} new ${noun} ${verb} waiting to be opened.`;
}

export const EMPLOYER_ATTENTION_VACANCIES_HEADING = "Needs your action";

export const EMPLOYER_VACANCIES_MINI_LIST_HEADING = "Your vacancies";
