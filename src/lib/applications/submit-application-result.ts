import { z } from "zod";

import { missingRequirementCodeSchema } from "@/lib/matching/missing-requirement-codes";

/** RPC result codes from `submit_candidate_application` (PR 5.5c/5.5d; no `not_matching`). */
export const submitApplicationRpcResultSchema = z.discriminatedUnion("result", [
  z.object({
    result: z.literal("submitted"),
    application_id: z.string().uuid(),
  }),
  z.object({
    result: z.literal("already_applied"),
    application_id: z.string().uuid(),
  }),
  z.object({
    result: z.literal("incomplete"),
  }),
  z.object({
    result: z.literal("unavailable"),
  }),
  z.object({
    result: z.literal("ineligible"),
    missing_requirements: z.array(missingRequirementCodeSchema),
  }),
]);

export type SubmitApplicationRpcResult = z.infer<
  typeof submitApplicationRpcResultSchema
>;
