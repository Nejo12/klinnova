begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a3500000-0000-4000-8000-000000000011','authenticated','authenticated','c35-employer-a@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3500000-0000-4000-8000-000000000012','authenticated','authenticated','c35-employer-b@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3500000-0000-4000-8000-000000000021','authenticated','authenticated','c35-candidate-1@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3500000-0000-4000-8000-000000000022','authenticated','authenticated','c35-candidate-2@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values
('a3500000-0000-4000-8000-000000000011','private','C35 Employer A','Mitte',true,now(),now(),'verified',now(),now(),'a3500000-0000-4000-8000-000000000011',now(),'v1'),
('a3500000-0000-4000-8000-000000000012','private','C35 Employer B','Mitte',true,now(),now(),'verified',now(),now(),'a3500000-0000-4000-8000-000000000012',now(),'v1');

insert into public.candidate_profiles (
  id, display_name, german_comfort, work_authorisation_declared,
  work_authorisation_declared_at, city, travel_radius_minutes, available_from,
  job_categories, employment_types, shift_preferences, onboarding_completed_at
) values
('a3500000-0000-4000-8000-000000000021','C35 Candidate One','basic',true,now(),'Berlin',30,current_date,array['cleaning'],array['part_time'],array['daytime'],now()),
('a3500000-0000-4000-8000-000000000022','C35 Candidate Two','basic',true,now(),'Berlin',30,current_date,array['cleaning'],array['part_time'],array['daytime'],now());

-- vacancy041/043 belong to employer A; vacancy042 belongs to employer B.
insert into public.vacancies (
  id, employer_profile_id, title, slug, summary, description, city, public_locality,
  job_category, employment_types, shift_requirements, german_requirement,
  workplace_type, work_frequency, salary_amount_cents, salary_currency, salary_period,
  salary_is_gross, cv_required, interview_english_ok, publication_state, source,
  published_at, expires_at
) values
('a3500000-0000-4000-8000-000000000041','a3500000-0000-4000-8000-000000000011','C35 Vacancy A1','c35-vacancy-a1','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a3500000-0000-4000-8000-000000000042','a3500000-0000-4000-8000-000000000012','C35 Vacancy B1','c35-vacancy-b1','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a3500000-0000-4000-8000-000000000043','a3500000-0000-4000-8000-000000000011','C35 Vacancy A2','c35-vacancy-a2','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days');

-- app061: candidate1 x vacancyA1 (employer A).
-- app062: candidate1 x vacancyB1 (employer B) — cross-employer isolation.
-- app063: candidate2 x vacancyA2 (employer A) — second employer-A application.
insert into public.applications (
  id, candidate_id, vacancy_id, status, snapshot_version, candidate_snapshot, vacancy_snapshot
) values
('a3500000-0000-4000-8000-000000000061','a3500000-0000-4000-8000-000000000021','a3500000-0000-4000-8000-000000000041','submitted',1,'{}'::jsonb,'{}'::jsonb),
('a3500000-0000-4000-8000-000000000062','a3500000-0000-4000-8000-000000000021','a3500000-0000-4000-8000-000000000042','submitted',1,'{}'::jsonb,'{}'::jsonb),
('a3500000-0000-4000-8000-000000000063','a3500000-0000-4000-8000-000000000022','a3500000-0000-4000-8000-000000000043','submitted',1,'{}'::jsonb,'{}'::jsonb);

insert into public.application_status_history (application_id, from_status, to_status, actor_user_id, actor_role, occurred_at)
values
('a3500000-0000-4000-8000-000000000061',null,'submitted','a3500000-0000-4000-8000-000000000021','candidate',now()),
('a3500000-0000-4000-8000-000000000062',null,'submitted','a3500000-0000-4000-8000-000000000021','candidate',now()),
('a3500000-0000-4000-8000-000000000063',null,'submitted','a3500000-0000-4000-8000-000000000022','candidate',now());

-- ---------------------------------------------------------------------------
-- Section A — schema  (4)
-- ---------------------------------------------------------------------------

select has_column('public','applications','employer_seen_at','employer_seen_at column exists');
select col_type_is('public','applications','employer_seen_at','timestamp with time zone','employer_seen_at is timestamptz');
select col_is_null('public','applications','employer_seen_at','employer_seen_at is nullable (unseen by default)');

-- New rows (this fixture, inserted after migration) start unseen — the
-- migration's one-time backfill only affects rows that existed at
-- migration time, not rows inserted afterward.
select is(
  (select employer_seen_at from public.applications where id = 'a3500000-0000-4000-8000-000000000061'),
  null,
  'a genuinely new application starts unseen (employer_seen_at is null)'
);

-- ---------------------------------------------------------------------------
-- Section B — grants  (4)
-- ---------------------------------------------------------------------------

select ok(
  not has_function_privilege('anon','public.mark_employer_application_seen(uuid)','execute'),
  'anon cannot execute mark_employer_application_seen'
);
select ok(
  has_function_privilege('authenticated','public.mark_employer_application_seen(uuid)','execute'),
  'authenticated can execute mark_employer_application_seen'
);
select ok(
  not has_function_privilege('anon','public.count_unseen_current_employer_applications()','execute'),
  'anon cannot execute count_unseen_current_employer_applications'
);
select ok(
  has_function_privilege('authenticated','public.count_unseen_current_employer_applications()','execute'),
  'authenticated can execute count_unseen_current_employer_applications'
);

