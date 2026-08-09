import { type NextRequest } from "next/server";

import { confirmAuthCallback } from "@/lib/auth/confirm";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const { supabase, redirect } = createRouteHandlerSupabaseClient(request);

  const result = await confirmAuthCallback(supabase, {
    token_hash: searchParams.get("token_hash"),
    type: searchParams.get("type"),
    code: searchParams.get("code"),
    next: searchParams.get("next"),
    intent: searchParams.get("intent"),
  });

  if (!result.ok) {
    const path =
      result.reason === "profile"
        ? "/auth/error?reason=profile"
        : result.reason === "recovery"
          ? "/auth/error?reason=recovery"
          : "/auth/error";
    return redirect(path);
  }

  return redirect(result.nextPath);
}
