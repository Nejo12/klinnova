"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { notifyEmployerOfNewApplication } from "@/lib/applications/notify-employer-new-application";
import { APPLICATION_INTRODUCTION_MAX_LENGTH } from "@/lib/applications/application-introduction";
import { submitApplicationRpcResultSchema } from "@/lib/applications/submit-application-result";
import type { SubmitCandidateApplicationState } from "@/lib/applications/submit-action-state";
import { parseMissingRequirementCodes } from "@/lib/matching/missing-requirement-codes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const vacancyIdSchema = z.string().uuid();
const applicationIdSchema = z.string().uuid();
const introductionTextSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length <= APPLICATION_INTRODUCTION_MAX_LENGTH);

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
  const introductionTextRaw = formString(formData, "introductionText");
  const parsedId = vacancyIdSchema.safeParse(vacancyIdRaw);
  const parsedIntroduction =
    introductionTextSchema.safeParse(introductionTextRaw);
  if (!parsedId.success || !parsedIntroduction.success) {
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
    p_introduction_text: parsedIntroduction.data,
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
      // Only a genuinely new row ("submitted") should notify the employer —
      // "already_applied" means no new application was persisted, and must
      // never generate a false new-application email. Awaited (not
      // fire-and-forget) so the attempt actually runs within this request;
      // never allowed to turn a persisted application into a failure.
      if (parsed.data.result === "submitted") {
        try {
          await notifyEmployerOfNewApplication({
            applicationId: applicationId.data,
            vacancyId,
          });
        } catch (error) {
          console.error(
            "[applications] employer notification threw unexpectedly",
            { applicationId: applicationId.data, error: String(error) },
          );
        }
      }
      redirect(`/candidate/applications/${applicationId.data}`);
    }
    case "incomplete":
      redirect("/candidate/onboarding");
    case "unavailable":
      return { status: "unavailable" };
    case "validation_error":
      return { status: "validation_error" };
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
