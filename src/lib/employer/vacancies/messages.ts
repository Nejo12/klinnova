export const VACANCY_GENERIC_FAILURE =
  "Something went wrong. Please try again.";

export const VACANCY_UNAVAILABLE = "This vacancy is not available.";

export const VACANCY_UNAUTHENTICATED =
  "You must be signed in to manage vacancies.";

export const VACANCY_INCOMPLETE_EMPLOYER =
  "Finish employer onboarding before managing vacancy drafts.";

export const VACANCY_NOT_DELETABLE = "This draft cannot be deleted right now.";

export const VACANCY_VALIDATION = "Check the highlighted fields and try again.";

export const VACANCY_PRIVATE_NOTICE =
  "Drafts are private. Candidates and the public cannot see them. Ready means ready for a future publication step — not published.";

export const VACANCY_VERIFICATION_INFO =
  "Verification is required before publishing. Verification and publication are not available in this step.";

export const VACANCY_LOCALITY_SUPPORT =
  "Public Berlin locality or district candidates may eventually see. Do not enter a street address.";

export const VACANCY_PRIVATE_HOME_WARNING =
  "Private-home workplaces stay address-private. Only the public locality is stored here — never a street address.";

export const VACANCY_EMPTY_LIST =
  "You have no vacancies yet. Create a private draft to start describing a role.";

// ---------------------------------------------------------------------------
// P3 employer presentation — vacancies-list empty states (Task H).
// ---------------------------------------------------------------------------

export const VACANCY_VERIFICATION_EMPTY_HEADING = "Verification not finished";

export const VACANCY_VERIFICATION_EMPTY_SUPPORT =
  "You can prepare and save vacancies now. Publishing opens once your company is verified.";

export const VACANCY_VERIFICATION_EMPTY_ACTION = "Continue verification";

// Shared with `employer/vacancies/loading.tsx` (P3.6 Task F) — that
// route's loading fallback renders this directly, unwrapped by any
// skeleton, since it's static chrome that never depends on
// `loadEmployerDrafts`'s outcome. Importing the same constant both places
// means the two can't drift out of sync.
export const VACANCY_LIST_HEADING = "Vacancies";

export const VACANCY_LIST_LEAD =
  "Create, publish and manage roles. Live work stays distinct from drafts and closed states.";

export const VACANCY_CREATED =
  "Draft saved. You can keep editing — nothing is published.";

export const VACANCY_UPDATED = "Draft changes saved.";

export const VACANCY_LANGUAGES_UPDATED = "Language requirements saved.";

export const VACANCY_DELETED = "Draft deleted.";

// ---------------------------------------------------------------------------
// PR 5.4 — lifecycle controls
// ---------------------------------------------------------------------------

export const VACANCY_LIFECYCLE_STALE =
  "This vacancy's status changed since the page loaded. It has been refreshed below.";

export const VACANCY_LIFECYCLE_INCOMPLETE =
  "This vacancy is not ready to publish yet. See the missing items below.";

export const VACANCY_PUBLISH_CONFIRM =
  "Publishing may make this vacancy publicly visible. Only currently eligible vacancies become effectively public, and publishing does not create applications automatically.";

export const VACANCY_PAUSE_CONFIRM =
  "Pausing stops this vacancy from being publicly visible. Existing applications are preserved.";

export const VACANCY_RESUME_CONFIRM =
  "Resuming checks readiness and verification again. This vacancy becomes public only if every requirement still passes.";

export const VACANCY_FILL_CONFIRM =
  "Marking this vacancy filled is final. It cannot be resumed or edited afterward. Existing applications are preserved.";

export const VACANCY_WITHDRAW_CONFIRM =
  "Withdrawing this vacancy is final. It cannot be resumed. Existing applications are preserved.";

export const VACANCY_RENEW_CONFIRM =
  "Renewing returns this vacancy to draft. It must be reviewed and published again with a new expiry. Its publication history is preserved.";

export const VACANCY_PUBLISH_EXPIRY_NOTE =
  "Publishing sets a 30-day expiry by default (maximum 90 days). Renew after expiry to publish again.";

export const VACANCY_VERIFICATION_BLOCKER =
  "Employer verification is required before this vacancy can be published.";

export const VACANCY_EFFECTIVE_EXPIRED_NOTE =
  "This vacancy's expiry date has passed. It is no longer publicly visible even though its stored status has not been refreshed yet.";
