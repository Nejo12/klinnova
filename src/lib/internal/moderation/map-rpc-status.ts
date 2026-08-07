import {
  MODERATION_GENERIC_FAILURE,
  MODERATION_STALE_STATE,
  MODERATION_UNAUTHENTICATED,
  MODERATION_VALIDATION,
} from "@/lib/internal/moderation/messages";
import { INTERNAL_UNAVAILABLE } from "@/lib/internal/verification/messages";

export function mapSuspendEmployerStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return MODERATION_UNAUTHENTICATED;
    case "forbidden":
      return INTERNAL_UNAVAILABLE;
    case "validation_error":
      return MODERATION_VALIDATION;
    case "unavailable":
      return INTERNAL_UNAVAILABLE;
    case "already_in_state":
      return MODERATION_STALE_STATE;
    default:
      return MODERATION_GENERIC_FAILURE;
  }
}

export function mapUnsuspendEmployerStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return MODERATION_UNAUTHENTICATED;
    case "forbidden":
      return INTERNAL_UNAVAILABLE;
    case "unavailable":
      return INTERNAL_UNAVAILABLE;
    case "already_in_state":
      return MODERATION_STALE_STATE;
    default:
      return MODERATION_GENERIC_FAILURE;
  }
}

export function mapModerateVacancyStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return MODERATION_UNAUTHENTICATED;
    case "forbidden":
      return INTERNAL_UNAVAILABLE;
    case "validation_error":
      return MODERATION_VALIDATION;
    case "unavailable":
      return INTERNAL_UNAVAILABLE;
    case "already_in_state":
      return MODERATION_STALE_STATE;
    default:
      return MODERATION_GENERIC_FAILURE;
  }
}

export function mapRestoreVacancyStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return MODERATION_UNAUTHENTICATED;
    case "forbidden":
      return INTERNAL_UNAVAILABLE;
    case "unavailable":
      return INTERNAL_UNAVAILABLE;
    case "already_in_state":
      return MODERATION_STALE_STATE;
    default:
      return MODERATION_GENERIC_FAILURE;
  }
}

export function mapRevokeVerificationStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return MODERATION_UNAUTHENTICATED;
    case "forbidden":
      return INTERNAL_UNAVAILABLE;
    case "validation_error":
      return MODERATION_VALIDATION;
    case "unavailable":
      return INTERNAL_UNAVAILABLE;
    case "invalid_state":
      return MODERATION_STALE_STATE;
    default:
      return MODERATION_GENERIC_FAILURE;
  }
}
