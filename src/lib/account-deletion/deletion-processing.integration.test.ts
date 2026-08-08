/**
 * Local Auth + database end-to-end proof for whole-account deletion
 * processing (D-078/D-079/D-080/D-081/D-082/D-085/D-086/D-090).
 *
 * Requires a running local Supabase stack (default
 * http://127.0.0.1:54321 / postgresql://postgres:postgres@127.0.0.1:54322/postgres).
 * Skipped unless STINT_DB_INTEGRATION=1 (mirrors
 * src/lib/onboarding/completion-lock.integration.test.ts). Refuses to run
 * against anything that does not look like the local Supabase API
 * (assertLocalSupabaseApiUrl) — this test performs a real Auth Admin
 * soft-delete and must never be pointed at a hosted project.
 *
 * The first test is the PR 8.4 local Auth Admin verification D-080
 * requires, plus the D-085 dual-capability one-request proof and the
 * D-084 stale-JWT proof, all in one fixture: a single disposable Auth
 * identity holding both candidate_profiles and employer_profiles, with a
 * real cross-party application in each direction, processed through the
 * actual `processAccountDeletionRequest` application code (not a mock of
 * Auth Admin behavior). The second test is the D-090 stranded-processing
 * recovery proof: a request is claimed directly (simulating a process that
 * then crashes before any further step), its lease is backdated via a
 * direct local test-DB connection (test setup only — production code never
 * writes to deletion_requests directly), and `reconcileAccountDeletionRequest`
 * is proven to recover it end to end via the real Auth Admin API.
 */
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { assertLocalSupabaseApiUrl } from "@/lib/proof/local-environment-guard";

const runIntegration = process.env.STINT_DB_INTEGRATION === "1";
const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const databaseUrl =
  process.env.STINT_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const apiGuard = assertLocalSupabaseApiUrl(apiUrl);
const canRun = runIntegration && apiGuard.ok;

