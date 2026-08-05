import {
  VERIFICATION_GENERIC_FAILURE,
  VERIFICATION_INCOMPLETE_EMPLOYER,
  VERIFICATION_INVALID_STATE,
  VERIFICATION_UNAUTHENTICATED,
  VERIFICATION_UNAVAILABLE,
} from "@/lib/employer/verification/messages";

export function mapRequestVerificationStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return VERIFICATION_UNAUTHENTICATED;
    case "unavailable":
      return VERIFICATION_UNAVAILABLE;
    case "incomplete":
      return VERIFICATION_INCOMPLETE_EMPLOYER;
    case "invalid_state":
      return VERIFICATION_INVALID_STATE;
    default:
      return VERIFICATION_GENERIC_FAILURE;
  }
}
