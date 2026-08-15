import "server-only";

import { z } from "zod";

import { formatEnvError } from "@/lib/env/format-error";

/**
 * N1 business transactional-email configuration. Conceptually distinct from
 * Supabase Auth email (password reset, confirmation) — Preview evidence for
 * Auth SMTP does not establish a business-mail provider or Production
 * configuration. `MAIL_FROM_ADDRESS` is required and never defaulted here:
 * N1 must not invent a Production sender identity.
 */
const mailEnvSchema = z.object({
  MAIL_TRANSPORT: z.literal("resend").default("resend"),
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM_ADDRESS: z.string().min(1),
});

export type MailEnv = z.infer<typeof mailEnvSchema>;

let cachedMailEnv: MailEnv | undefined;

function readMailEnv(): MailEnv {
  const parsed = mailEnvSchema.safeParse({
    MAIL_TRANSPORT: process.env.MAIL_TRANSPORT,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAIL_FROM_ADDRESS: process.env.MAIL_FROM_ADDRESS,
  });

  if (!parsed.success) {
    throw new Error(formatEnvError(parsed.error));
  }

  return parsed.data;
}

/** Server-only, fail-fast business-mail config. Never import from Client Components. */
export function getMailEnv(): MailEnv {
  if (cachedMailEnv === undefined) {
    cachedMailEnv = readMailEnv();
  }

  return cachedMailEnv;
}

/** Test helper: clear cached env between Vitest cases. */
export function resetMailEnvCache(): void {
  cachedMailEnv = undefined;
}