describe.skipIf(!canRun)(
  "account deletion processing: local Auth Admin + dual-capability integration proof",
  () => {
    if (!apiGuard.ok && runIntegration) {
      throw new Error(apiGuard.error);
    }

    process.env.NEXT_PUBLIC_SUPABASE_URL = apiUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

    const userAId = randomUUID();
    const userBId = randomUUID();
    const userCId = randomUUID();
    const userDId = randomUUID();
    const vacancyAId = randomUUID();
    const vacancyCId = randomUUID();
    const companyAId = randomUUID();
    const companyCId = randomUUID();
    const applicationByBId = randomUUID();
    const applicationByAId = randomUUID();

    const userAEmail = `deletion-a-${userAId}@example.test`;
    const userBEmail = `deletion-b-${userBId}@example.test`;
    const userCEmail = `deletion-c-${userCId}@example.test`;
    const userDEmail = `deletion-d-${userDId}@example.test`;
    const password = "DeletionProof1234!";

    let db: Client;
    let admin: ReturnType<typeof createClient>;
    let userAAccessToken: string;

    beforeAll(async () => {
      db = new Client({ connectionString: databaseUrl });
      await db.connect();

      admin = createClient(
        apiUrl,
        process.env.SUPABASE_SERVICE_ROLE_KEY as string,
        {
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );

      for (const [id, email] of [
        [userAId, userAEmail],
        [userBId, userBEmail],
        [userCId, userCEmail],
        [userDId, userDEmail],
      ] as const) {
        const created = await admin.auth.admin.createUser({
          id,
          email,
          password,
          email_confirm: true,
        });
        if (created.error !== null) {
          throw new Error(
            `fixture user creation failed: ${created.error.message}`,
          );
        }
      }

      // Candidate capability for userA and userB.
      await db.query(
        `insert into public.candidate_profiles (id, display_name, german_comfort, city, job_categories, employment_types, shift_preferences, onboarding_completed_at)
         values ($1, 'User A Candidate', 'basic', 'Berlin', array['cleaning'], array['full_time'], array['daytime'], now()),
                ($2, 'User B Candidate', 'basic', 'Berlin', array['cleaning'], array['full_time'], array['daytime'], now())`,
        [userAId, userBId],
      );

      await db.query(
        `insert into public.candidate_languages (candidate_id, language_code, proficiency)
         values ($1, 'de', 'native')`,
        [userAId],
      );

      // D-090 stranded-processing recovery test subject: single-capability
      // candidate only — this fixture's focus is proving reclaim recovery,
      // not re-proving the full dual-capability domain-scrub matrix already
      // covered above by userA.
      await db.query(
        `insert into public.candidate_profiles (id, display_name, german_comfort, city, onboarding_completed_at)
         values ($1, 'User D Candidate', 'basic', 'Berlin', now())`,
        [userDId],
      );

      // Employer capability for userA (organisation, owns a published
      // vacancy) and userC (organisation, owns a published vacancy that
      // userA's candidate applies to).
      await db.query(
        `insert into public.employer_profiles (id, employer_type, display_name, organisation_legal_name, onboarding_completed_at)
         values ($1, 'organisation', 'User A Employer', 'User A GmbH', now()),
                ($2, 'organisation', 'User C Employer', 'User C GmbH', now())`,
        [userAId, userCId],
      );

      await db.query(
        `insert into public.companies (id, name, slug, source, owner_employer_id)
         values ($1, 'Company A', $2, 'employer', $3),
                ($4, 'Company C', $5, 'employer', $6)`,
        [
          companyAId,
          `company-a-${companyAId}`,
          userAId,
          companyCId,
          `company-c-${companyCId}`,
          userCId,
        ],
      );

      await db.query(
        `insert into public.vacancies (
           id, company_id, employer_profile_id, title, slug, summary, city,
           job_category, employment_types, shift_requirements, german_requirement,
           publication_state, source, published_at, expires_at
         ) values
         ($1, $2, $3, 'Cleaner', $4, 'Cleaning role', 'Berlin', 'cleaning', array['full_time'], array['daytime'], 'basic', 'published', 'employer', now(), now() + interval '30 days'),
         ($5, $6, $7, 'Mover', $8, 'Moving role', 'Berlin', 'moving', array['full_time'], array['daytime'], 'basic', 'published', 'employer', now(), now() + interval '30 days')`,
        [
          vacancyAId,
          companyAId,
          userAId,
          `cleaner-${vacancyAId}`,
          vacancyCId,
          companyCId,
          userCId,
          `mover-${vacancyCId}`,
        ],
      );

      // Cross-party applications: userB applies to userA's vacancy (proves
      // employer-side preservation after userA's employer deletion);
      // userA's candidate applies to userC's vacancy (proves candidate-side
      // tombstoning after userA's candidate deletion).
      await db.query(
        `insert into public.applications (id, candidate_id, vacancy_id, status, candidate_snapshot, vacancy_snapshot, snapshot_version)
         values ($1, $2, $3, 'submitted', '{"display_name":"User B Candidate"}'::jsonb, '{"title":"Cleaner"}'::jsonb, 1),
                ($4, $5, $6, 'submitted', '{"display_name":"User A Candidate"}'::jsonb, '{"title":"Mover"}'::jsonb, 1)`,
        [
          applicationByBId,
          userBId,
          vacancyAId,
          applicationByAId,
          userAId,
          vacancyCId,
        ],
      );

      // Moderation/audit fixtures on userA's employer side (D-082/D-086).
      await db.query(
        `insert into public.vacancy_moderation (vacancy_id, moderated_by, moderated_reason)
         values ($1, $2, 'inappropriate listing content')`,
        [vacancyAId, userCId],
      );
      await db.query(
        `insert into public.employer_suspension (employer_profile_id, suspended_by, suspended_reason)
         values ($1, $2, 'pending review')`,
        [userAId, userCId],
      );
      await db.query(
        `insert into public.admin_audit_events (event_type, target_kind, target_id, actor_user_id, reason)
         values ('vacancy_moderated', 'vacancy', $1, $2, 'flagged listing text'),
                ('employer_suspended', 'employer', $3, $4, 'flagged account text')`,
        [vacancyAId, userCId, userAId, userCId],
      );

      const preDeleteSignIn = await admin.auth.signInWithPassword({
        email: userAEmail,
        password,
      });
      if (preDeleteSignIn.error || preDeleteSignIn.data.session === null) {
        throw new Error("pre-delete sign-in for userA failed");
      }
      userAAccessToken = preDeleteSignIn.data.session.access_token;
    }, 60_000);

    afterAll(async () => {
      if (db === undefined) {
        return;
      }
      // Explicit dependency-order cleanup: vacancies/companies use
      // ON DELETE RESTRICT/NO ACTION back to employer_profiles, so a plain
      // `delete from auth.users` cascade would fail (and, if swallowed,
      // silently leave fixture rows behind) unless those are removed
      // first.
      await db.query(`delete from public.applications where id in ($1, $2)`, [
        applicationByAId,
        applicationByBId,
      ]);
      await db.query(
        `delete from public.vacancy_moderation where vacancy_id = $1`,
        [vacancyAId],
      );
      await db.query(
        `delete from public.employer_suspension where employer_profile_id = $1`,
        [userAId],
      );
      await db.query(
        `delete from public.admin_audit_events where target_id in ($1, $2)`,
        [userAId, vacancyAId],
      );
      await db.query(
        `delete from public.vacancy_lifecycle_events where vacancy_id in ($1, $2)`,
        [vacancyAId, vacancyCId],
      );
      await db.query(`delete from public.vacancies where id in ($1, $2)`, [
        vacancyAId,
        vacancyCId,
      ]);
      await db.query(`delete from public.companies where id in ($1, $2)`, [
        companyAId,
        companyCId,
      ]);
      await db.query(
        `delete from public.deletion_requests where user_id in ($1, $2)`,
        [userAId, userDId],
      );
      await db.query(`delete from auth.users where id in ($1, $2, $3, $4)`, [
        userAId,
        userBId,
        userCId,
        userDId,
      ]);
      await db.end();
    });

    it("processes a single dual-capability deletion request end to end via the real Auth Admin API", async () => {
      const userClient = createClient(
        apiUrl,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${userAAccessToken}` } },
        },
      );

      const requested = await userClient.rpc("request_account_deletion");
      expect(requested.error).toBeNull();
      const requestedBody = requested.data as {
        status: string;
        request_id?: string;
      };
      expect(requestedBody.status).toBe("created");
      const requestId = requestedBody.request_id as string;

      // Exact preservation baseline (not approximate): every field on the
      // to-be-tombstoned application except candidate_snapshot must be
      // byte/value-identical after deletion processing — this proves the
      // privileged orchestration introduces no side effect beyond the
      // already-pgTAP-proven anonymizer itself.
      const beforeApplication = await db.query(
        `select created_at, updated_at, submitted_at, status, vacancy_snapshot
         from public.applications where id = $1`,
        [applicationByAId],
      );
      const applicationBefore = beforeApplication.rows[0] as {
        created_at: Date;
        updated_at: Date;
        submitted_at: Date;
        status: string;
        vacancy_snapshot: unknown;
      };

      const { processAccountDeletionRequest } =
        await import("@/lib/account-deletion/processor");
      const result = await processAccountDeletionRequest(requestId);
      expect(result).toEqual({ kind: "completed" });

      // --- Candidate domain tombstone (D-078) ---
      const candidateRow = await db.query(
        `select account_deleted_at, display_name, german_comfort, city, job_categories
         from public.candidate_profiles where id = $1`,
        [userAId],
      );
      expect(candidateRow.rows[0].account_deleted_at).not.toBeNull();
      expect(candidateRow.rows[0].display_name).toBe("Deleted candidate");
      expect(candidateRow.rows[0].german_comfort).toBeNull();
      expect(candidateRow.rows[0].city).toBeNull();
      expect(candidateRow.rows[0].job_categories).toEqual([]);

      const languageRows = await db.query(
        `select count(*)::int as n from public.candidate_languages where candidate_id = $1`,
        [userAId],
      );
      expect(languageRows.rows[0].n).toBe(0);

      const ownApplication = await db.query(
        `select created_at, updated_at, submitted_at, status, candidate_snapshot, vacancy_snapshot
         from public.applications where id = $1`,
        [applicationByAId],
      );
      const applicationAfter = ownApplication.rows[0] as {
        created_at: Date;
        updated_at: Date;
        submitted_at: Date;
        status: string;
        candidate_snapshot: unknown;
        vacancy_snapshot: unknown;
      };

      // Finding 3: exact (not approximate) preservation. Only
      // candidate_snapshot may change; every other field must be the exact
      // DB-returned value from before deletion processing ran.
      expect(applicationAfter.created_at.getTime()).toBe(
        applicationBefore.created_at.getTime(),
      );
      expect(applicationAfter.updated_at.getTime()).toBe(
        applicationBefore.updated_at.getTime(),
      );
      expect(applicationAfter.submitted_at.getTime()).toBe(
        applicationBefore.submitted_at.getTime(),
      );
      expect(applicationAfter.status).toBe(applicationBefore.status);
      expect(applicationAfter.vacancy_snapshot).toEqual(
        applicationBefore.vacancy_snapshot,
      );

      expect(applicationAfter.candidate_snapshot).toEqual({ deleted: true });
      expect(applicationAfter.vacancy_snapshot).toEqual({ title: "Mover" });
      expect(applicationAfter.status).toBe("submitted");

      // --- Employer domain tombstone (D-079/D-082/D-086) ---
      const employerRow = await db.query(
        `select account_deleted_at, display_name, organisation_legal_name
         from public.employer_profiles where id = $1`,
        [userAId],
      );
      expect(employerRow.rows[0].account_deleted_at).not.toBeNull();
      expect(employerRow.rows[0].display_name).toBe("Deleted employer");
      expect(employerRow.rows[0].organisation_legal_name).toBeNull();

      const companyRow = await db.query(
        `select name, slug from public.companies where id = $1`,
        [companyAId],
      );
      expect(companyRow.rows[0].name).toBe("Deleted company");
      expect(companyRow.rows[0].slug).toBe(`deleted-company-${companyAId}`);

      const vacancyRow = await db.query(
        `select publication_state, withdrawn_at from public.vacancies where id = $1`,
        [vacancyAId],
      );
      expect(vacancyRow.rows[0].publication_state).toBe("withdrawn");
      expect(vacancyRow.rows[0].withdrawn_at).not.toBeNull();

      const moderationRow = await db.query(
        `select count(*)::int as n from public.vacancy_moderation where vacancy_id = $1`,
        [vacancyAId],
      );
      expect(moderationRow.rows[0].n).toBe(0);

      const suspensionRow = await db.query(
        `select count(*)::int as n from public.employer_suspension where employer_profile_id = $1`,
        [userAId],
      );
      expect(suspensionRow.rows[0].n).toBe(0);

      const auditRows = await db.query(
        `select event_type, reason from public.admin_audit_events
         where (target_kind = 'employer' and target_id = $1)
            or (target_kind = 'vacancy' and target_id = $2)
         order by event_type`,
        [userAId, vacancyAId],
      );
      expect(auditRows.rows).toHaveLength(2);
      for (const row of auditRows.rows) {
        expect(row.reason).toBe("[redacted after account deletion]");
      }

      // --- Cross-party application untouched by userA's own deletion ---
      const otherApplication = await db.query(
        `select candidate_snapshot from public.applications where id = $1`,
        [applicationByBId],
      );
      expect(otherApplication.rows[0].candidate_snapshot).toEqual({
        display_name: "User B Candidate",
      });

      // --- Auth soft-delete verified via getUserById (D-080) ---
      const verifiedUser = await admin.auth.admin.getUserById(userAId);
      expect(verifiedUser.error).toBeNull();
      expect(verifiedUser.data.user?.deleted_at).not.toBeNull();

      // --- Fresh login fails generically post soft-delete ---
      const freshLogin = await admin.auth.signInWithPassword({
        email: userAEmail,
        password,
      });
      expect(freshLogin.error).not.toBeNull();

      // --- Stale pre-delete JWT denied by the database gate, not the token itself ---
      const staleClient = createClient(
        apiUrl,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${userAAccessToken}` } },
        },
      );

      const staleRead = await staleClient
        .from("candidate_profiles")
        .select("id")
        .eq("id", userAId);
      expect(staleRead.error).toBeNull();
      expect(staleRead.data).toEqual([]);

      const staleMutate = await staleClient
        .from("candidate_profiles")
        .update({ display_name: "hacked" })
        .eq("id", userAId)
        .select();
      expect(staleMutate.error).toBeNull();
      expect(staleMutate.data).toEqual([]);

      const postMutateCheck = await db.query(
        `select display_name from public.candidate_profiles where id = $1`,
        [userAId],
      );
      expect(postMutateCheck.rows[0].display_name).toBe("Deleted candidate");

      // --- Finding 2: stale pre-delete JWT denied on the employer
      // capability too, not only candidate (D-084's stale-JWT requirement
      // applies per-capability; a dual-capability identity must be denied
      // on both). Canonical own-employer-profile read/update, mirroring
      // the candidate proof above exactly. ---
      const staleEmployerRead = await staleClient
        .from("employer_profiles")
        .select("id")
        .eq("id", userAId);
      expect(staleEmployerRead.error).toBeNull();
      expect(staleEmployerRead.data).toEqual([]);

      const staleEmployerMutate = await staleClient
        .from("employer_profiles")
        .update({ display_name: "hacked-employer" })
        .eq("id", userAId)
        .select();
      expect(staleEmployerMutate.error).toBeNull();
      expect(staleEmployerMutate.data).toEqual([]);

      const postEmployerMutateCheck = await db.query(
        `select display_name from public.employer_profiles where id = $1`,
        [userAId],
      );
      expect(postEmployerMutateCheck.rows[0].display_name).toBe(
        "Deleted employer",
      );

      // --- Unrelated control account remains functional ---
      const controlSignIn = await admin.auth.signInWithPassword({
        email: userBEmail,
        password,
      });
      expect(controlSignIn.error).toBeNull();
      const controlToken = controlSignIn.data.session?.access_token as string;
      const controlClient = createClient(
        apiUrl,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${controlToken}` } },
        },
      );
      const controlRead = await controlClient
        .from("candidate_profiles")
        .select("display_name")
        .eq("id", userBId)
        .maybeSingle();
      expect(controlRead.error).toBeNull();
      expect(controlRead.data?.display_name).toBe("User B Candidate");
    }, 60_000);

    it("D-090: reconciliation recovers a request stranded at processing by a simulated crash between claim and any subsequent step", async () => {
      const userDClient = createClient(
        apiUrl,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
        {
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
      const userDSignIn = await userDClient.auth.signInWithPassword({
        email: userDEmail,
        password,
      });
      expect(userDSignIn.error).toBeNull();
      const userDAccessToken = userDSignIn.data.session?.access_token as string;

      const userDAuthedClient = createClient(
        apiUrl,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            headers: { Authorization: `Bearer ${userDAccessToken}` },
          },
        },
      );

      // 1. Create the request as userD.
      const requested = await userDAuthedClient.rpc("request_account_deletion");
      expect(requested.error).toBeNull();
      const requestId = (requested.data as { request_id: string }).request_id;

      // 2-3. Simulate a process claiming it and then crashing: call the
      // claim RPC directly (not through processAccountDeletionRequest) and
      // do nothing else — no scrub, no failure recording.
      const claimResult = await db.query(
        `select public._claim_deletion_request($1) as result`,
        [requestId],
      );
      expect(
        (claimResult.rows[0] as { result: { status: string } }).result.status,
      ).toBe("claimed");

      const strandedState = await db.query(
        `select status, domain_scrubbed_at, auth_deleted_at, processing_lease_started_at
         from public.deletion_requests where id = $1`,
        [requestId],
      );
      expect(strandedState.rows[0].status).toBe("processing");
      expect(strandedState.rows[0].domain_scrubbed_at).toBeNull();
      expect(strandedState.rows[0].auth_deleted_at).toBeNull();
      expect(strandedState.rows[0].processing_lease_started_at).not.toBeNull();

      // 4. Make the lease stale via direct local test DB setup — test
      // setup only; the production processor never writes to
      // deletion_requests directly.
      await db.query(
        `update public.deletion_requests
         set processing_lease_started_at = clock_timestamp() - interval '10 minutes'
         where id = $1`,
        [requestId],
      );

      // 5. Call the real, imported reconciliation function.
      const { reconcileAccountDeletionRequest } =
        await import("@/lib/account-deletion/processor");
      const result = await reconcileAccountDeletionRequest(requestId);

      // 6-7. Reconciliation reclaimed it and used the same persisted target.
      expect(result).toEqual({ kind: "completed" });

      // 8. Domain scrub completed.
      const candidateRow = await db.query(
        `select account_deleted_at, display_name from public.candidate_profiles where id = $1`,
        [userDId],
      );
      expect(candidateRow.rows[0].account_deleted_at).not.toBeNull();
      expect(candidateRow.rows[0].display_name).toBe("Deleted candidate");

      // 9-10. Auth soft-delete completed and independently observed via
      // getUserById.
      const verifiedUser = await admin.auth.admin.getUserById(userDId);
      expect(verifiedUser.error).toBeNull();
      expect(verifiedUser.data.user?.deleted_at).not.toBeNull();

      // 11. Evidence/completion recorded.
      const finalRequestState = await db.query(
        `select status, domain_scrubbed_at, auth_deleted_at, completed_at
         from public.deletion_requests where id = $1`,
        [requestId],
      );
      expect(finalRequestState.rows[0].status).toBe("completed");
      expect(finalRequestState.rows[0].domain_scrubbed_at).not.toBeNull();
      expect(finalRequestState.rows[0].auth_deleted_at).not.toBeNull();
      expect(finalRequestState.rows[0].completed_at).not.toBeNull();

      // 12. Stale pre-delete JWT denied.
      const staleDRead = await userDAuthedClient
        .from("candidate_profiles")
        .select("id")
        .eq("id", userDId);
      expect(staleDRead.error).toBeNull();
      expect(staleDRead.data).toEqual([]);

      // 13. Fresh login fails.
      const freshLoginD = await admin.auth.signInWithPassword({
        email: userDEmail,
        password,
      });
      expect(freshLoginD.error).not.toBeNull();

      // 14. Unrelated control user (userB) still works.
      const controlSignInD = await admin.auth.signInWithPassword({
        email: userBEmail,
        password,
      });
      expect(controlSignInD.error).toBeNull();
    }, 60_000);
  },
);
