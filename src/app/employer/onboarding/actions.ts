"use server";

import { redirect } from "next/navigation";

import {
  mapBootstrapStatus,
  mapEmployerWriteError,
} from "@/lib/employer/errors";
import { ensureEmployerProfile } from "@/lib/employer/ensure-employer-profile";
import {
  EMPLOYER_COMPLETION_INCOMPLETE,
  EMPLOYER_GENERIC_FAILURE,
  EMPLOYER_UNAUTHENTICATED,
} from "@/lib/employer/messages";
import {
  bootstrapOrganisationResultSchema,
  completeEmployerOnboardingResultSchema,
  organisationEmployerProfileSchema,
  privateEmployerProfileSchema,
  selectEmployerTypeSchema,
} from "@/lib/employer/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type EmployerOnboardingActionState = {
  error: string | null;
  message: string | null;
  fieldErrors?: Record<string, string>;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fieldErrorsFromZod(
  issues: readonly { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && fieldErrors[key] === undefined) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

async function requireUserId(): Promise<
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
      userId: string;
    }
  | { ok: false; state: EmployerOnboardingActionState }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    return {
      ok: false,
      state: { error: EMPLOYER_UNAUTHENTICATED, message: null },
    };
  }

  return { ok: true, supabase, userId: user.id };
}

