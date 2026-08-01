import type { ZodError } from "zod";

/**
 * Format validation failures without including secret values.
 */
export function formatEnvError(error: ZodError): string {
  const details = error.issues.map((issue) => {
    const name = issue.path.join(".") || "environment";
    return `- ${name}: ${issue.message}`;
  });

  return ["Invalid environment configuration:", ...details].join("\n");
}
