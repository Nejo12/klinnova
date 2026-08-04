import {
  EMPLOYER_GENERIC_FAILURE,
  EMPLOYER_SLUG_CONFLICT,
  EMPLOYER_TYPE_LOCKED,
} from "@/lib/employer/messages";

type PostgrestLikeError = {
  code?: string;
  message?: string;
} | null;

/** Map PostgREST / Postgres errors to safe employer-facing copy. */
export function mapEmployerWriteError(error: PostgrestLikeError): string {
  if (error === null) {
    return EMPLOYER_GENERIC_FAILURE;
  }

  if (
    error.code === "23514" ||
    (error.message?.includes("employer_type_locked") ?? false)
  ) {
    return EMPLOYER_TYPE_LOCKED;
  }

  if (error.code === "23505") {
    return EMPLOYER_SLUG_CONFLICT;
  }

  return EMPLOYER_GENERIC_FAILURE;
}

export function mapBootstrapStatus(status: string): string {
  switch (status) {
    case "conflict_unique":
      return EMPLOYER_SLUG_CONFLICT;
    case "conflict_private_completed":
    case "conflict_private_with_company":
    case "conflict_check":
      return EMPLOYER_TYPE_LOCKED;
    case "validation_error":
      return "Check the organisation details and try again.";
    case "unauthenticated":
      return "You must be signed in to continue.";
    default:
      return EMPLOYER_GENERIC_FAILURE;
  }
}