export async function selectEmployerTypeAction(
  _prev: EmployerOnboardingActionState,
  formData: FormData,
): Promise<EmployerOnboardingActionState> {
  const parsed = selectEmployerTypeSchema.safeParse({
    employerType: formString(formData, "employerType"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? EMPLOYER_GENERIC_FAILURE,
      message: null,
    };
  }

  const auth = await requireUserId();
  if (!auth.ok) {
    return auth.state;
  }

  const ensured = await ensureEmployerProfile(
    auth.supabase,
    parsed.data.employerType,
  );

  if (!ensured.ok) {
    return { error: ensured.error, message: null };
  }

  redirect("/employer/onboarding");
}

export async function savePrivateEmployerAction(
  _prev: EmployerOnboardingActionState,
  formData: FormData,
): Promise<EmployerOnboardingActionState> {
  const parsed = privateEmployerProfileSchema.safeParse({
    displayName: formString(formData, "displayName"),
    berlinLocality: formString(formData, "berlinLocality"),
    phone: formString(formData, "phone"),
    website: formString(formData, "website"),
    lawfulHiringDeclared:
      formString(formData, "lawfulHiringDeclared") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? EMPLOYER_GENERIC_FAILURE,
      message: null,
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const auth = await requireUserId();
  if (!auth.ok) {
    return auth.state;
  }

  const { error } = await auth.supabase
    .from("employer_profiles")
    .update({
      display_name: parsed.data.displayName,
      berlin_locality: parsed.data.berlinLocality,
      phone: parsed.data.phone,
      website: parsed.data.website,
      organisation_legal_name: null,
      lawful_hiring_declared: parsed.data.lawfulHiringDeclared,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.userId)
    .eq("employer_type", "private");

  if (error) {
    return { error: mapEmployerWriteError(error), message: null };
  }

  return {
    error: null,
    message: "Your employer details were saved.",
  };
}

export async function saveOrganisationEmployerAction(
  _prev: EmployerOnboardingActionState,
  formData: FormData,
): Promise<EmployerOnboardingActionState> {
  const parsed = organisationEmployerProfileSchema.safeParse({
    displayName: formString(formData, "displayName"),
    organisationLegalName: formString(formData, "organisationLegalName"),
    berlinLocality: formString(formData, "berlinLocality"),
    companyName: formString(formData, "companyName"),
    companySlug: formString(formData, "companySlug"),
    phone: formString(formData, "phone"),
    website: formString(formData, "website"),
    lawfulHiringDeclared:
      formString(formData, "lawfulHiringDeclared") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? EMPLOYER_GENERIC_FAILURE,
      message: null,
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const auth = await requireUserId();
  if (!auth.ok) {
    return auth.state;
  }

  const bootstrapError = await runOrganisationBootstrap(
    auth.supabase,
    parsed.data,
  );
  if (bootstrapError !== null) {
    return { error: bootstrapError, message: null };
  }

  if (parsed.data.lawfulHiringDeclared) {
    const declarationError = await setLawfulHiringDeclared(
      auth.supabase,
      auth.userId,
      true,
    );
    if (declarationError !== null) {
      return { error: declarationError, message: null };
    }
  }

  return {
    error: null,
    message: "Your organisation details were saved.",
  };
}

export async function completeEmployerOnboardingAction(
  _prev: EmployerOnboardingActionState,
  formData: FormData,
): Promise<EmployerOnboardingActionState> {
  const auth = await requireUserId();
  if (!auth.ok) {
    return auth.state;
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from("employer_profiles")
    .select("employer_type")
    .eq("id", auth.userId)
    .maybeSingle();

  if (profileError || profile === null) {
    return {
      error: "Choose an employer type to start onboarding.",
      message: null,
    };
  }

  if (formString(formData, "lawfulHiringDeclared") !== "yes") {
    return {
      error: "Confirm the lawful-hiring declaration to complete onboarding.",
      message: null,
      fieldErrors: {
        lawfulHiringDeclared:
          "Confirm the lawful-hiring declaration to complete onboarding.",
      },
    };
  }

  if (profile.employer_type === "private") {
    const parsed = privateEmployerProfileSchema.safeParse({
      displayName: formString(formData, "displayName"),
      berlinLocality: formString(formData, "berlinLocality"),
      phone: formString(formData, "phone"),
      website: formString(formData, "website"),
      lawfulHiringDeclared: "yes",
    });

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? EMPLOYER_GENERIC_FAILURE,
        message: null,
        fieldErrors: fieldErrorsFromZod(parsed.error.issues),
      };
    }

    const { error } = await auth.supabase
      .from("employer_profiles")
      .update({
        display_name: parsed.data.displayName,
        berlin_locality: parsed.data.berlinLocality,
        phone: parsed.data.phone,
        website: parsed.data.website,
        organisation_legal_name: null,
        lawful_hiring_declared: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.userId)
      .eq("employer_type", "private");

    if (error) {
      return { error: mapEmployerWriteError(error), message: null };
    }
  } else {
    const parsed = organisationEmployerProfileSchema.safeParse({
      displayName: formString(formData, "displayName"),
      organisationLegalName: formString(formData, "organisationLegalName"),
      berlinLocality: formString(formData, "berlinLocality"),
      companyName: formString(formData, "companyName"),
      companySlug: formString(formData, "companySlug"),
      phone: formString(formData, "phone"),
      website: formString(formData, "website"),
      lawfulHiringDeclared: "yes",
    });

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? EMPLOYER_GENERIC_FAILURE,
        message: null,
        fieldErrors: fieldErrorsFromZod(parsed.error.issues),
      };
    }

    const bootstrapError = await runOrganisationBootstrap(
      auth.supabase,
      parsed.data,
    );
    if (bootstrapError !== null) {
      return { error: bootstrapError, message: null };
    }

    const declarationError = await setLawfulHiringDeclared(
      auth.supabase,
      auth.userId,
      true,
    );
    if (declarationError !== null) {
      return { error: declarationError, message: null };
    }
  }

  const { data, error } = await auth.supabase.rpc(
    "complete_employer_onboarding",
  );

  if (error) {
    return { error: mapEmployerWriteError(error), message: null };
  }

  const parsed = completeEmployerOnboardingResultSchema.safeParse(data);
  if (!parsed.success) {
    return { error: EMPLOYER_GENERIC_FAILURE, message: null };
  }

  switch (parsed.data.status) {
    case "unauthenticated":
      return { error: EMPLOYER_UNAUTHENTICATED, message: null };
    case "missing_profile":
      return {
        error: "Choose an employer type to start onboarding.",
        message: null,
      };
    case "incomplete":
      return { error: EMPLOYER_COMPLETION_INCOMPLETE, message: null };
    case "completed":
      redirect("/employer");
    default:
      return { error: EMPLOYER_GENERIC_FAILURE, message: null };
  }
}

async function setLawfulHiringDeclared(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  value: boolean,
): Promise<string | null> {
  const { error } = await supabase
    .from("employer_profiles")
    .update({
      lawful_hiring_declared: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return error === null ? null : mapEmployerWriteError(error);
}

async function runOrganisationBootstrap(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  input: {
    displayName: string;
    organisationLegalName: string;
    berlinLocality: string;
    companyName: string;
    companySlug: string;
    phone: string | null;
    website: string | null;
  },
): Promise<string | null> {
  const { data, error } = await supabase.rpc(
    "bootstrap_organisation_employer",
    {
      p_display_name: input.displayName,
      p_organisation_legal_name: input.organisationLegalName,
      p_berlin_locality: input.berlinLocality,
      p_company_name: input.companyName,
      p_company_slug: input.companySlug,
      p_website: input.website ?? undefined,
      p_phone: input.phone ?? undefined,
    },
  );

  if (error) {
    return mapEmployerWriteError(error);
  }

  const bootstrap = bootstrapOrganisationResultSchema.safeParse(data);
  if (!bootstrap.success) {
    return EMPLOYER_GENERIC_FAILURE;
  }

  if (bootstrap.data.status !== "ok") {
    return mapBootstrapStatus(bootstrap.data.status);
  }

  return null;
}
