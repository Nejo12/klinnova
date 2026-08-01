import "server-only";

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { resolveRedirectOrigin } from "@/lib/auth/site-origin";
import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database";

type RouteHandlerClient = {
  supabase: ReturnType<typeof createServerClient<Database>>;
  /**
   * Build a redirect that includes any cookies Supabase mutated during the
   * handler (required after verifyOtp / exchangeCodeForSession).
   */
  redirect: (path: string) => NextResponse;
};

/**
 * Supabase client for App Router route handlers.
 * Cookie writes are applied to the returned redirect response.
 */
export function createRouteHandlerSupabaseClient(
  request: NextRequest,
): RouteHandlerClient {
  const env = getPublicEnv();
  let cookieResponse = NextResponse.next({ request });

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
          cookieResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  return {
    supabase,
    redirect(path: string) {
      const origin = resolveRedirectOrigin({
        hostHeader: request.headers.get("host"),
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
        vercelUrl: process.env.VERCEL_URL,
      });
      const target = new URL(path.startsWith("/") ? path : `/${path}`, origin);
      const redirectResponse = NextResponse.redirect(target);
      cookieResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    },
  };
}
