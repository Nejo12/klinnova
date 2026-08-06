"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { submitApplicationRpcResultSchema } from "@/lib/applications/submit-application-result";
import type { SubmitCandidateApplicationState } from "@/lib/applications/submit-action-state";
import { parseMissingRequirementCodes } from "@/lib/matching/missing-requirement-codes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const vacancyIdSchema = z.string().uuid();
const applicationIdSchema = z.string().uuid();

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Explicit candidate application submission.
 * Rechecks the Auth session, then relies entirely on `submit_candidate_application`
 * (PR 5.5c) for completion, availability, and eligibility — no TypeScript
 * matcher pre-check. The RPC evaluates eligibility transactionally with a
 * row lock, so this action's only job is to validate input, confirm a
 * session, call the RPC, and translate its result.
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

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError !== null || user === null) {
    redirect(`/login?next=${encodeURIComponent(detailPath)}`);
  }

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
    case "already_applied": {
      const applicationId = applicationIdSchema.safeParse(
        parsed.data.application_id,
      );
      if (!applicationId.success) {
        return { status: "failure" };
      }
      redirect(`/candidate/applications/${applicationId.data}`);
    }
    case "incomplete":
      redirect("/candidate/onboarding");
    case "unavailable":
      return { status: "unavailable" };
    case "ineligible": {
      const missingRequirements = parseMissingRequirementCodes(
        parsed.data.missing_requirements,
      );
      if (missingRequirements === null) {
        return { status: "failure" };
      }
      return { status: "ineligible", missingRequirements };
    }
    default: {
      const _exhaustive: never = parsed.data;
      return _exhaustive;
    }
  }
}
