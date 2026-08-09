/** Generic copy that avoids account enumeration where practical. */
export const AUTH_GENERIC_FAILURE =
  "Something went wrong. Check your details and try again.";

export const AUTH_CHECK_EMAIL =
  "Check your email for a confirmation link to continue.";

export const AUTH_CONFIRM_FAILED =
  "That confirmation link is invalid or has expired. Request a new one by registering again, or log in if you already confirmed.";

export const AUTH_PROFILE_REQUIRED =
  "Your account needs a display name before you can continue. Register again with a display name.";

/** Enumeration-safe: identical regardless of whether the email exists (D-M5-21). */
export const AUTH_RESET_REQUEST_SENT =
  "If an account exists for that email, we've sent password reset instructions.";

export const AUTH_RESET_LINK_INVALID =
  "That password reset link is invalid or has expired. Request a new one.";

export const AUTH_RESET_SUCCESS = "Your password has been reset.";
