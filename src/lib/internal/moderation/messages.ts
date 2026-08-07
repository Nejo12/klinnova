export const MODERATION_GENERIC_FAILURE =
  "Something went wrong. Please try again.";

export const MODERATION_UNAUTHENTICATED =
  "You must be signed in to manage moderation.";

export const MODERATION_VALIDATION =
  "Enter a reason between 1 and 500 characters.";

export const MODERATION_STALE_STATE =
  "This target's state has already changed. Reload to see the current state.";

export const EMPLOYERS_LIST_LEAD =
  "Employers with an account on Stint. Suspend an employer to hide their vacancies and block their account actions. This is not a full admin dashboard.";

export const EMPLOYERS_LIST_EMPTY = "No employers found.";

export const SUSPEND_REASON_LABEL = "Suspension reason";

export const SUSPEND_CONFIRM_LABEL =
  "I confirm this employer should be suspended. This hides their vacancies from discovery, blocks their account actions, and blocks applicant-review access. It does not delete any historical data.";

export const UNSUSPEND_CONFIRM_LABEL =
  "I confirm this employer's suspension should be lifted. Vacancy visibility returns only if the vacancy's current live state still qualifies — nothing is republished automatically.";

export const REVOKE_VERIFICATION_REASON_LABEL = "Revocation reason";

export const REVOKE_VERIFICATION_CONFIRM_LABEL =
  "I confirm this employer's verification should be revoked. Their published vacancies are paused. This is separate from suspension.";

export const MODERATE_VACANCY_REASON_LABEL = "Moderation reason";

export const MODERATE_VACANCY_CONFIRM_LABEL =
  "I confirm this vacancy should be moderated. This removes it from effective-public discovery without changing its employer-controlled publication state.";

export const RESTORE_VACANCY_CONFIRM_LABEL =
  "I confirm this vacancy's moderation hold should be removed. It becomes visible again only if its current publication, verification, and expiry state independently qualify it as effective-public.";

export const AUDIT_HISTORY_EMPTY = "No recorded events yet.";

export const VACANCY_MISMATCH_NOTICE =
  "This vacancy does not belong to the employer in this URL.";
