import {
  VACANCY_GENERIC_FAILURE,
  VACANCY_INCOMPLETE_EMPLOYER,
  VACANCY_LIFECYCLE_INCOMPLETE,
  VACANCY_LIFECYCLE_STALE,
  VACANCY_NOT_DELETABLE,
  VACANCY_UNAUTHENTICATED,
  VACANCY_UNAVAILABLE,
  VACANCY_VALIDATION,
} from "@/lib/employer/vacancies/messages";

export function mapCreateDraftStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return VACANCY_UNAUTHENTICATED;
    case "incomplete_employer":
    case "missing_profile":
      return VACANCY_INCOMPLETE_EMPLOYER;
    case "validation_error":
    case "conflict_check":
      return VACANCY_VALIDATION;
    case "missing_company":
      return "Your organisation company is missing. Finish employer onboarding and try again.";
    case "conflict_unique":
      return "A draft with a conflicting title already exists. Try a different title.";
    default:
      return VACANCY_GENERIC_FAILURE;
  }
}

export function mapUpdateDraftStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return VACANCY_UNAUTHENTICATED;
    case "unavailable":
      return VACANCY_UNAVAILABLE;
    case "conflict_check":
      return VACANCY_VALIDATION;
    default:
      return VACANCY_GENERIC_FAILURE;
  }
}

export function mapReplaceLanguagesStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return VACANCY_UNAUTHENTICATED;
    case "unavailable":
      return VACANCY_UNAVAILABLE;
    case "validation_error":
    case "conflict_check":
    case "conflict_unique":
      return VACANCY_VALIDATION;
    default:
      return VACANCY_GENERIC_FAILURE;
  }
}

export function mapDeleteDraftStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return VACANCY_UNAUTHENTICATED;
    case "unavailable":
      return VACANCY_UNAVAILABLE;
    case "not_deletable":
      return VACANCY_NOT_DELETABLE;
    default:
      return VACANCY_GENERIC_FAILURE;
  }
}

// ---------------------------------------------------------------------------
// PR 5.4 — lifecycle status mapping. `incomplete` carries a `missing` array
// handled separately by the caller (mapped through
// `mapReadinessChecklist`) — these functions only cover the plain error
// message shown alongside it.
// ---------------------------------------------------------------------------

export function mapPublishStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return VACANCY_UNAUTHENTICATED;
    case "unavailable":
      return VACANCY_UNAVAILABLE;
    case "invalid_state":
      return VACANCY_LIFECYCLE_STALE;
    case "incomplete":
      return VACANCY_LIFECYCLE_INCOMPLETE;
    default:
      return VACANCY_GENERIC_FAILURE;
  }
}

export function mapPauseStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return VACANCY_UNAUTHENTICATED;
    case "unavailable":
      return VACANCY_UNAVAILABLE;
    case "invalid_state":
      return VACANCY_LIFECYCLE_STALE;
    default:
      return VACANCY_GENERIC_FAILURE;
  }
}

export function mapResumeStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return VACANCY_UNAUTHENTICATED;
    case "unavailable":
      return VACANCY_UNAVAILABLE;
    case "invalid_state":
      return VACANCY_LIFECYCLE_STALE;
    case "incomplete":
      return VACANCY_LIFECYCLE_INCOMPLETE;
    default:
      return VACANCY_GENERIC_FAILURE;
  }
}

export function mapFillStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return VACANCY_UNAUTHENTICATED;
    case "unavailable":
      return VACANCY_UNAVAILABLE;
    case "invalid_state":
      return VACANCY_LIFECYCLE_STALE;
    default:
      return VACANCY_GENERIC_FAILURE;
  }
}

export function mapWithdrawStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return VACANCY_UNAUTHENTICATED;
    case "unavailable":
      return VACANCY_UNAVAILABLE;
    case "invalid_state":
      return VACANCY_LIFECYCLE_STALE;
    default:
      return VACANCY_GENERIC_FAILURE;
  }
}

export function mapMaterializeExpiryStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return VACANCY_UNAUTHENTICATED;
    case "unavailable":
      return VACANCY_UNAVAILABLE;
    default:
      return VACANCY_GENERIC_FAILURE;
  }
}

export function mapRenewStatus(status: string): string {
  switch (status) {
    case "unauthenticated":
      return VACANCY_UNAUTHENTICATED;
    case "unavailable":
      return VACANCY_UNAVAILABLE;
    case "invalid_state":
      return VACANCY_LIFECYCLE_STALE;
    default:
      return VACANCY_GENERIC_FAILURE;
  }
}
