/**
 * Pure routing for `/candidate` after the authenticated profile is loaded.
 * Completion uses persisted `onboarding_completed_at` only.
 */
export type CandidateHomeView =
  | { kind: "redirect"; href: "/candidate/matches" }
  | {
      kind: "incomplete";
      continueHref: string;
    };

export function resolveCandidateHomeView(options: {
  onboardingCompleted: boolean;
  continueHref: string;
}): CandidateHomeView {
  if (options.onboardingCompleted) {
    return { kind: "redirect", href: "/candidate/matches" };
  }

  return {
    kind: "incomplete",
    continueHref: options.continueHref,
  };
}
