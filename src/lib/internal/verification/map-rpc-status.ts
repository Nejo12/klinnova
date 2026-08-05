import {
  INTERNAL_GENERIC_FAILURE,
  INTERNAL_REASON_INVALID,
  INTERNAL_STALE_INCOMPLETE,
  INTERNAL_STALE_STATE,
  INTERNAL_UNAUTHENTICATED,
  INTERNAL_UNAVAILABLE,
} from "@/lib/internal/verification/messages";

export function mapApproveVerificationStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return INTERNAL_UNAUTHENTICATED;
    case "forbidden":
      return INTERNAL_UNAVAILABLE;
    case "unavailable":
      return INTERNAL_UNAVAILABLE;
    case "incomplete":
      return INTERNAL_STALE_INCOMPLETE;
    case "invalid_state":
      return INTERNAL_STALE_STATE;
    default:
      return INTERNAL_GENERIC_FAILURE;
  }
}

export function mapRejectVerificationStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return INTERNAL_UNAUTHENTICATED;
    case "forbidden":
      return INTERNAL_UNAVAILABLE;
    case "validation_error":
      return INTERNAL_REASON_INVALID;
    case "unavailable":
      return INTERNAL_UNAVAILABLE;
    case "invalid_state":
      return INTERNAL_STALE_STATE;
    default:
      return INTERNAL_GENERIC_FAILURE;
  }
}
