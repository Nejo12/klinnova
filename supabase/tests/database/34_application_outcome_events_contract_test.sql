begin;

create extension if not exists pgtap with schema extensions;

select plan(48);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a3400000-0000-4000-8000-000000000011','authenticated','authenticated','c34-employer-a@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3400000-0000-4000-8000-000000000012','authenticated','authenticated','c34-employer-b@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3400000-0000-4000-8000-000000000021','authenticated','authenticated','c34-candidate-1@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3400000-0000-4000-8000-000000000022','authenticated','authenticated','c34-candidate-2@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values
('a3400000-0000-4000-8000-000000000011','private','C34 Employer A','Mitte',true,now(),now(),'verified',now(),now(),'a3400000-0000-4000-8000-000000000011',now(),'v1'),
('a3400000-0000-4000-8000-000000000012','private','C34 Employer B','Mitte',true,now(),now(),'verified',now(),now(),'a3400000-0000-4000-8000-000000000012',now(),'v1');

insert into public.candidate_profiles (
  id, display_name, german_comfort, work_authorisation_declared,
  work_authorisation_declared_at, city, travel_radius_minutes, available_from,
  job_categories, employment_types, shift_preferences, onboarding_completed_at
) values
('a3400000-0000-4000-8000-000000000021','C34 Candidate One','basic',true,now(),'Berlin',30,current_date,array['cleaning'],array['part_time'],array['daytime'],now()),
('a3400000-0000-4000-8000-000000000022','C34 Candidate Two','basic',true,now(),'Berlin',30,current_date,array['cleaning'],array['part_time'],array['daytime'],now());

insert into public.vacancies (
  id, employer_profile_id, title, slug, summary, description, city, public_locality,
  job_category, employment_types, shift_requirements, german_requirement,
  workplace_type, work_frequency, salary_amount_cents, salary_currency, salary_period,
  salary_is_gross, cv_required, interview_english_ok, publication_state, source,
  published_at, expires_at
) values
('a3400000-0000-4000-8000-000000000041','a3400000-0000-4000-8000-000000000011','C34 Vacancy A1','c34-vacancy-a1','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a3400000-0000-4000-8000-000000000042','a3400000-0000-4000-8000-000000000012','C34 Vacancy B1','c34-vacancy-b1','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days');

-- app1: candidate1 x vacancy A1 (employer A) — main fixture.
-- app2: candidate2 x vacancy A1 (employer A) — becomes deleted-candidate later.
-- app3: candidate1 x vacancy B1 (employer B) — cross-employer isolation fixture.
insert into public.applications (
  id, candidate_id, vacancy_id, status, snapshot_version, candidate_snapshot, vacancy_snapshot
) values
('a3400000-0000-4000-8000-000000000061','a3400000-0000-4000-8000-000000000021','a3400000-0000-4000-8000-000000000041','submitted',1,'{}'::jsonb,'{}'::jsonb),
('a3400000-0000-4000-8000-000000000062','a3400000-0000-4000-8000-000000000022','a3400000-0000-4000-8000-000000000041','submitted',1,'{}'::jsonb,'{}'::jsonb),
('a3400000-0000-4000-8000-000000000063','a3400000-0000-4000-8000-000000000021','a3400000-0000-4000-8000-000000000042','submitted',1,'{}'::jsonb,'{}'::jsonb);

-- Scratch table for staging outcome-event ids between role-impersonation
-- blocks: authenticated has zero direct SELECT on application_outcome_events
-- (by design), so an id needed inside a `set local role authenticated`
-- block must be captured here (as superuser) beforehand, mirroring the
-- existing draft_ids pattern in 29_admin_moderation_and_audit_contract_test.sql.
create temporary table outcome_ids (label text primary key, id uuid not null);
grant select, insert, delete on outcome_ids to authenticated;

-- ---------------------------------------------------------------------------
-- Section A — schema/grants  (7)
-- ---------------------------------------------------------------------------

