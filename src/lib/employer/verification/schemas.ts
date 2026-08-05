import { z } from "zod";

export const requestVerificationFormSchema = z.object({
  attestationConfirmed: z
    .union([z.boolean(), z.string()])
    .transform((value) =>
      typeof value === "boolean"
        ? value
        : value === "true" || value === "on" || value === "1",
    )
    .refine((value) => value === true, {
      message: "Confirm the attestation before requesting verification.",
    }),
});

export const requestVerificationRpcResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("ok"),
      employer_profile_id: z.string().uuid(),
    }),
    z.object({ status: z.literal("unauthenticated") }),
    z.object({ status: z.literal("unavailable") }),
    z.object({ status: z.literal("incomplete") }),
    z.object({ status: z.literal("invalid_state") }),
  ],
);
