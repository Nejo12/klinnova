import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EmployerType } from "@/lib/employer/schemas";
import type { Database } from "@/types/database";

export type EmployerCompanySummary = {
  id: string;
  name: string;
  slug: string;
};

export type EmployerProfileData = {
  id: string;
  employerType: EmployerType;
  displayName: string | null;
  berlinLocality: string | null;
  phone: string | null;
  website: string | null;
  organisationLegalName: string | null;
  lawfulHiringDeclared: boolean | null;
  verificationState: string;
  verificationRequestedAt: string | null;
  verificationReviewedAt: string | null;
  verificationReviewReason: string | null;
  onboardingCompletedAt: string | null;
  company: EmployerCompanySummary | null;
  typeLocked: boolean;
};

export type LoadEmployerResult =
  | { ok: true; data: EmployerProfileData | null; userId: string }
  | {
      ok: false;
      reason: "unauthenticated" | "failed";
      error: string;
    };

type EmployerClient = SupabaseClient<Database>;
const employerProfileCacheKey: unique symbol = Symbol(
  "klinnova.employerProfileRequestCache",
);

type EmployerClientWithProfileCache = EmployerClient & {
  [employerProfileCacheKey]?: Promise<LoadEmployerResult>;
};

/**
 * Load the session user's employer profile and owned company when present.
 */
export async function loadEmployerProfile(
  supabase: EmployerClient,
): Promise<LoadEmployerResult> {
  const client = supabase as EmployerClientWithProfileCache;
  client[employerProfileCacheKey] ??= loadEmployerProfileUncached(supabase);
  return client[employerProfileCacheKey];
}

async function loadEmployerProfileUncached(
  supabase: EmployerClient,
): Promise<LoadEmployerResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return {
      ok: false,
      reason: "unauthenticated",
      error: "You must be signed in to continue.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("employer_profiles")
    .select(
      "id, employer_type, display_name, berlin_locality, phone, website, organisation_legal_name, lawful_hiring_declared, verification_state, verification_requested_at, verification_reviewed_at, verification_review_reason, onboarding_completed_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      reason: "failed",
      error: "Could not load your employer profile.",
    };
  }

  if (profile === null) {
    return { ok: true, data: null, userId: user.id };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("owner_employer_id", user.id)
    .eq("source", "employer")
    .maybeSingle();

  if (companyError) {
    return {
      ok: false,
      reason: "failed",
      error: "Could not load your organisation details.",
    };
  }

  const completed = profile.onboarding_completed_at !== null;
  const hasCompany = company !== null;

  return {
    ok: true,
    userId: user.id,
    data: {
      id: profile.id,
      employerType: profile.employer_type as EmployerType,
      displayName: profile.display_name,
      berlinLocality: profile.berlin_locality,
      phone: profile.phone,
      website: profile.website,
      organisationLegalName: profile.organisation_legal_name,
      lawfulHiringDeclared: profile.lawful_hiring_declared,
      verificationState: profile.verification_state,
      verificationRequestedAt: profile.verification_requested_at,
      verificationReviewedAt: profile.verification_reviewed_at,
      verificationReviewReason: profile.verification_review_reason,
      onboardingCompletedAt: profile.onboarding_completed_at,
      company:
        company === null
          ? null
          : {
              id: company.id,
              name: company.name,
              slug: company.slug,
            },
      typeLocked: completed || hasCompany,
    },
  };
}
