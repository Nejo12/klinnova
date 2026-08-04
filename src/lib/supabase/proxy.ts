import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isCandidatePath, isProtectedEmployerPath } from "@/lib/auth/paths";
import { resolveRedirectOrigin } from "@/lib/auth/site-origin";
import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database";

export { isCandidatePath, isProtectedEmployerPath };

/** Copy Set-Cookie values from a Supabase-mutated response onto another response. */
export function copyCookies(
  from: NextResponse,
  to: NextResponse,
): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

function isProtectedAppPath(pathname: string): boolean {
  return (
    isCandidatePath(pathname) ||
    isProtectedEmployerPath(pathname) ||
    pathname === "/account/choose"
  );
}

/**
 * Refresh Auth cookies and protect candidate/employer authenticated areas.
 * Uses verified claims (`getClaims`), not `getSession()`, for access decisions.
 * Performs no database writes and never uses a service-role client.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const env = getPublicEnv();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Do not insert logic between createServerClient and getClaims.
  const { data, error } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub) && error === null;
  const pathname = request.nextUrl.pathname;

  if (!authenticated && isProtectedAppPath(pathname)) {
    const origin = resolveRedirectOrigin({
      hostHeader: request.headers.get("host"),
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
      vercelUrl: process.env.VERCEL_URL,
    });
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    return copyCookies(supabaseResponse, redirectResponse);
  }

  return supabaseResponse;
}