-- ---------------------------------------------------------------------------
-- Section C — count_unseen_current_employer_applications  (5)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3500000-0000-4000-8000-000000000011',true);

select is(
  (select (public.count_unseen_current_employer_applications()->>'count')::int),
  2,
  'employer A initially sees 2 unseen applications (app061, app063)'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a3500000-0000-4000-8000-000000000012',true);

select is(
  (select (public.count_unseen_current_employer_applications()->>'count')::int),
  1,
  'employer B independently sees only its own 1 unseen application (app062)'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a3500000-0000-4000-8000-000000000021',true);

select is(
  (select public.count_unseen_current_employer_applications()->>'result'),
  'employer_unavailable',
  'a candidate (no employer_profiles row) gets employer_unavailable, not an error'
);
select is(
  (select (public.count_unseen_current_employer_applications()->>'count')::int),
  0,
  'a candidate always gets count 0'
);

reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select throws_ok(
  $$ select public.count_unseen_current_employer_applications() $$,
  '42501', null, 'anon cannot call count_unseen_current_employer_applications at all'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section D — mark_employer_application_seen: ownership  (6)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3500000-0000-4000-8000-000000000012',true);

select is(
  (select public.mark_employer_application_seen('a3500000-0000-4000-8000-000000000061')->>'result'),
  'unavailable',
  'employer B cannot mark employer A''s application seen (no existence oracle)'
);

reset role;

select is(
  (select employer_seen_at from public.applications where id = 'a3500000-0000-4000-8000-000000000061'),
  null,
  'the rejected cross-employer attempt left employer_seen_at untouched'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3500000-0000-4000-8000-000000000021',true);

select is(
  (select public.mark_employer_application_seen('a3500000-0000-4000-8000-000000000061')->>'result'),
  'employer_unavailable',
  'a candidate cannot mark any application seen'
);

reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select throws_ok(
  $$ select public.mark_employer_application_seen('a3500000-0000-4000-8000-000000000061') $$,
  '42501', null, 'anon cannot call mark_employer_application_seen at all'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a3500000-0000-4000-8000-000000000011',true);

select is(
  (select public.mark_employer_application_seen('a3500000-0000-4000-8000-000000000061')->>'result'),
  'ok',
  'the owning employer (A) marks its own application seen'
);

reset role;

select isnt(
  (select employer_seen_at from public.applications where id = 'a3500000-0000-4000-8000-000000000061'),
  null,
  'employer_seen_at is now set after the owning employer marks it seen'
);

-- ---------------------------------------------------------------------------
-- Section E — idempotency / monotonicity  (3)
-- ---------------------------------------------------------------------------

create temporary table seen_snapshot as
  select employer_seen_at as first_seen_at
  from public.applications
  where id = 'a3500000-0000-4000-8000-000000000061';

set local role authenticated;
select set_config('request.jwt.claim.sub','a3500000-0000-4000-8000-000000000011',true);

select is(
  (select public.mark_employer_application_seen('a3500000-0000-4000-8000-000000000061')->>'result'),
  'ok',
  'a repeated mark-seen call for the same application still succeeds (idempotent)'
);

reset role;

select is(
  (select employer_seen_at from public.applications where id = 'a3500000-0000-4000-8000-000000000061'),
  (select first_seen_at from seen_snapshot),
  'repeated acknowledgement does not move the timestamp (monotonic, coalesce-based)'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3500000-0000-4000-8000-000000000011',true);

select is(
  (select (public.count_unseen_current_employer_applications()->>'count')::int),
  1,
  'employer A now sees exactly 1 unseen application (app063) after acknowledging app061'
);

reset role;

-- ---------------------------------------------------------------------------
-- Section F — status independence  (7)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3500000-0000-4000-8000-000000000011',true);

-- Transition app063 (still unseen) to "reviewing" without marking it seen.
select is(
  (select public.transition_current_employer_application_status('a3500000-0000-4000-8000-000000000063','reviewing')->>'result'),
  'updated',
  'employer A transitions app063 to reviewing (status change only, seen state untouched)'
);

select is(
  (select (public.count_unseen_current_employer_applications()->>'count')::int),
  1,
  'an unseen "reviewing" application still counts — status transition alone did not mark it seen'
);

reset role;

select is(
  (select status from public.applications where id = 'a3500000-0000-4000-8000-000000000063'),
  'reviewing',
  'app063 status is now reviewing (sanity check on the transition above)'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3500000-0000-4000-8000-000000000011',true);

select is(
  (select public.mark_employer_application_seen('a3500000-0000-4000-8000-000000000063')->>'result'),
  'ok',
  'employer A marks the (now reviewing) app063 seen'
);

select is(
  (select (public.count_unseen_current_employer_applications()->>'count')::int),
  0,
  'a seen application no longer counts, regardless of its hiring status'
);

reset role;

select is(
  (select status from public.applications where id = 'a3500000-0000-4000-8000-000000000063'),
  'reviewing',
  'marking seen never changes applications.status (still reviewing, not reset to submitted or anything else)'
);

select is(
  (select count(*)::int from public.application_status_history where application_id = 'a3500000-0000-4000-8000-000000000063'),
  2,
  'marking seen inserts zero application_status_history rows (only submitted + the one real reviewing transition exist)'
);

select * from finish();

rollback;
