import { z } from "zod";

import {
  ONBOARDING_GROUPS,
  type OnboardingGroupId,
} from "@/lib/onboarding/allow-lists";

const onboardingGroupSchema = z.enum(ONBOARDING_GROUPS);

export const completeOnboardingResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("missing_profile") }),
  z.object({
    status: z.literal("incomplete"),
    first_incomplete_group: onboardingGroupSchema,
  }),
  z.object({
    status: z.literal("completed"),
    already_complete: z.boolean(),
  }),
]);

export type CompleteOnboardingResult = z.infer<
  typeof completeOnboardingResultSchema
>;

export function isOnboardingGroupId(value: string): value is OnboardingGroupId {
  return (ONBOARDING_GROUPS as readonly string[]).includes(value);
}