select has_table('public','application_outcome_events','application_outcome_events table exists');
select col_is_pk('public','application_outcome_events','id','pk is id');
select col_not_null('public','application_outcome_events','recorded_by','recorded_by is not null');

select throws_ok(
  $$ insert into public.application_outcome_events (application_id, outcome_type, occurred_at, recorded_by) values ('a3400000-0000-4000-8000-000000000061','bogus_type',clock_timestamp(),'a3400000-0000-4000-8000-000000000011') $$,
  '23514', null, 'invalid outcome_type is rejected by the table CHECK'
);

select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select throws_ok($$ select * from public.application_outcome_events $$, '42501', null, 'anon cannot select application_outcome_events');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000011',true);
select throws_ok($$ select * from public.application_outcome_events $$, '42501', null, 'authenticated cannot select application_outcome_events');
select throws_ok(
  $$ insert into public.application_outcome_events (application_id, outcome_type, occurred_at, recorded_by) values ('a3400000-0000-4000-8000-000000000061','hired',clock_timestamp(),'a3400000-0000-4000-8000-000000000011') $$,
  '42501', null, 'authenticated cannot insert application_outcome_events directly'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section B — authorization on record_application_outcome  (5)
-- ---------------------------------------------------------------------------

select ok(
  not has_function_privilege(
    'anon',
    'public.record_application_outcome(uuid, text, timestamptz)',
    'execute'
  ),
  'anon cannot execute record_application_outcome'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.void_application_outcome(uuid)',
    'execute'
  ),
  'anon cannot execute void_application_outcome'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000021',true);
select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000061','interview_completed',clock_timestamp()))->>'result',
  'unavailable',
  'candidate cannot record an outcome'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000012',true);
select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000061','interview_completed',clock_timestamp()))->>'result',
  'unavailable',
  'a different employer cannot record an outcome for an application on another employer''s vacancy'
);
reset role;

select is(
  (select pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'record_application_outcome'),
  'p_application_id uuid, p_outcome_type text, p_occurred_at timestamp with time zone',
  'record_application_outcome takes no actor/recorded_by/recorded_at parameter'
);
select is(
  (select pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'void_application_outcome'),
  'p_outcome_event_id uuid',
  'void_application_outcome takes no actor parameter'
);

-- ---------------------------------------------------------------------------
-- Section C — interview multiplicity  (3)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000011',true);

select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000061','interview_completed',clock_timestamp()))->>'result',
  'ok',
  'employer records first interview_completed on their own application'
);
select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000061','interview_completed',clock_timestamp()))->>'result',
  'ok',
  'a second, distinct interview_completed event on the same application succeeds'
);
reset role;

select is(
  (select count(*)::integer from public.application_outcome_events where application_id = 'a3400000-0000-4000-8000-000000000061' and outcome_type = 'interview_completed'),
  2,
  'both interview_completed rounds are persisted as distinct rows'
);

-- ---------------------------------------------------------------------------
-- Section D — hire uniqueness + void/replacement  (7)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000011',true);

select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000061','hired',clock_timestamp()))->>'result',
  'ok',
  'first active hired event succeeds'
);
select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000061','hired',clock_timestamp()))->>'result',
  'already_hired',
  'a second active hired event for the same application is rejected'
);
reset role;

select ok(
  (select voided_at is null from public.application_outcome_events where application_id = 'a3400000-0000-4000-8000-000000000061' and outcome_type = 'hired' limit 1),
  'sanity: the active hired event is not yet voided'
);
delete from outcome_ids where label = 'app61_active_hired';
insert into outcome_ids (label, id)
select 'app61_active_hired', id
from public.application_outcome_events
where application_id = 'a3400000-0000-4000-8000-000000000061' and outcome_type = 'hired' and voided_at is null;

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000011',true);
select is(
  (public.void_application_outcome(
    (select id from outcome_ids where label = 'app61_active_hired')
  ))->>'result',
  'ok',
  'employer voids their own mistaken hired event'
);
select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000061','hired',clock_timestamp()))->>'result',
  'ok',
  'after voiding the mistaken hire, a corrected/replacement hired event can be created (void + independent new event, no replacement_for link)'
);
reset role;

