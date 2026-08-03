"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { submitApplicationRpcResultSchema } from "@/lib/applications/submit-application-result";
import type { SubmitCandidateApplicationState } from "@/lib/applications/submit-action-state";
import { resolveCandidateVacancyMatch } from "@/lib/matching/resolve-candidate-vacancy-match";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const vacancyIdSchema = z.string().uuid();

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Explicit candidate application submission.
 * Rechecks Auth, completion, RLS-visible vacancy, and the TypeScript matcher
 * before calling Auth-bound `submit_candidate_application` with vacancy ID only.
 */
export async function submitCandidateApplicationAction(
  _prev: SubmitCandidateApplicationState,
  formData: FormData,
): Promise<SubmitCandidateApplicationState> {
  void _prev;

  const vacancyIdRaw = formString(formData, "vacancyId");
  const parsedId = vacancyIdSchema.safeParse(vacancyIdRaw);
  if (!parsedId.success) {
    return { status: "validation_error" };
  }

  const vacancyId = parsedId.data;
  const detailPath = `/candidate/jobs/${vacancyId}`;

  const resolved = await resolveCandidateVacancyMatch(vacancyId);

  switch (resolved.status) {
    case "unauthenticated":
      redirect(`/login?next=${encodeURIComponent(detailPath)}`);
    case "profile_missing":
      redirect("/auth/error?reason=profile");
    case "incomplete":
      redirect("/candidate/onboarding");
    case "unavailable":
      return { status: "unavailable" };
    case "not_matching":
      return { status: "not_matching" };
    case "failure":
      return { status: "failure" };
    case "ready":
      break;
    default: {
      const _exhaustive: never = resolved;
      return _exhaustive;
    }
  }

  // Matcher already passed in resolve; call RPC with vacancy ID only.
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("submit_candidate_application", {
    p_vacancy_id: vacancyId,
  });

  if (error !== null || data === null) {
    return { status: "failure" };
  }

  const parsed = submitApplicationRpcResultSchema.safeParse(data);
  if (!parsed.success) {
    return { status: "failure" };
  }

  switch (parsed.data.result) {
    case "submitted":
      return {
        status: "submitted",
        applicationId: parsed.data.application_id,
      };
    case "already_applied":
      return {
        status: "already_applied",
        applicationId: parsed.data.application_id,
      };
    case "incomplete":
      redirect("/candidate/onboarding");
    case "unavailable":
      return { status: "unavailable" };
    default: {
      const _exhaustive: never = parsed.data;
      return _exhaustive;
    }
  }
}
