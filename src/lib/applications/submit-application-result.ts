import { z } from "zod";

/** RPC result codes from `submit_candidate_application` (no `not_matching`). */
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
]);

export type SubmitApplicationRpcResult = z.infer<
  typeof submitApplicationRpcResultSchema
>;