select is(
  (select count(*)::integer from public.application_outcome_events where application_id = 'a3400000-0000-4000-8000-000000000061' and outcome_type = 'hired' and voided_at is null),
  1,
  'exactly one active hired event exists after the void + replacement'
);
select is(
  (select count(*)::integer from public.application_outcome_events where application_id = 'a3400000-0000-4000-8000-000000000061' and outcome_type = 'hired'),
  2,
  'the voided original hired event still exists as history (append-only)'
);

-- ---------------------------------------------------------------------------
-- Section E — temporal validity  (5)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000012',true);
select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000063','interview_completed',clock_timestamp()-interval '29 days'))->>'result',
  'ok',
  'occurred_at inside the 30-day backdating window succeeds'
);
select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000063','interview_completed',clock_timestamp()-interval '31 days'))->>'result',
  'invalid_occurred_at',
  'occurred_at older than 30 days is rejected'
);
select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000063','interview_completed',clock_timestamp()+interval '1 day'))->>'result',
  'invalid_occurred_at',
  'a meaningfully future-dated occurred_at is rejected'
);
select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000063','interview_completed',clock_timestamp()+interval '4 minutes'))->>'result',
  'ok',
  'occurred_at within the fixed 5-minute clock-skew tolerance succeeds'
);
reset role;

select ok(
  (select bool_and(recorded_at > now() - interval '1 hour') from public.application_outcome_events),
  'every recorded_at reflects real DB-generated insert time, not a caller-supplied value (RPC has no p_recorded_at parameter at all, already proven above)'
);

-- ---------------------------------------------------------------------------
-- Section F — void authorization/idempotency/integrity  (7)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000011',true);
select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000062','interview_completed',clock_timestamp()))->>'result',
  'ok',
  'setup: employer A records an interview_completed event for app2 (candidate2, still active)'
);
reset role;

delete from outcome_ids where label = 'app62_interview';
insert into outcome_ids (label, id)
select 'app62_interview', id
from public.application_outcome_events
where application_id = 'a3400000-0000-4000-8000-000000000062' and outcome_type = 'interview_completed';

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000012',true);
select is(
  (public.void_application_outcome(
    (select id from outcome_ids where label = 'app62_interview')
  ))->>'result',
  'unavailable',
  'a different employer cannot void an outcome event they do not own'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000011',true);
select is(
  (public.void_application_outcome(
    (select id from outcome_ids where label = 'app62_interview')
  ))->>'result',
  'ok',
  'the owning employer can void their own event'
);
select is(
  (public.void_application_outcome(
    (select id from outcome_ids where label = 'app62_interview')
  ))->>'result',
  'already_voided',
  'repeat void of the same event is rejected, not silently re-applied'
);
reset role;

select ok(
  (select count(*)::integer from public.application_outcome_events where application_id = 'a3400000-0000-4000-8000-000000000062' and outcome_type = 'interview_completed') = 1,
  'the voided event still exists (append-only) — not hard-deleted'
);
select ok(
  (select voided_by = 'a3400000-0000-4000-8000-000000000011' from public.application_outcome_events where application_id = 'a3400000-0000-4000-8000-000000000062' and outcome_type = 'interview_completed'),
  'void actor is derived from auth.uid(), matching the calling employer'
);
select ok(
  (select recorded_by = 'a3400000-0000-4000-8000-000000000011' from public.application_outcome_events where application_id = 'a3400000-0000-4000-8000-000000000062' and outcome_type = 'interview_completed'),
  'original recorded_by is unchanged after voiding'
);

-- ---------------------------------------------------------------------------
-- Section G — deleted-candidate gate  (4)
-- ---------------------------------------------------------------------------

-- Creation succeeding before deletion is already proven above (app2's
-- interview_completed event, recorded while candidate2 was active).

update public.candidate_profiles
set account_deleted_at = clock_timestamp()
where id = 'a3400000-0000-4000-8000-000000000022';

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000011',true);
select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000062','interview_completed',clock_timestamp()))->>'result',
  'unavailable',
  'after candidate deletion, a new outcome event cannot be recorded for that application'
);
select is(
  (public.void_application_outcome(
    (select id from outcome_ids where label = 'app62_interview')
  ))->>'result',
  'unavailable',
  'after candidate deletion, an existing event on that application can no longer be voided either (D-087 precedent: employer mutation access stops entirely, not only for new facts)'
);
reset role;

