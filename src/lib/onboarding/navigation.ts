import {
  ONBOARDING_GROUPS,
  type OnboardingGroupId,
} from "@/lib/onboarding/allow-lists";

export function nextOnboardingGroup(
  current: OnboardingGroupId,
): OnboardingGroupId | "review" {
  const index = ONBOARDING_GROUPS.indexOf(current);
  if (index < 0 || index >= ONBOARDING_GROUPS.length - 1) {
    return "review";
  }
  return ONBOARDING_GROUPS[index + 1] ?? "review";
}

export function previousOnboardingGroup(
  current: OnboardingGroupId,
): OnboardingGroupId | null {
  const index = ONBOARDING_GROUPS.indexOf(current);
  if (index <= 0) {
    return null;
  }
  return ONBOARDING_GROUPS[index - 1] ?? null;
}

export function onboardingGroupHref(
  group: OnboardingGroupId | "review",
): string {
  return `/candidate/onboarding?group=${group}`;
}
