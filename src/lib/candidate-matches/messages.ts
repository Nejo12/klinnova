// Shared with `candidate/matches/loading.tsx` (P3.6 Task F) — that route's
// loading fallback renders these directly, unwrapped by any skeleton, since
// the copy is static and never depends on `loadCurrentCandidateMatchesPage`'s
// outcome. Importing the same constants both places means the two can't
// drift out of sync, matching the precedent `PUBLIC_JOBS_HEADING`/
// `PUBLIC_JOBS_LEAD` (`src/lib/public-jobs/messages.ts`) already set for
// `/jobs`.
export const CANDIDATE_MATCHES_HEADING = "Jobs that match your preferences";

export const CANDIDATE_MATCHES_LEAD =
  "These jobs match all of the preferences currently saved in your profile.";