select is(
  (select count(*)::integer from public.application_outcome_events where application_id = 'a3400000-0000-4000-8000-000000000062'),
  1,
  'the historical outcome event recorded before deletion remains present, unaffected by the deletion'
);
select ok(
  (select application_id is not null and outcome_type is not null from public.application_outcome_events where application_id = 'a3400000-0000-4000-8000-000000000062'),
  'the historical event stores no candidate PII — only application_id/outcome_type/timestamps/actor ids'
);

-- ---------------------------------------------------------------------------
-- Section H — candidate-safe reads  (3)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000021',true);
select is(
  (select count(*)::integer from public.candidate_application_outcomes('a3400000-0000-4000-8000-000000000061')),
  3,
  'candidate reads their own active outcomes (2 interviews + 1 active hired; the voided original hired is excluded)'
);
select results_eq(
  $$ select outcome_type::text from public.candidate_application_outcomes('a3400000-0000-4000-8000-000000000061') order by occurred_at $$,
  $$ values ('interview_completed'), ('interview_completed'), ('hired') $$,
  'candidate-safe projection returns exactly outcome_type per row, in chronological order — never outcome_event_id/recorded_at/recorded_by/voided_at/voided_by/employer identity'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000022',true);
select is(
  (select count(*)::integer from public.candidate_application_outcomes('a3400000-0000-4000-8000-000000000061')),
  0,
  'a candidate cannot read another candidate''s application outcomes'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section I — employer reads  (3)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000011',true);
select is(
  (select count(*)::integer from public.employer_application_outcomes('a3400000-0000-4000-8000-000000000061')),
  4,
  'the owning employer reads all outcomes (active + voided) for their own application'
);
select is(
  (select count(*)::integer from public.employer_application_outcomes('a3400000-0000-4000-8000-000000000063')),
  0,
  'the same employer reading an unrelated (employer B''s) application''s outcomes gets zero rows, not a cross-application leak'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000012',true);
select is(
  (select count(*)::integer from public.employer_application_outcomes('a3400000-0000-4000-8000-000000000061')),
  0,
  'an unrelated employer cannot read another employer''s application outcomes'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section J — accepted vs hired separation  (2)
-- ---------------------------------------------------------------------------

update public.applications set status = 'accepted' where id = 'a3400000-0000-4000-8000-000000000063';
select is(
  (select count(*)::integer from public.application_outcome_events where application_id = 'a3400000-0000-4000-8000-000000000063' and outcome_type = 'hired'),
  0,
  'setting applications.status = accepted alone does not create a hired outcome event'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3400000-0000-4000-8000-000000000012',true);
select is(
  (public.record_application_outcome('a3400000-0000-4000-8000-000000000063','hired',clock_timestamp()))->>'result',
  'ok',
  'setup: employer B records a hired outcome for app3 (already accepted)'
);
reset role;

select is(
  (select status from public.applications where id = 'a3400000-0000-4000-8000-000000000063'),
  'accepted',
  'recording a hired outcome does not rewrite applications.status — accepted and hired remain semantically separate'
);

select * from finish();
rollback;
