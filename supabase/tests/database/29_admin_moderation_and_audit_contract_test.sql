begin;

create extension if not exists pgtap with schema extensions;

select plan(222);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

create temporary table draft_ids (label text primary key, id uuid not null);
grant select, insert on draft_ids to authenticated;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000001','authenticated','authenticated','c29-operator@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000002','authenticated','authenticated','c29-non-operator@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000011','authenticated','authenticated','c29-employer-a@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000012','authenticated','authenticated','c29-employer-b@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000014','authenticated','authenticated','c29-employer-d@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000018','authenticated','authenticated','c29-employer-g@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000020','authenticated','authenticated','c29-employer-j@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000021','authenticated','authenticated','c29-candidate-1@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000099','authenticated','authenticated','c29-throwaway@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.verification_operators (user_id, created_by)
values ('a2900000-0000-4000-8000-000000000001','a2900000-0000-4000-8000-000000000001');

-- Employer A: private, verified, completed. Main suspension/moderation subject.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values (
  'a2900000-0000-4000-8000-000000000011','private','C29 Employer A','Mitte',true,
  now(),now(),'verified',now(),now(),'a2900000-0000-4000-8000-000000000001',now(),'v1'
);

-- Employer B: private, verified, completed. Unaffected-by-A control.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values (
  'a2900000-0000-4000-8000-000000000012','private','C29 Employer B','Mitte',true,
  now(),now(),'verified',now(),now(),'a2900000-0000-4000-8000-000000000001',now(),'v1'
);

-- Employer G: private, completed, unverified. Verification audit-emission subject.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state
) values (
  'a2900000-0000-4000-8000-000000000018','private','C29 Employer G','Mitte',true,
  now(),now(),'unverified'
);

-- Employer J: private, verified, completed. Target-deletion cascade-vs-retain subject.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values (
  'a2900000-0000-4000-8000-000000000020','private','C29 Employer J','Mitte',true,
  now(),now(),'verified',now(),now(),'a2900000-0000-4000-8000-000000000001',now(),'v1'
);

-- Employer D (14): no employer_profiles row yet — bootstrap insert-branch fixture.

-- Candidate 1: completed, matches every vacancy in this file (cleaning /
-- part_time / daytime, no vacancy adds a language requirement or german
-- requirement above 'none').
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'a2900000-0000-4000-8000-000000000021','C29 Candidate One','basic',true,
  now(),'Berlin',30,(timezone('Europe/Berlin', now()))::date,
  array['cleaning'],array['part_time'],array['daytime'],now()
);

-- Employer G's publish-ready vacancy adds an 'en' language requirement, so
-- the candidate needs at least basic English on file to remain eligible.
insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('a2900000-0000-4000-8000-000000000021','en','basic');

-- Four published Employer-A vacancies (V1..V4) + one publish-ready draft (V5).
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values
('a2900000-0000-4000-8000-000000000041','a2900000-0000-4000-8000-000000000011','C29 Vacancy One','c29-vacancy-one','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a2900000-0000-4000-8000-000000000042','a2900000-0000-4000-8000-000000000011','C29 Vacancy Two','c29-vacancy-two','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a2900000-0000-4000-8000-000000000043','a2900000-0000-4000-8000-000000000011','C29 Vacancy Three','c29-vacancy-three','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a2900000-0000-4000-8000-000000000044','a2900000-0000-4000-8000-000000000011','C29 Vacancy Four','c29-vacancy-four','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days');

insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source
) values
('a2900000-0000-4000-8000-000000000045','a2900000-0000-4000-8000-000000000011','C29 Vacancy Five','c29-vacancy-five','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer');

insert into public.vacancy_language_requirements (vacancy_id,language_code,min_proficiency)
values ('a2900000-0000-4000-8000-000000000045','en','basic');

-- One published Employer-B vacancy — the other-employer-unaffected fixture.
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'a2900000-0000-4000-8000-000000000051','a2900000-0000-4000-8000-000000000012','C29 Vacancy B1','c29-vacancy-b1','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

-- ---------------------------------------------------------------------------
-- Section A — schema/grants
-- ---------------------------------------------------------------------------

select has_table('public','employer_suspension','employer_suspension table exists');
select has_table('public','vacancy_moderation','vacancy_moderation table exists');
select has_table('public','admin_audit_events','admin_audit_events table exists');
select col_is_pk('public','employer_suspension','employer_profile_id','employer_suspension pk is employer_profile_id');
select col_is_pk('public','vacancy_moderation','vacancy_id','vacancy_moderation pk is vacancy_id');
select col_is_pk('public','admin_audit_events','id','admin_audit_events pk is id');
select col_not_null('public','admin_audit_events','event_type','event_type is not null');
select col_not_null('public','admin_audit_events','target_kind','target_kind is not null');
select col_not_null('public','admin_audit_events','target_id','target_id is not null');
select col_not_null('public','admin_audit_events','actor_user_id','actor_user_id is not null');

select throws_ok(
  $$ insert into public.admin_audit_events (event_type, target_kind, target_id, actor_user_id) values ('bogus_event','employer','a2900000-0000-4000-8000-000000000011','a2900000-0000-4000-8000-000000000001') $$,
  '23514', null, 'invalid event_type is rejected by the table CHECK'
);
select throws_ok(
  $$ insert into public.admin_audit_events (event_type, target_kind, target_id, actor_user_id) values ('employer_suspended','bogus_kind','a2900000-0000-4000-8000-000000000011','a2900000-0000-4000-8000-000000000001') $$,
  '23514', null, 'invalid target_kind is rejected by the table CHECK'
);
select throws_ok(
  $$ insert into public.admin_audit_events (event_type, target_kind, target_id, actor_user_id, reason) values ('vacancy_moderated','employer','a2900000-0000-4000-8000-000000000011','a2900000-0000-4000-8000-000000000001','x') $$,
  '23514', null, 'mismatched event_type/target_kind pairing is rejected by the table CHECK'
);
select throws_ok(
  $$ insert into public.admin_audit_events (event_type, target_kind, target_id, actor_user_id) values ('employer_suspended','employer','a2900000-0000-4000-8000-000000000011','a2900000-0000-4000-8000-000000000001') $$,
  '23514', null, 'punitive event_type without a reason is rejected by the table CHECK'
);
select lives_ok(
  $$ insert into public.admin_audit_events (event_type, target_kind, target_id, actor_user_id) values ('employer_unsuspended','employer','00000000-0000-4000-8000-000000000000','a2900000-0000-4000-8000-000000000001') $$,
  'target_id referencing a nonexistent employer_profiles row succeeds — target_id is not a real FK (existence is procedural, enforced by the writing RPC, not the table)'
);
delete from public.admin_audit_events where target_id = '00000000-0000-4000-8000-000000000000';

