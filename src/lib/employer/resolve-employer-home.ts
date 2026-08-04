export type EmployerHomeView =
  | { kind: "redirect"; href: string }
  | {
      kind: "home";
      displayName: string;
      employerTypeLabel: string;
      companyName: string | null;
      verificationState: string;
    };

export function resolveEmployerHomeView(options: {
  hasProfile: boolean;
  onboardingCompleted: boolean;
  displayName: string | null;
  employerType: "private" | "organisation" | null;
  companyName: string | null;
  verificationState: string | null;
}): EmployerHomeView {
  if (!options.hasProfile || !options.onboardingCompleted) {
    return { kind: "redirect", href: "/employer/onboarding" };
  }

  return {
    kind: "home",
    displayName: options.displayName?.trim() || "Employer",
    employerTypeLabel:
      options.employerType === "organisation" ? "Organisation" : "Private",
    companyName: options.companyName,
    verificationState: options.verificationState ?? "unverified",
  };
}
