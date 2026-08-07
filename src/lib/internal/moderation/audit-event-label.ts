import type { AuditEventType } from "@/lib/internal/moderation/schemas";

/**
 * Exhaustive map from the closed `event_type` enum to human-readable copy.
 * A `never` exhaustiveness check means an unmapped event type is a
 * compile-time error here, and the schema itself rejects an unknown
 * `event_type` at runtime — the UI never renders a raw enum value.
 */
export function auditEventLabel(eventType: AuditEventType): string {
  switch (eventType) {
    case "employer_suspended":
      return "Employer suspended";
    case "employer_unsuspended":
      return "Employer unsuspended";
    case "vacancy_moderated":
      return "Vacancy moderated";
    case "vacancy_restored":
      return "Vacancy restored";
    case "verification_approved":
      return "Verification approved";
    case "verification_rejected":
      return "Verification rejected";
    case "verification_revoked":
      return "Verification revoked";
    default: {
      const exhaustive: never = eventType;
      throw new Error(`Unmapped audit event type: ${String(exhaustive)}`);
    }
  }
}
