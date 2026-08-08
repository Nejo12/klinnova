/**
 * D-081 fixed failure-code allow-list, matching
 * `deletion_requests_failure_code_chk` exactly. Never persist a raw
 * exception/Auth Admin/Postgres error string — normalize to one of these
 * five values first.
 */
export const DELETION_FAILURE_CODES = [
  "domain_scrub_failed",
  "auth_delete_failed",
  "auth_verification_failed",
  "auth_evidence_failed",
  "unknown",
] as const;

export type DeletionFailureCode = (typeof DELETION_FAILURE_CODES)[number];

export function normalizeFailureCode(candidate: string): DeletionFailureCode {
  return (DELETION_FAILURE_CODES as readonly string[]).includes(candidate)
    ? (candidate as DeletionFailureCode)
    : "unknown";
}
