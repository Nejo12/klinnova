/**
 * Local Postgres concurrency proof for profile-row serialization.
 *
 * Requires a running local Supabase DB (default postgresql://postgres:postgres@127.0.0.1:54322/postgres).
 * Skipped unless STINT_DB_INTEGRATION=1 (CI Schema job / local proof).
 *
 * Approach: two `pg` clients. Connection A takes the same `FOR UPDATE` lock used by
 * `complete_candidate_onboarding()`. Connection B attempts an essential UPDATE and must
 * block until A commits. After A releases, B's invalidating update runs and the BEFORE
 * trigger clears completion in the same transaction — final state is consistent.
 */
import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const runIntegration = process.env.STINT_DB_INTEGRATION === "1";
const databaseUrl =
  process.env.STINT_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe.skipIf(!runIntegration)(
  "completion profile-row lock integration",
  () => {
    const candidateId = randomUUID();
    let setup: Client;

    beforeAll(async () => {
      setup = new Client({ connectionString: databaseUrl });
      await setup.connect();

      await setup.query(
        `
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000',
        $1,
        'authenticated',
        'authenticated',
        $2,
        crypt('password', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(),
        now(),
        '', '', '', ''
      )
      `,
        [candidateId, `lock-${candidateId}@example.test`],
      );

      await setup.query(
        `
      insert into public.candidate_profiles (id, display_name)
      values ($1, 'Lock Proof')
      `,
        [candidateId],
      );

      await setup.query(
        `
      update public.candidate_profiles
      set
        german_comfort = 'basic',
        work_authorisation_declared = true,
        city = 'Berlin',
        travel_radius_minutes = 30,
        available_from = (timezone('Europe/Berlin', now()))::date,
        job_categories = array['cleaning']::text[],
        employment_types = array['full_time']::text[],
        shift_preferences = array['daytime']::text[],
        updated_at = now()
      where id = $1
      `,
        [candidateId],
      );

      await setup.query(
        `
      insert into public.candidate_languages (candidate_id, language_code, proficiency)
      values ($1, 'de', 'native')
      `,
        [candidateId],
      );

      // Session-level JWT claims so auth.uid() resolves inside the DEFINER RPC.
      await setup.query(
        `select set_config('request.jwt.claim.sub', $1, false)`,
        [candidateId],
      );
      await setup.query(`select set_config('request.jwt.claims', $1, false)`, [
        JSON.stringify({
          sub: candidateId,
          role: "authenticated",
        }),
      ]);

      const complete = await setup.query(
        `select public.complete_candidate_onboarding() as result`,
      );
      expect(complete.rows[0]?.result).toMatchObject({ status: "completed" });
    }, 30_000);

    afterAll(async () => {
      if (setup !== undefined) {
        await setup.query(`delete from auth.users where id = $1`, [
          candidateId,
        ]);
        await setup.end();
      }
    });

    it("serializes completion lock against concurrent essential mutation", async () => {
      const locker = new Client({ connectionString: databaseUrl });
      const mutator = new Client({ connectionString: databaseUrl });
      await locker.connect();
      await mutator.connect();

      try {
        await locker.query("begin");
        // Same lock acquisition as complete_candidate_onboarding().
        await locker.query(
          `select id from public.candidate_profiles where id = $1 for update`,
          [candidateId],
        );

        let mutatorSettled = false;
        const mutatorPromise = mutator
          .query(
            `
          update public.candidate_profiles
          set job_categories = '{}'::text[], updated_at = now()
          where id = $1
          `,
            [candidateId],
          )
          .then((result) => {
            mutatorSettled = true;
            return result;
          });

        await new Promise((resolve) => {
          setTimeout(resolve, 250);
        });
        expect(mutatorSettled).toBe(false);

        const incomplete = await locker.query(
          `select public._candidate_first_incomplete_group($1::uuid) as g`,
          [candidateId],
        );
        expect(incomplete.rows[0]?.g).toBeNull();

        await locker.query(
          `
        update public.candidate_profiles
        set
          onboarding_completed_at = coalesce(onboarding_completed_at, now()),
          updated_at = now()
        where id = $1
        `,
          [candidateId],
        );
        await locker.query("commit");

        await mutatorPromise;
        expect(mutatorSettled).toBe(true);

        const finalState = await setup.query(
          `
        select
          onboarding_completed_at,
          work_authorisation_declared,
          work_authorisation_declared_at,
          job_categories
        from public.candidate_profiles
        where id = $1
        `,
          [candidateId],
        );

        const row = finalState.rows[0] as {
          onboarding_completed_at: Date | null;
          work_authorisation_declared: boolean;
          work_authorisation_declared_at: Date | null;
          job_categories: string[];
        };
        expect(row.job_categories).toEqual([]);
        expect(row.onboarding_completed_at).toBeNull();
        expect(row.work_authorisation_declared).toBe(true);
        expect(row.work_authorisation_declared_at).not.toBeNull();
      } finally {
        await locker.query("rollback").catch(() => undefined);
        await locker.end().catch(() => undefined);
        await mutator.end().catch(() => undefined);
      }
    }, 30_000);
  },
);
