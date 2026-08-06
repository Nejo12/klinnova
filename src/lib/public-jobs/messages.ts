export const PUBLIC_JOBS_HEADING = "Jobs in Berlin";

export const PUBLIC_JOBS_LEAD =
  "Verified Berlin employers publish roles here that do not require fluent German. Browse what is currently open — sign in to check your eligibility and apply.";

export const PUBLIC_JOBS_EMPTY_HEADING = "No jobs are open right now";

export const PUBLIC_JOBS_EMPTY_BODY =
  "Check back soon. New verified vacancies appear here as employers publish them.";

export const PUBLIC_JOBS_LOAD_FAILURE_HEADING = "Jobs are unavailable";

export const PUBLIC_JOBS_LOAD_FAILURE_BODY =
  "Something went wrong loading open jobs. Please try again.";

export const DEMO_VACANCY_LABEL = "Demo vacancy";

export const APPLICATION_ENTRY_NOTICE =
  "Sign in to check your eligibility and apply.";

export const PUBLIC_JOB_NOT_FOUND_HEADING = "Job not found";

export const PUBLIC_JOB_NOT_FOUND_BODY =
  "This vacancy is not available. It may have closed, been filled, or been removed.";

export function formatPublicVacancyCount(count: number): string {
  return count === 1 ? "1 open job" : `${count} open jobs`;
}