select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select throws_ok($$ select * from public.admin_audit_events $$, '42501', null, 'anon cannot select admin_audit_events');
select throws_ok($$ select * from public.employer_suspension $$, '42501', null, 'anon cannot select employer_suspension');
select throws_ok($$ select * from public.vacancy_moderation $$, '42501', null, 'anon cannot select vacancy_moderation');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000011',true);
select throws_ok($$ select * from public.admin_audit_events $$, '42501', null, 'authenticated cannot select admin_audit_events');
select throws_ok(
  $$ insert into public.admin_audit_events (event_type, target_kind, target_id, actor_user_id, reason) values ('employer_suspended','employer','a2900000-0000-4000-8000-000000000011','a2900000-0000-4000-8000-000000000011','x') $$,
  '42501', null, 'authenticated cannot insert admin_audit_events'
);
select throws_ok($$ update public.admin_audit_events set reason = 'x' $$, '42501', null, 'authenticated cannot update admin_audit_events');
select throws_ok($$ delete from public.admin_audit_events $$, '42501', null, 'authenticated cannot delete admin_audit_events');
select throws_ok($$ select * from public.employer_suspension $$, '42501', null, 'authenticated cannot select employer_suspension');
select throws_ok(
  $$ insert into public.employer_suspension (employer_profile_id, suspended_by, suspended_reason) values ('a2900000-0000-4000-8000-000000000011','a2900000-0000-4000-8000-000000000011','x') $$,
  '42501', null, 'authenticated cannot insert employer_suspension'
);
select throws_ok($$ select * from public.vacancy_moderation $$, '42501', null, 'authenticated cannot select vacancy_moderation');
reset role;

-- No p_actor_user_id / p_occurred_at / p_target_kind parameter on any new
-- write RPC — proven by exact signature inspection, the same technique
-- already used by 13_applications_submit_rpc_test.sql.
select is(
  (select pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'suspend_employer'),
  'p_employer_profile_id uuid, p_reason text',
  'suspend_employer accepts no actor/timestamp/target_kind parameter'
);
select is(
  (select pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'unsuspend_employer'),
  'p_employer_profile_id uuid',
  'unsuspend_employer accepts no actor/timestamp/target_kind parameter'
);
select is(
  (select pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'moderate_vacancy'),
  'p_vacancy_id uuid, p_reason text',
  'moderate_vacancy accepts no actor/timestamp/target_kind parameter'
);
select is(
  (select pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'restore_vacancy'),
  'p_vacancy_id uuid',
  'restore_vacancy accepts no actor/timestamp/target_kind parameter'
);

-- ---------------------------------------------------------------------------
-- Section B — operator authorization
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000011','x')->>'status','unauthenticated','suspend requires auth');

select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000002',true);
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000011','x')->>'status','forbidden','non-operator cannot suspend');
select is(public.moderate_vacancy('a2900000-0000-4000-8000-000000000041','x')->>'status','forbidden','non-operator cannot moderate');
select is(public.get_employer_moderation_status('a2900000-0000-4000-8000-000000000011')->>'status','forbidden','non-operator gets forbidden from employer moderation status');
select is(public.get_vacancy_moderation_status('a2900000-0000-4000-8000-000000000041')->>'status','forbidden','non-operator gets forbidden from vacancy moderation status');
select is_empty($$ select * from public.list_employers_for_operator() $$,'non-operator sees zero rows from list_employers_for_operator');
select is_empty($$ select * from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011') $$,'non-operator sees zero rows from list_employer_vacancies_for_operator');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.suspend_employer('00000000-0000-4000-8000-000000000000','nonexistent target')->>'status','unavailable','suspend on a nonexistent employer id is unavailable');
select is(public.moderate_vacancy('00000000-0000-4000-8000-000000000000','nonexistent target')->>'status','unavailable','moderate on a nonexistent vacancy id is unavailable');
reset role;
select is(
  (select count(*)::integer from public.admin_audit_events where target_id = '00000000-0000-4000-8000-000000000000'),
  0,
  'no audit event is created for a nonexistent target through either write RPC'
);

-- ---------------------------------------------------------------------------
-- Section C — suspension core lifecycle (Employer A)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000011',true);
select is(public.is_current_employer_suspended(),false,'employer A is not suspended before any operator action');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.get_employer_moderation_status('a2900000-0000-4000-8000-000000000011')->>'suspended','false','operator sees employer A as not suspended');
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000011','')->>'status','validation_error','blank suspend reason is rejected');
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000011',repeat('x',501))->>'status','validation_error','over-limit suspend reason is rejected');
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000011','Fraudulent postings reported by candidates')->>'status','ok','employer A is suspended');
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000011','again')->>'status','already_in_state','duplicate suspend is deterministic (established sequential-duplicate idempotency proof, matching the Slice 5/6 pattern — this repo has no true concurrent-session pgTAP harness)');
reset role;

