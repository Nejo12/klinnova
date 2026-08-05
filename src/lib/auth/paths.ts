/**
 * Capability-aware path helpers for dual candidate/employer routing (D-047).
 * Employer capability is represented by employer_profiles, not a global role.
 */

/** True when the path is inside the protected candidate area. */
export function isCandidatePath(pathname: string): boolean {
  return pathname === "/candidate" || pathname.startsWith("/candidate/");
}

/**
 * True for employer app paths, including the public registration entry.
 * Use {@link isProtectedEmployerPath} for auth gating.
 */
export function isEmployerPath(pathname: string): boolean {
  return pathname === "/employer" || pathname.startsWith("/employer/");
}

/** True when unauthenticated users must be redirected to login. */
export function isProtectedEmployerPath(pathname: string): boolean {
  if (pathname === "/employer/register") {
    return false;
  }
  return isEmployerPath(pathname);
}

/** True when a validated next path expresses employer intent. */
export function isEmployerIntentPath(pathname: string): boolean {
  return isEmployerPath(pathname);
}

/** True when a validated next path expresses candidate intent. */
export function isCandidateIntentPath(pathname: string): boolean {
  return isCandidatePath(pathname);
}

/**
 * True for internal operator app paths (e.g. `/internal/verification`).
 * Every internal path is protected — there is no public entry equivalent
 * to `/employer/register`, and no candidate/employer intent is expressed
 * here.
 */
export function isInternalPath(pathname: string): boolean {
  return pathname === "/internal" || pathname.startsWith("/internal/");
}
