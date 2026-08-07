import { withLocalPostgres } from "./local-application-proof";

/**
 * The employer vacancy create/edit UI has no field for `employment_types`
 * or `shift_requirements` — only vacancy metadata and language
 * requirements (an intentional PR 6.2 scope boundary; this PR adds no
 * vacancy-editing UI). The candidate eligibility contract (D-070) requires
 * a non-empty intersection of both arrays, so this fixture step sets them
 * directly — the same approved localhost-only escape hatch
 * `provisionLocalVerificationOperator` uses for a comparable UI gap.
 */
export async function seedVacancyMatchingArrays(
  vacancyId: string,
  employmentTypes: readonly string[],
  shiftRequirements: readonly string[],
): Promise<void> {
  await withLocalPostgres(async (client) => {
    await client.query(
      `update public.vacancies
       set employment_types = $2::text[], shift_requirements = $3::text[]
       where id = $1`,
      [vacancyId, employmentTypes, shiftRequirements],
    );
  });
}

/**
 * There is no UI or RPC path to revoke an employer's own verification —
 * `revoke_employer_verification` is operator-only and this repo has no
 * operator-facing revoke UI. This uses the exact same session-config
 * escape hatch the RPC itself uses
 * (`supabase/tests/database/28_application_status_and_review_contract_test.sql`),
 * applied at session scope since this raw client issues two separate
 * statements rather than one RPC call's single transaction.
 */
export async function revokeLocalEmployerVerification(
  employerProfileId: string,
): Promise<void> {
  await withLocalPostgres(async (client) => {
    await client.query(
      `select set_config('stint.allow_verification_write', '1', false)`,
    );
    await client.query(
      `update public.employer_profiles
       set verification_state = 'revoked',
           verification_reviewed_at = now(),
           verification_review_reason = 'E2E fixture revoke'
       where id = $1`,
      [employerProfileId],
    );
  });
}