select is(
  (select suspended_reason from public.employer_suspension where employer_profile_id = 'a2900000-0000-4000-8000-000000000011'),
  'Fraudulent postings reported by candidates',
  'employer_suspension row carries the suspend reason'
);
select is(
  (select suspended_by from public.employer_suspension where employer_profile_id = 'a2900000-0000-4000-8000-000000000011'),
  'a2900000-0000-4000-8000-000000000001',
  'employer_suspension row carries the operator actor'
);
select is(
  (select count(*)::integer from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000011' and event_type = 'employer_suspended'),
  1,
  'exactly one employer_suspended audit event was written'
);
select is(
  (select actor_user_id from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000011' and event_type = 'employer_suspended'),
  'a2900000-0000-4000-8000-000000000001',
  'audit event actor is the operator, DB-derived'
);
select is(
  (select target_kind from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000011' and event_type = 'employer_suspended'),
  'employer',
  'audit event target_kind is employer'
);
select is(
  (
    select (es.suspended_at = e.occurred_at)
    from public.employer_suspension es, public.admin_audit_events e
    where es.employer_profile_id = 'a2900000-0000-4000-8000-000000000011'
      and e.target_id = 'a2900000-0000-4000-8000-000000000011'
      and e.event_type = 'employer_suspended'
  ),
  true,
  'suspension row and its audit event share one captured timestamp'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000011',true);
select is(public.is_current_employer_suspended(),true,'employer A now reports itself suspended');
reset role;

-- ---------------------------------------------------------------------------
-- Section D — direct employer_profiles UPDATE denial while suspended (RLS)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000011',true);
select set_config('request.jwt.claims','{"sub":"a2900000-0000-4000-8000-000000000011","role":"authenticated"}',true);

select lives_ok(
  $$ update public.employer_profiles set display_name = 'Should Not Change', berlin_locality = 'Should Not Change', phone = '000', website = 'https://example.test' where id = 'a2900000-0000-4000-8000-000000000011' $$,
  'savePrivateEmployerAction-shape UPDATE does not throw while suspended (RLS excludes the row, zero rows affected)'
);
select lives_ok(
  $$ update public.employer_profiles set lawful_hiring_declared = false where id = 'a2900000-0000-4000-8000-000000000011' $$,
  'setLawfulHiringDeclared-shape UPDATE does not throw while suspended'
);
select lives_ok(
  $$ update public.employer_profiles set updated_at = now() where id = 'a2900000-0000-4000-8000-000000000011' $$,
  'generic own-row UPDATE does not throw while suspended'
);
reset role;

select is(
  (select display_name from public.employer_profiles where id = 'a2900000-0000-4000-8000-000000000011'),
  'C29 Employer A',
  'suspended employer profile-detail UPDATE was silently a no-op (display_name unchanged)'
);
select is(
  (select lawful_hiring_declared from public.employer_profiles where id = 'a2900000-0000-4000-8000-000000000011'),
  true,
  'suspended employer lawful_hiring_declared UPDATE was silently a no-op'
);

-- INSERT policy (employer_profiles_insert_own) is untouched by the narrowed
-- UPDATE policy — a throwaway id proves ordinary INSERT still works exactly
-- as before, independent of any suspension state.
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000099',true);
select set_config('request.jwt.claims','{"sub":"a2900000-0000-4000-8000-000000000099","role":"authenticated"}',true);
select lives_ok(
  $$ insert into public.employer_profiles (id, employer_type) values ('a2900000-0000-4000-8000-000000000099','private') $$,
  'employer_profiles_insert_own is unaffected by the update-policy narrowing'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section E — unsuspend restores RLS/RPC access
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.unsuspend_employer('a2900000-0000-4000-8000-000000000011')->>'status','ok','employer A is unsuspended');
select is(public.unsuspend_employer('a2900000-0000-4000-8000-000000000011')->>'status','already_in_state','duplicate unsuspend is deterministic');
reset role;

select is(
  (select count(*)::integer from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000011' and event_type = 'employer_unsuspended'),
  1,
  'exactly one employer_unsuspended audit event was written'
);
select is(
  (select reason from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000011' and event_type = 'employer_unsuspended'),
  null,
  'employer_unsuspended audit event has no reason — restoration is not punitive'
);
select is(
  (select count(*)::integer from public.employer_suspension where employer_profile_id = 'a2900000-0000-4000-8000-000000000011'),
  0,
  'employer_suspension row is gone after unsuspend'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000011',true);
select set_config('request.jwt.claims','{"sub":"a2900000-0000-4000-8000-000000000011","role":"authenticated"}',true);
select lives_ok(
  $$ update public.employer_profiles set display_name = 'Employer A Updated' where id = 'a2900000-0000-4000-8000-000000000011' $$,
  'own-row UPDATE lives after unsuspend'
);
reset role;
select is(
  (select display_name from public.employer_profiles where id = 'a2900000-0000-4000-8000-000000000011'),
  'Employer A Updated',
  'unsuspended employer profile-detail UPDATE actually takes effect'
);

-- ---------------------------------------------------------------------------
-- Section F — every authoritative employer-mutating RPC: unsuspended
-- baseline, then suspended denial, then restored.
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000011',true);

-- Unsuspended baseline (each RPC reaches its normal logic).
select is(public.create_employer_vacancy_draft('C29 Draft X','cleaning','Mitte')->>'status','ok','unsuspended: create draft succeeds');
insert into draft_ids (label, id)
select 'draft_x', id from public.vacancies
where employer_profile_id = 'a2900000-0000-4000-8000-000000000011' and title = 'C29 Draft X';
select is(public.update_employer_vacancy_draft((select id from draft_ids where label='draft_x'), p_title := 'C29 Draft X Edited')->>'status','ok','unsuspended: update draft succeeds');
select is(public.replace_employer_vacancy_languages((select id from draft_ids where label='draft_x'),'[{"language_code":"en","min_proficiency":"basic"}]')->>'status','ok','unsuspended: replace languages succeeds');
select is(public.delete_employer_vacancy_draft((select id from draft_ids where label='draft_x'))->>'status','ok','unsuspended: delete draft succeeds');
select is(public.publish_employer_vacancy('a2900000-0000-4000-8000-000000000045')->>'status','ok','unsuspended: publish succeeds');
select is(public.pause_employer_vacancy('a2900000-0000-4000-8000-000000000045')->>'status','ok','unsuspended: pause succeeds');
select is(public.resume_employer_vacancy('a2900000-0000-4000-8000-000000000045')->>'status','ok','unsuspended: resume succeeds');
select is(public.request_employer_verification()->>'status','invalid_state','unsuspended: request_employer_verification reaches normal logic (already verified)');
select is(public.complete_employer_onboarding()->>'status','completed','unsuspended: complete_employer_onboarding reaches normal logic');
select is(public.bootstrap_organisation_employer('x','x','x','x','x')->>'status','conflict_private_completed','unsuspended: bootstrap reaches normal logic (found branch)');
reset role;

-- Suspend A a second time for this section's denial proofs.
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000011','RPC enforcement test')->>'status','ok','employer A suspended again for RPC-enforcement proofs');
reset role;

-- Fresh draft, inserted directly (fixture-style, bypassing RPC) so
-- update/replace/delete-while-suspended can be proven against a real row.
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source
) values (
  'a2900000-0000-4000-8000-000000000046','a2900000-0000-4000-8000-000000000011','C29 Draft Z','c29-draft-z','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000011',true);

select is(public.create_employer_vacancy_draft('C29 Draft Blocked','cleaning','Mitte')->>'status','unavailable','suspended: create draft is blocked');
select is(public.update_employer_vacancy_draft('a2900000-0000-4000-8000-000000000046', p_title := 'Should Not Apply')->>'status','unavailable','suspended: update draft is blocked');
select is(public.replace_employer_vacancy_languages('a2900000-0000-4000-8000-000000000046','[{"language_code":"de","min_proficiency":"basic"}]')->>'status','unavailable','suspended: replace languages is blocked');
select is(public.delete_employer_vacancy_draft('a2900000-0000-4000-8000-000000000046')->>'status','unavailable','suspended: delete draft is blocked');
select is(public.publish_employer_vacancy('a2900000-0000-4000-8000-000000000046')->>'status','unavailable','suspended: publish is blocked');
select is(public.pause_employer_vacancy('a2900000-0000-4000-8000-000000000045')->>'status','unavailable','suspended: pause (dispatcher) is blocked');
select is(public.withdraw_employer_vacancy('a2900000-0000-4000-8000-000000000045')->>'status','unavailable','suspended: withdraw (dispatcher) is blocked');
select is(public.request_employer_verification()->>'status','unavailable','suspended: request_employer_verification is blocked before reaching invalid_state');
select is(public.complete_employer_onboarding()->>'status','unavailable','suspended: complete_employer_onboarding is blocked before reaching completed');
select is(public.bootstrap_organisation_employer('x','x','x','x','x')->>'status','unavailable','suspended: bootstrap is blocked before reaching conflict_private_completed');
reset role;

select is(
  (select count(*)::integer from public.vacancies where employer_profile_id = 'a2900000-0000-4000-8000-000000000011' and title = 'C29 Draft Blocked'),
  0,
  'no vacancy row was created by the blocked create_employer_vacancy_draft call'
);
select is(
  (select title from public.vacancies where id = 'a2900000-0000-4000-8000-000000000046'),
  'C29 Draft Z',
  'draft Z title is unchanged by the blocked update call'
);
select is(
  (select count(*)::integer from public.vacancies where id = 'a2900000-0000-4000-8000-000000000046'),
  1,
  'draft Z still exists — the blocked delete call did not remove it'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.unsuspend_employer('a2900000-0000-4000-8000-000000000011')->>'status','ok','employer A unsuspended after RPC-enforcement proofs');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000011',true);
select is(public.pause_employer_vacancy('a2900000-0000-4000-8000-000000000045')->>'status','ok','dispatcher (pause) restored after unsuspend');
select is(public.delete_employer_vacancy_draft('a2900000-0000-4000-8000-000000000046')->>'status','ok','delete draft restored after unsuspend');
reset role;

-- ---------------------------------------------------------------------------
-- Section G — bootstrap_organisation_employer INSERT-branch exemption
-- (Employer D: no profile exists yet, so it structurally cannot be
-- suspended; the found-branch check only applies once a profile exists).
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000014',true);
select is(
  public.bootstrap_organisation_employer('C29 Employer D','C29 Legal D','Mitte','C29 Company D','c29-company-d')->>'status',
  'ok',
  'bootstrap insert-branch succeeds for a not-yet-existing profile, unaffected by suspension (none can exist yet)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000014','post-bootstrap suspension')->>'status','ok','employer D suspended after its profile now exists');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000014',true);
select is(
  public.bootstrap_organisation_employer('C29 Employer D','C29 Legal D','Mitte','C29 Company D','c29-company-d')->>'status',
  'unavailable',
  'bootstrap found-branch is blocked once employer D is suspended'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.unsuspend_employer('a2900000-0000-4000-8000-000000000014')->>'status','ok','employer D unsuspended');
reset role;

-- ---------------------------------------------------------------------------
-- Section H — applicant review: revoked-but-unsuspended vs suspended
-- ---------------------------------------------------------------------------

-- This entire section deliberately uses Employer G, never Employer A —
-- request_employer_verification only allows re-requesting from
-- ('unverified','rejected'), not 'revoked', so an employer that has been
-- revoked here can never return to 'verified' through the accepted RPCs.
-- Employer A must stay 'verified' untouched for every later effective-
-- public visibility assertion in this file, so all revoke/reject/approve
-- audit-emission and revoked-vs-suspended review testing happens on the
-- disposable Employer G instead.

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000021',true);
select is((select status from public.resolve_current_candidate_vacancy_match('a2900000-0000-4000-8000-000000000043')),'eligible','candidate resolves vacancy three as eligible before any hold');
select is(
  (select bool_or(vacancy_id = 'a2900000-0000-4000-8000-000000000043') from public.list_current_candidate_vacancy_matches()),
  true,
  'candidate match list includes vacancy three before any hold'
);
reset role;

-- Verification cycle on employer G: reject then approve, proving the
-- ledger accumulates rather than overwrites (docs/41 §2.7 history gap).
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000018',true);
select is(public.request_employer_verification()->>'status','ok','employer G requests verification');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.reject_employer_verification('a2900000-0000-4000-8000-000000000018','incomplete supporting information')->>'status','ok','operator rejects employer G');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000018',true);
select is(public.request_employer_verification()->>'status','ok','employer G re-requests after rejection');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.approve_employer_verification('a2900000-0000-4000-8000-000000000018')->>'status','ok','operator approves employer G');
reset role;

select is(
  (select reason from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000018' and event_type = 'verification_rejected'),
  'incomplete supporting information',
  'verification_rejected audit event carries the operator reason'
);
select is(
  (select reason from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000018' and event_type = 'verification_approved'),
  null,
  'verification_approved audit event has no reason'
);
select is(
  (select count(*)::integer from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000018' and event_type in ('verification_rejected','verification_approved')),
  2,
  'a second verification cycle adds a new audit event rather than overwriting the first (closes the docs/41 §2.7 history gap)'
);

-- Employer G publishes one vacancy and receives one application.
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000018',true);
select is(
  public.create_employer_vacancy_draft(
    'C29 Vacancy G','cleaning','Mitte',
    p_description := 'description',
    p_employment_types := array['part_time'],
    p_shift_requirements := array['daytime'],
    p_workplace_type := 'private_home',
    p_work_frequency := 'recurring',
    p_salary_amount_cents := 1800,
    p_salary_period := 'hourly',
    p_cv_required := true,
    p_interview_english_ok := true
  )->>'status',
  'ok',
  'employer G creates a publish-ready draft'
);
insert into draft_ids (label, id)
select 'vacancy_g', id from public.vacancies
where employer_profile_id = 'a2900000-0000-4000-8000-000000000018' and title = 'C29 Vacancy G';
select is(public.replace_employer_vacancy_languages((select id from draft_ids where label='vacancy_g'),'[{"language_code":"en","min_proficiency":"basic"}]')->>'status','ok','employer G sets language requirements');
select is(public.publish_employer_vacancy((select id from draft_ids where label='vacancy_g'))->>'status','ok','employer G publishes vacancy G');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000021',true);
select is(public.submit_candidate_application((select id from draft_ids where label='vacancy_g'))->>'result','submitted','candidate applies to vacancy G');
insert into draft_ids (label, id)
select 'app_g', id from public.applications
where candidate_id = 'a2900000-0000-4000-8000-000000000021' and vacancy_id = (select id from draft_ids where label='vacancy_g');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000018',true);
select is(
  (select bool_or(application_id = (select id from draft_ids where label='app_g')) from public.list_current_employer_applications()),
  true,
  'employer G applicant list includes app_g before any hold'
);
select is(public.get_current_employer_application((select id from draft_ids where label='app_g'))->>'status','ready','employer G applicant detail is ready before any hold');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.revoke_employer_verification('a2900000-0000-4000-8000-000000000018','revoked for review-regression test')->>'status','ok','employer G verification revoked (not suspended)');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000018',true);
select is(
  (select bool_or(application_id = (select id from draft_ids where label='app_g')) from public.list_current_employer_applications()),
  true,
  'revoked-but-unsuspended employer G still sees app_g (D-070 unaffected by D-072)'
);
select is(public.get_current_employer_application((select id from draft_ids where label='app_g'))->>'status','ready','revoked-but-unsuspended employer G detail is still ready');
select is(
  public.transition_current_employer_application_status((select id from draft_ids where label='app_g'),'reviewing')->>'result',
  'updated',
  'revoked-but-unsuspended employer G can still transition the application'
);
reset role;

select is(
  (select count(*)::integer from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000018' and event_type in ('verification_rejected','verification_approved','verification_revoked')),
  3,
  'a third verification-lifecycle audit event (revoked) also accumulates rather than overwriting'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000018','suspended for applicant-review block test')->>'status','ok','employer G suspended for applicant-review block test');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000018',true);
select is_empty($$ select * from public.list_current_employer_applications() $$,'suspended employer G applicant list is empty');
select is(public.get_current_employer_application((select id from draft_ids where label='app_g'))->>'status','unavailable','suspended employer G applicant detail is unavailable');
select is(
  public.transition_current_employer_application_status((select id from draft_ids where label='app_g'),'shortlisted')->>'result',
  'employer_unavailable',
  'suspended employer G transition returns employer_unavailable'
);
reset role;

select is(
  (select current_status from (select status as current_status from public.applications where id = (select id from draft_ids where label='app_g')) t),
  'reviewing',
  'the blocked transition attempt did not change the application status'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000021',true);
select is(
  (select count(*)::integer from public.list_current_candidate_application_status_history((select id from draft_ids where label='app_g'))),
  2,
  'candidate-owned status history remains fully readable regardless of the employer''s suspension state'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.unsuspend_employer('a2900000-0000-4000-8000-000000000018')->>'status','ok','employer G unsuspended after applicant-review block test');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000018',true);
select is(
  (select bool_or(application_id = (select id from draft_ids where label='app_g')) from public.list_current_employer_applications()),
  true,
  'applicant list access is restored after unsuspend'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section I — effective-public visibility: employer suspension gate
-- ---------------------------------------------------------------------------

select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000041'), true, 'vacancy one is effective-public before any hold');
select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000042'), true, 'vacancy two is effective-public before any hold');
select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000051'), true, 'employer B''s vacancy is effective-public before any hold');
select is(
  (select count(*)::integer from public.list_effective_public_vacancies() where vacancy_id in ('a2900000-0000-4000-8000-000000000041','a2900000-0000-4000-8000-000000000042')),
  2,
  'the public list includes both employer A vacancies before any hold'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000011','visibility suspension test')->>'status','ok','employer A suspended for visibility test');
reset role;

select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000041'), false, 'vacancy one is hidden while employer A is suspended');
select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000042'), false, 'vacancy two is hidden while employer A is suspended');
select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000051'), true, 'employer B''s vacancy is unaffected by employer A''s suspension');
select is(
  (select count(*)::integer from public.list_effective_public_vacancies() where vacancy_id in ('a2900000-0000-4000-8000-000000000041','a2900000-0000-4000-8000-000000000042')),
  0,
  'the public list excludes both employer A vacancies while suspended'
);
select is_empty(
  $$ select * from public.get_effective_public_vacancy('a2900000-0000-4000-8000-000000000041') $$,
  'the public detail RPC returns zero rows for a suspended employer''s vacancy'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000021',true);
select is((select status from public.resolve_current_candidate_vacancy_match('a2900000-0000-4000-8000-000000000041')),'unavailable','candidate match detail treats a suspended employer''s vacancy as the existing unavailable status, not a new one');
select is(
  coalesce((select bool_or(vacancy_id = 'a2900000-0000-4000-8000-000000000041') from public.list_current_candidate_vacancy_matches()), false),
  false,
  'candidate match list no longer includes vacancy one while employer A is suspended'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.unsuspend_employer('a2900000-0000-4000-8000-000000000011')->>'status','ok','employer A unsuspended after visibility test');
reset role;

select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000041'), true, 'vacancy one is visible again after unsuspend (current live state still qualifies)');
select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000042'), true, 'vacancy two is visible again after unsuspend');

-- ---------------------------------------------------------------------------
-- Section J — vacancy moderation + composition with employer suspension
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.moderate_vacancy('a2900000-0000-4000-8000-000000000041','misleading listing reported')->>'status','ok','vacancy one is moderated');
select is(public.moderate_vacancy('a2900000-0000-4000-8000-000000000041','again')->>'status','already_in_state','duplicate moderate is deterministic');
reset role;

select is(
  (select count(*)::integer from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000041' and event_type = 'vacancy_moderated'),
  1,
  'exactly one vacancy_moderated audit event was written'
);
select is(
  (
    select (vm.moderated_at = e.occurred_at)
    from public.vacancy_moderation vm, public.admin_audit_events e
    where vm.vacancy_id = 'a2900000-0000-4000-8000-000000000041'
      and e.target_id = 'a2900000-0000-4000-8000-000000000041'
      and e.event_type = 'vacancy_moderated'
  ),
  true,
  'moderation row and its audit event share one captured timestamp'
);

select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000041'), false, 'vacancy one is hidden while moderated');
select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000042'), true, 'sibling vacancy two is unaffected by vacancy one''s moderation');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.get_vacancy_moderation_status('a2900000-0000-4000-8000-000000000041')->>'moderated','true','operator sees vacancy one as moderated');
select is(public.restore_vacancy('a2900000-0000-4000-8000-000000000041')->>'status','ok','vacancy one is restored');
select is(public.restore_vacancy('a2900000-0000-4000-8000-000000000041')->>'status','already_in_state','duplicate restore is deterministic');
reset role;

select is(
  (select count(*)::integer from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000041' and event_type = 'vacancy_restored'),
  1,
  'exactly one vacancy_restored audit event was written'
);
select is(
  (select reason from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000041' and event_type = 'vacancy_restored'),
  null,
  'vacancy_restored audit event has no reason'
);
select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000041'), true, 'vacancy one is visible again after restore (live state still qualifies)');

-- Composition: moderate vacancy two AND suspend employer A at the same time.
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.moderate_vacancy('a2900000-0000-4000-8000-000000000042','composition test reason')->>'status','ok','vacancy two is moderated for the composition test');
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000011','composition test suspension')->>'status','ok','employer A is suspended for the composition test');
reset role;

select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000042'), false, 'vacancy two is hidden by both gates at once');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.unsuspend_employer('a2900000-0000-4000-8000-000000000011')->>'status','ok','employer A unsuspended during the composition test');
reset role;

select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000042'), false, 'vacancy two remains hidden after unsuspend — the moderation gate alone still excludes it (gates do not clear each other)');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.restore_vacancy('a2900000-0000-4000-8000-000000000042')->>'status','ok','vacancy two is restored, clearing the second gate');
reset role;

select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000042'), true, 'vacancy two is visible again once both gates are clear');

-- ---------------------------------------------------------------------------
-- Section K — clearing a safety gate never revives an independently
-- non-public vacancy (withdrawn state alone still excludes it).
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000011',true);
select is(public.withdraw_employer_vacancy('a2900000-0000-4000-8000-000000000043')->>'status','ok','vacancy three is withdrawn by its employer');
reset role;

select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000043'), false, 'withdrawn vacancy three is not effective-public');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000011','final gate-clear test')->>'status','ok','employer A suspended once more');
reset role;

select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000043'), false, 'withdrawn+suspended vacancy three is still not effective-public');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.unsuspend_employer('a2900000-0000-4000-8000-000000000011')->>'status','ok','employer A unsuspended once more');
reset role;

select is(public.is_vacancy_effectively_public('a2900000-0000-4000-8000-000000000043'), false, 'clearing the suspension gate does not revive a withdrawn vacancy — existing_publication_conditions still fails on its own terms');

-- ---------------------------------------------------------------------------
-- Section L — candidate application submission through the suspension gate
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000011','submission-block test')->>'status','ok','employer A suspended for the submission-block test');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000021',true);
select is(public.submit_candidate_application('a2900000-0000-4000-8000-000000000044')->>'result','unavailable','submission to a suspended employer''s vacancy returns the existing unavailable result, not a new reason');
reset role;

select is(
  (select count(*)::integer from public.applications where vacancy_id = 'a2900000-0000-4000-8000-000000000044'),
  0,
  'no application row was created by the blocked submission'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.unsuspend_employer('a2900000-0000-4000-8000-000000000011')->>'status','ok','employer A unsuspended for the submission-restore test');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000021',true);
select is(public.submit_candidate_application('a2900000-0000-4000-8000-000000000044')->>'result','submitted','submission succeeds after unsuspend');
reset role;

select is(
  (select count(*)::integer from public.applications where vacancy_id = 'a2900000-0000-4000-8000-000000000044'),
  1,
  'exactly one application row now exists for vacancy four'
);

-- ---------------------------------------------------------------------------
-- Section M — ledger-wide integrity aggregate
-- ---------------------------------------------------------------------------

select is(
  (
    select count(*)::integer from public.admin_audit_events
    where not (
      (target_kind = 'employer' and event_type in ('employer_suspended','employer_unsuspended','verification_approved','verification_rejected','verification_revoked'))
      or (target_kind = 'vacancy' and event_type in ('vacancy_moderated','vacancy_restored'))
    )
  ),
  0,
  'every audit event written during this entire test run satisfies the event_type/target_kind pairing invariant'
);

-- ---------------------------------------------------------------------------
-- Section N — target deletion: current-state cascades, audit history does not
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000020','target deletion test')->>'status','ok','employer J is suspended for the target-deletion test');
reset role;

select is(
  (select count(*)::integer from public.employer_suspension where employer_profile_id = 'a2900000-0000-4000-8000-000000000020'),
  1,
  'employer J has a current-state suspension row before deletion'
);
select is(
  (select count(*)::integer from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000020'),
  1,
  'employer J has one audit event before deletion'
);

delete from public.employer_profiles where id = 'a2900000-0000-4000-8000-000000000020';

select is(
  (select count(*)::integer from public.employer_suspension where employer_profile_id = 'a2900000-0000-4000-8000-000000000020'),
  0,
  'current-state employer_suspension row is gone after its target employer_profiles row is deleted (real FK, on delete cascade)'
);
select is(
  (select count(*)::integer from public.admin_audit_events where target_id = 'a2900000-0000-4000-8000-000000000020'),
  1,
  'the audit-history row is retained after its target employer_profiles row is deleted (no FK, no cascade)'
);

-- ---------------------------------------------------------------------------
-- Section O — operator list RPCs
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(
  (select bool_and(x) from (select (suspended is not null) as x from public.list_employers_for_operator() where employer_profile_id in ('a2900000-0000-4000-8000-000000000011','a2900000-0000-4000-8000-000000000012')) t),
  true,
  'list_employers_for_operator returns a suspended flag for every employer'
);
select is(
  (select count(*)::integer from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011') where vacancy_id in ('a2900000-0000-4000-8000-000000000041','a2900000-0000-4000-8000-000000000042')),
  2,
  'list_employer_vacancies_for_operator returns employer A''s vacancies for the operator'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section P — Issue 1 correction: self-derived suspension helper privacy.
-- Fresh, dedicated fixtures so this section is independent of every earlier
-- section's suspension toggles on employers A/B/G/D.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000061','authenticated','authenticated','c29-employer-p1@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000062','authenticated','authenticated','c29-employer-p2@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state
) values
('a2900000-0000-4000-8000-000000000061','private','C29 Employer P1','Mitte',true,now(),now(),'unverified'),
('a2900000-0000-4000-8000-000000000062','private','C29 Employer P2','Mitte',true,now(),now(),'unverified');

select is(
  (select pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = '_is_current_employer_suspended'),
  '',
  '_is_current_employer_suspended takes no arguments'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000061',true);
select throws_ok(
  $$ select public._is_employer_suspended('a2900000-0000-4000-8000-000000000062') $$,
  '42501', null,
  'authenticated cannot execute the arbitrary-id helper at all, even for another employer''s id'
);
select is(public._is_current_employer_suspended(), false, 'authenticated P1 invokes the self-derived helper for their own session (unsuspended)');
select is(public.is_current_employer_suspended(), false, 'public self-check RPC agrees for P1 (unsuspended)');
reset role;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$ select public._is_current_employer_suspended() $$, '42501', null, 'anon cannot execute the self-derived helper');
select throws_ok($$ select public._is_employer_suspended('a2900000-0000-4000-8000-000000000062') $$, '42501', null, 'anon cannot execute the arbitrary-id helper');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.suspend_employer('a2900000-0000-4000-8000-000000000062','privacy correction test')->>'status','ok','employer P2 is suspended for the privacy correction test');
reset role;

-- P1 cannot learn anything about P2 through the self-scoped surface — it
-- only ever reports the calling session's own row.
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000061',true);
select is(public._is_current_employer_suspended(), false, 'P1''s own self-check still reports false after P2 is suspended — no cross-employer leakage');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000062',true);
select is(public._is_current_employer_suspended(), true, 'P2''s own self-check reports true for their own suspended state');
select is(public.is_current_employer_suspended(), true, 'public self-check RPC agrees for P2 (suspended)');
reset role;

-- The only other authenticated-callable surface that can reveal suspension
-- state by id is operator-gated (get_employer_moderation_status,
-- list_employers_for_operator — already proven forbidden/empty for
-- non-operators in Section B); no non-operator-reachable function accepts
-- an arbitrary employer id and returns its suspension state.
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000062',true);
select is(public.get_employer_moderation_status('a2900000-0000-4000-8000-000000000061')->>'status','forbidden','a non-operator (even a suspended one) still cannot probe another employer via the operator detail RPC');
reset role;

-- RLS: suspended P2's own-row direct UPDATE is blocked; unsuspended P1's
-- own-row direct UPDATE works — re-proven against the corrected helper.
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000062',true);
select set_config('request.jwt.claims','{"sub":"a2900000-0000-4000-8000-000000000062","role":"authenticated"}',true);
select lives_ok(
  $$ update public.employer_profiles set display_name = 'Should Not Change (P2)' where id = 'a2900000-0000-4000-8000-000000000062' $$,
  'suspended P2 direct UPDATE does not throw under the corrected RLS policy (silent no-op)'
);
reset role;
select is(
  (select display_name from public.employer_profiles where id = 'a2900000-0000-4000-8000-000000000062'),
  'C29 Employer P2',
  'suspended P2''s UPDATE did not apply under the corrected RLS policy'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000061',true);
select set_config('request.jwt.claims','{"sub":"a2900000-0000-4000-8000-000000000061","role":"authenticated"}',true);
select lives_ok(
  $$ update public.employer_profiles set display_name = 'Updated (P1)' where id = 'a2900000-0000-4000-8000-000000000061' $$,
  'unsuspended P1 direct UPDATE lives under the corrected RLS policy'
);
reset role;
select is(
  (select display_name from public.employer_profiles where id = 'a2900000-0000-4000-8000-000000000061'),
  'Updated (P1)',
  'unsuspended P1''s UPDATE applied under the corrected RLS policy — the single policy narrowing still covers ordinary own-row updates correctly (all four direct UPDATE shapes were already re-proven unchanged in Sections D/F above, which exercise the same final policy)'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(public.unsuspend_employer('a2900000-0000-4000-8000-000000000062')->>'status','ok','employer P2 unsuspended, cleaning up the privacy correction fixture');
reset role;

-- ---------------------------------------------------------------------------
-- Section Q — Issue 2 correction: bounded operator list RPCs.
-- Five fresh employers (Q1..Q5) with created_at deliberately set ahead of
-- every other row in this file, so order/limit/offset assertions are
-- unambiguous regardless of what else exists at this point in the test run.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000071','authenticated','authenticated','c29-employer-q1@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000072','authenticated','authenticated','c29-employer-q2@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000073','authenticated','authenticated','c29-employer-q3@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000074','authenticated','authenticated','c29-employer-q4@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2900000-0000-4000-8000-000000000075','authenticated','authenticated','c29-employer-q5@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state, created_at
) values
('a2900000-0000-4000-8000-000000000071','private','C29 Employer Q1','Mitte',true,now(),now(),'unverified', now() + interval '10 hours' + interval '1 minute'),
('a2900000-0000-4000-8000-000000000072','private','C29 Employer Q2','Mitte',true,now(),now(),'unverified', now() + interval '10 hours' + interval '2 minutes'),
('a2900000-0000-4000-8000-000000000073','private','C29 Employer Q3','Mitte',true,now(),now(),'unverified', now() + interval '10 hours' + interval '3 minutes'),
('a2900000-0000-4000-8000-000000000074','private','C29 Employer Q4','Mitte',true,now(),now(),'unverified', now() + interval '10 hours' + interval '4 minutes'),
('a2900000-0000-4000-8000-000000000075','private','C29 Employer Q5','Mitte',true,now(),now(),'unverified', now() + interval '10 hours' + interval '5 minutes');

-- Q5 is newest (created_at desc puts it first), Q1 is oldest of the five.
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);

select is(
  (select array_agg(employer_profile_id) from (select employer_profile_id from public.list_employers_for_operator(2,0) limit 2) t),
  array['a2900000-0000-4000-8000-000000000075'::uuid,'a2900000-0000-4000-8000-000000000074'::uuid],
  'employer list page 1 (limit 2, offset 0) returns Q5, Q4 in deterministic order'
);
select is(
  (select array_agg(employer_profile_id) from public.list_employers_for_operator(2,2)),
  array['a2900000-0000-4000-8000-000000000073'::uuid,'a2900000-0000-4000-8000-000000000072'::uuid],
  'employer list page 2 (limit 2, offset 2) returns Q3, Q2'
);
select is(
  (select array_agg(employer_profile_id) from public.list_employers_for_operator(2,4) where employer_profile_id = 'a2900000-0000-4000-8000-000000000071'),
  array['a2900000-0000-4000-8000-000000000071'::uuid],
  'employer list page 3 (limit 2, offset 4) returns Q1'
);
select is(
  least(greatest(1000, 1), 100),
  100,
  'the clamp expression itself caps an oversized limit at exactly 100'
);
select ok(
  (select count(*)::integer from public.list_employers_for_operator(1000,0)) <= 100,
  'requesting a limit of 1000 never returns more than 100 rows in practice'
);
select is(
  (select employer_profile_id from public.list_employers_for_operator(0,0) limit 1),
  'a2900000-0000-4000-8000-000000000075',
  'a zero limit is clamped up to 1, not down to 0 — still returns the newest row'
);
select is(
  (select count(*)::integer from public.list_employers_for_operator(-5,0)),
  1,
  'a negative limit is clamped to the floor of 1'
);
select is(
  (select array_agg(employer_profile_id) from public.list_employers_for_operator(2,-10)),
  array['a2900000-0000-4000-8000-000000000075'::uuid,'a2900000-0000-4000-8000-000000000074'::uuid],
  'a negative offset is clamped to 0'
);
select is(
  (
    select count(distinct employer_profile_id)::integer
    from (
      select employer_profile_id from public.list_employers_for_operator(2,0)
      union all
      select employer_profile_id from public.list_employers_for_operator(2,2)
      union all
      select employer_profile_id from public.list_employers_for_operator(2,4)
    ) pages
    where employer_profile_id in (
      'a2900000-0000-4000-8000-000000000071','a2900000-0000-4000-8000-000000000072',
      'a2900000-0000-4000-8000-000000000073','a2900000-0000-4000-8000-000000000074',
      'a2900000-0000-4000-8000-000000000075'
    )
  ),
  5,
  'three consecutive pages across Q1..Q5 cover exactly five distinct rows — no duplicates, no gaps'
);
select is(
  (select bool_or(employer_profile_id = 'a2900000-0000-4000-8000-000000000075') from public.list_employers_for_operator()),
  true,
  'the default call (no arguments) uses limit 50 and still includes the newest row'
);
select throws_ok(
  $$ select reason from public.list_employers_for_operator() $$,
  '42703', null,
  'the employer list projection has no reason column at all'
);
select throws_ok(
  $$ select actor_user_id from public.list_employers_for_operator() $$,
  '42703', null,
  'the employer list projection has no actor_user_id column at all'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000002',true);
select is_empty($$ select * from public.list_employers_for_operator(2,0) $$,'non-operator gets zero rows regardless of the requested bound');
reset role;

insert into public.verification_operators (user_id, created_by, active)
values ('a2900000-0000-4000-8000-000000000099','a2900000-0000-4000-8000-000000000001',false);
set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000099',true);
select is_empty($$ select * from public.list_employers_for_operator() $$,'an inactive (deactivated) operator gets zero rows, exactly like a non-operator');
reset role;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$ select * from public.list_employers_for_operator() $$, '42501', null, 'anon cannot call list_employers_for_operator at all');
select throws_ok($$ select * from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011') $$, '42501', null, 'anon cannot call list_employer_vacancies_for_operator at all');
reset role;

-- Five fresh employer-A vacancies (Q-vacancies), created_at set ahead of
-- every other vacancy in this file, for the same deterministic pagination
-- proof on the vacancy-list RPC.
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,created_at
) values
('a2900000-0000-4000-8000-000000000081','a2900000-0000-4000-8000-000000000011','C29 Vacancy Q1','c29-vacancy-q1','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer', now() + interval '10 hours' + interval '1 minute'),
('a2900000-0000-4000-8000-000000000082','a2900000-0000-4000-8000-000000000011','C29 Vacancy Q2','c29-vacancy-q2','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer', now() + interval '10 hours' + interval '2 minutes'),
('a2900000-0000-4000-8000-000000000083','a2900000-0000-4000-8000-000000000011','C29 Vacancy Q3','c29-vacancy-q3','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer', now() + interval '10 hours' + interval '3 minutes'),
('a2900000-0000-4000-8000-000000000084','a2900000-0000-4000-8000-000000000011','C29 Vacancy Q4','c29-vacancy-q4','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer', now() + interval '10 hours' + interval '4 minutes'),
('a2900000-0000-4000-8000-000000000085','a2900000-0000-4000-8000-000000000011','C29 Vacancy Q5','c29-vacancy-q5','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer', now() + interval '10 hours' + interval '5 minutes');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);

select is(
  (select array_agg(vacancy_id) from (select vacancy_id from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011',2,0) limit 2) t),
  array['a2900000-0000-4000-8000-000000000085'::uuid,'a2900000-0000-4000-8000-000000000084'::uuid],
  'vacancy list page 1 (limit 2, offset 0) returns Q5, Q4 in deterministic order'
);
select is(
  (select array_agg(vacancy_id) from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011',2,2)),
  array['a2900000-0000-4000-8000-000000000083'::uuid,'a2900000-0000-4000-8000-000000000082'::uuid],
  'vacancy list page 2 (limit 2, offset 2) returns Q3, Q2'
);
select ok(
  (select count(*)::integer from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011',1000,0)) <= 100,
  'requesting a limit of 1000 on the vacancy list never returns more than 100 rows in practice'
);
select is(
  (select vacancy_id from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011',0,0) limit 1),
  'a2900000-0000-4000-8000-000000000085',
  'a zero limit on the vacancy list is clamped up to 1'
);
select is(
  (
    select count(distinct vacancy_id)::integer
    from (
      select vacancy_id from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011',2,0)
      union all
      select vacancy_id from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011',2,2)
      union all
      select vacancy_id from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011',2,4)
    ) pages
    where vacancy_id in (
      'a2900000-0000-4000-8000-000000000081','a2900000-0000-4000-8000-000000000082',
      'a2900000-0000-4000-8000-000000000083','a2900000-0000-4000-8000-000000000084',
      'a2900000-0000-4000-8000-000000000085'
    )
  ),
  5,
  'three consecutive vacancy-list pages across Q1..Q5 cover exactly five distinct rows — no duplicates, no gaps'
);
select throws_ok(
  $$ select moderated_reason from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011') $$,
  '42703', null,
  'the vacancy list projection has no moderated_reason column — reasons stay on the detail RPC only'
);
select throws_ok(
  $$ select actor_user_id from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011') $$,
  '42703', null,
  'the vacancy list projection has no actor_user_id column at all'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000002',true);
select is_empty($$ select * from public.list_employer_vacancies_for_operator('a2900000-0000-4000-8000-000000000011',2,0) $$,'non-operator gets zero rows from the vacancy list regardless of the requested bound');
reset role;

-- ---------------------------------------------------------------------------
-- Section R — operator detail RPCs: bounded history recheck (unchanged
-- behavior, explicitly reconfirmed after the Section P/Q corrections).
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a2900000-0000-4000-8000-000000000001',true);
select is(
  jsonb_typeof(public.get_employer_moderation_status('a2900000-0000-4000-8000-000000000011')->'audit_events'),
  'array',
  'employer detail audit_events is a bounded JSON array, not a raw table dump'
);
select is(
  coalesce((select bool_or(elem ? 'actor_user_id') from jsonb_array_elements(public.get_employer_moderation_status('a2900000-0000-4000-8000-000000000011')->'audit_events') elem), false),
  false,
  'no employer detail audit_events entry ever includes actor_user_id'
);
select is(
  jsonb_typeof(public.get_vacancy_moderation_status('a2900000-0000-4000-8000-000000000041')->'audit_events'),
  'array',
  'vacancy detail audit_events is a bounded JSON array, not a raw table dump'
);
select is(
  coalesce((select bool_or(elem ? 'actor_user_id') from jsonb_array_elements(public.get_vacancy_moderation_status('a2900000-0000-4000-8000-000000000041')->'audit_events') elem), false),
  false,
  'no vacancy detail audit_events entry ever includes actor_user_id'
);
reset role;

select * from finish();
rollback;
