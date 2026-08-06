begin;

create extension if not exists pgtap with schema extensions;

select plan(80);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','c5c00000-0000-4000-8000-000000000001','authenticated','authenticated','c27-employer-verified@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c5c00000-0000-4000-8000-000000000002','authenticated','authenticated','c27-candidate-complete@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c5c00000-0000-4000-8000-000000000003','authenticated','authenticated','c27-candidate-incomplete@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c5c00000-0000-4000-8000-000000000004','authenticated','authenticated','c27-no-profile@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c5c00000-0000-4000-8000-000000000005','authenticated','authenticated','c27-employer-unverified@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c5c00000-0000-4000-8000-000000000007','authenticated','authenticated','c27-employer-revoked@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c5c00000-0000-4000-8000-000000000008','authenticated','authenticated','c27-operator@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c5c00000-0000-4000-8000-000000000009','authenticated','authenticated','c27-candidate-flexible@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.verification_operators (user_id, created_by, active) values
('c5c00000-0000-4000-8000-000000000008','c5c00000-0000-4000-8000-000000000008', true);

-- Verified private employer (owns published vacancies for this file).
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values (
  'c5c00000-0000-4000-8000-000000000001','private','C27 Employer','Mitte',true,
  now(),now(),'verified',now(),now(),'c5c00000-0000-4000-8000-000000000001',now(),'v1'
);

-- Unverified employer (owns a published-looking vacancy that is never
-- effective-public because the employer itself is not verified).
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state
) values (
  'c5c00000-0000-4000-8000-000000000005','private','C27 Unverified Employer','Mitte',true,
  now(),now(),'unverified'
);

-- Pre-revoked employer (state set directly at insert — verification_state
-- is guarded against direct UPDATE outside the approve/reject/revoke RPCs
-- by a BEFORE UPDATE trigger, so a "start verified then revoke" fixture
-- must go through revoke_employer_verification() as an active operator,
-- exercised separately below; this fixture proves the static already-
-- revoked state instead).
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_review_reason, verification_attested_at, verification_attestation_version
) values (
  'c5c00000-0000-4000-8000-000000000007','private','C27 Revoked Employer','Mitte',true,
  now(),now(),'revoked',now(),now(),'c5c00000-0000-4000-8000-000000000008',
  'Trust concern (fixture)',now(),'v1'
);

-- Completed candidate: cleaning / part_time / daytime / basic German /
-- available today / speaks English conversationally. Deliberately matches
-- both the seed "cleaning" fixture (222204) and this file's V_ELIGIBLE
-- employer vacancy, to prove seed/employer parity directly.
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'c5c00000-0000-4000-8000-000000000002','C27 Candidate','basic',true,
  now(),'Berlin',30,(timezone('Europe/Berlin', now()))::date,
  array['cleaning'],array['part_time'],array['daytime'],now()
);
insert into public.candidate_languages (candidate_id,language_code,proficiency)
values ('c5c00000-0000-4000-8000-000000000002','en','conversational');

-- Incomplete candidate: essentials never completed.
insert into public.candidate_profiles (
  id,display_name,german_comfort,city,job_categories,employment_types,shift_preferences
) values (
  'c5c00000-0000-4000-8000-000000000003','C27 Incomplete','none','Berlin',
  array['cleaning'],array[]::text[],array[]::text[]
);

-- Completed candidate with a flexible shift preference — used to prove the
-- flexible short-circuit against a vacancy that requires a concrete shift
-- the candidate never explicitly listed.
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'c5c00000-0000-4000-8000-000000000009','C27 Flexible Candidate','basic',true,
  now(),'Berlin',30,(timezone('Europe/Berlin', now()))::date,
  array['cleaning'],array['part_time'],array['flexible'],now()
);

-- V_ELIGIBLE: exact-match employer vacancy (available_from null == flexible).
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000011','c5c00000-0000-4000-8000-000000000001',
  'C27 Eligible Vacancy','c27-eligible-vacancy','summary','description','Berlin','Mitte',
  'cleaning',array['part_time'],array['daytime'],'basic','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

-- V_CATEGORY_MISMATCH
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000012','c5c00000-0000-4000-8000-000000000001',
  'C27 Category Mismatch','c27-category-mismatch','summary','description','Berlin','Mitte',
  'retail',array['part_time'],array['daytime'],'basic','shop','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

-- V_EMPLOYMENT_MISMATCH
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000013','c5c00000-0000-4000-8000-000000000001',
  'C27 Employment Mismatch','c27-employment-mismatch','summary','description','Berlin','Mitte',
  'cleaning',array['full_time'],array['daytime'],'basic','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

-- V_SHIFT_MISMATCH
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000014','c5c00000-0000-4000-8000-000000000001',
  'C27 Shift Mismatch','c27-shift-mismatch','summary','description','Berlin','Mitte',
  'cleaning',array['part_time'],array['night'],'basic','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

-- V_GERMAN_MISMATCH
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000015','c5c00000-0000-4000-8000-000000000001',
  'C27 German Mismatch','c27-german-mismatch','summary','description','Berlin','Mitte',
  'cleaning',array['part_time'],array['daytime'],'comfortable','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

-- V_LANGUAGE_MISMATCH: requires English at proficient; candidate only has conversational.
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000016','c5c00000-0000-4000-8000-000000000001',
  'C27 Language Mismatch','c27-language-mismatch','summary','description','Berlin','Mitte',
  'cleaning',array['part_time'],array['daytime'],'basic','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);
insert into public.vacancy_language_requirements (vacancy_id,language_code,min_proficiency)
values ('c5c00000-0000-4000-8000-000000000016','en','proficient');

-- V_LANGUAGE_MATCH: requires English at basic; candidate has conversational (>= basic).
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000017','c5c00000-0000-4000-8000-000000000001',
  'C27 Language Match','c27-language-match','summary','description','Berlin','Mitte',
  'cleaning',array['part_time'],array['daytime'],'basic','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);
insert into public.vacancy_language_requirements (vacancy_id,language_code,min_proficiency)
values ('c5c00000-0000-4000-8000-000000000017','en','basic');

-- V_AVAILABILITY_MISMATCH: the vacancy needed someone available a month ago;
-- the candidate is only available from today, i.e. candidate.available_from
-- (today) > vacancy.available_from (a month ago) — a genuine mismatch. (A
-- vacancy needing a FUTURE start date, by contrast, is always satisfiable by
-- a candidate available today — that is the flexible/fixed-start "eligible"
-- case exercised by V_ELIGIBLE and the seed-parity fixture below.)
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at,available_from
) values (
  'c5c00000-0000-4000-8000-000000000018','c5c00000-0000-4000-8000-000000000001',
  'C27 Availability Mismatch','c27-availability-mismatch','summary','description','Berlin','Mitte',
  'cleaning',array['part_time'],array['daytime'],'basic','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days',
  (timezone('Europe/Berlin', now()))::date - interval '30 days'
);

-- V_MULTI_MISSING: category and German both fail simultaneously.
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000019','c5c00000-0000-4000-8000-000000000001',
  'C27 Multi Missing','c27-multi-missing','summary','description','Berlin','Mitte',
  'logistics',array['part_time'],array['daytime'],'comfortable','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

-- V_FLEXIBLE_SHIFT_CANDIDATE target: vacancy needs 'night' only; a
-- flexible-shift candidate should still match via the flexible short-circuit.
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000020','c5c00000-0000-4000-8000-000000000001',
  'C27 Night Shift Only','c27-night-shift-only','summary','description','Berlin','Mitte',
  'cleaning',array['part_time'],array['night'],'basic','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

-- V_UNVERIFIED_EMPLOYER: published-looking row owned by the unverified employer.
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000021','c5c00000-0000-4000-8000-000000000005',
  'C27 Unverified Owner','c27-unverified-owner','summary','description','Berlin','Mitte',
  'cleaning',array['part_time'],array['daytime'],'basic','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

-- V_REVOKED_EMPLOYER: published-looking row owned by the pre-revoked employer.
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000024','c5c00000-0000-4000-8000-000000000007',
  'C27 Revoked Owner','c27-revoked-owner','summary','description','Berlin','Mitte',
  'cleaning',array['part_time'],array['daytime'],'basic','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

-- V_LIFECYCLE: mutated across the effective-public exclusion section below.
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000022','c5c00000-0000-4000-8000-000000000001',
  'C27 Lifecycle Vacancy','c27-lifecycle-vacancy','summary','description','Berlin','Mitte',
  'cleaning',array['part_time'],array['daytime'],'basic','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

-- Seed fixture reused directly (from supabase/seeds/01_demo_vacancies.sql):
-- cleaning / mini_job+part_time / daytime / german none / available_from null.
-- 'seed-cleaning-vacancy-id' is bound below via a scalar subselect so this
-- file never hardcodes a value that could drift if the seed fixture changes.

-- ---------------------------------------------------------------------------
-- Group A — privileges and signatures
-- ---------------------------------------------------------------------------

select has_function(
  'public', '_evaluate_candidate_vacancy_eligibility',
  array['uuid','uuid','timestamptz'],
  'internal evaluator exists with the expected signature'
);
select has_function(
  'public', 'resolve_current_candidate_vacancy_match', array['uuid'],
  'detail RPC exists accepting exactly one uuid argument'
);
select has_function(
  'public', 'list_current_candidate_vacancy_matches', array[]::text[],
  'list RPC exists accepting no arguments'
);

set local role authenticated;
select throws_ok(
  $$ select public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000002'::uuid, 'c5c00000-0000-4000-8000-000000000011'::uuid, now()) $$,
  '42501', null,
  'internal evaluator is not directly callable by authenticated (denied by privilege, not logic)'
);
reset role;

set local role anon;
select throws_ok(
  $$ select public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000002'::uuid, 'c5c00000-0000-4000-8000-000000000011'::uuid, now()) $$,
  '42501', null,
  'internal evaluator is not directly callable by anon (denied by privilege, not logic)'
);
reset role;

set local role anon;
select throws_ok(
  $$ select public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000011') $$,
  '42501', null,
  'detail RPC denies anon by privilege'
);
select throws_ok(
  $$ select public.list_current_candidate_vacancy_matches() $$,
  '42501', null,
  'list RPC denies anon by privilege'
);
reset role;

select ok(
  has_function_privilege('authenticated', 'public.resolve_current_candidate_vacancy_match(uuid)', 'execute'),
  'detail RPC is executable by authenticated'
);
select ok(
  has_function_privilege('authenticated', 'public.list_current_candidate_vacancy_matches()', 'execute'),
  'list RPC is executable by authenticated'
);
select ok(
  not has_function_privilege('anon', 'public.resolve_current_candidate_vacancy_match(uuid)', 'execute'),
  'detail RPC ACL confirms no anon grant'
);
select ok(
  not has_function_privilege('anon', 'public.list_current_candidate_vacancy_matches()', 'execute'),
  'list RPC ACL confirms no anon grant'
);
select ok(
  not has_function_privilege('authenticated', 'public._evaluate_candidate_vacancy_eligibility(uuid,uuid,timestamptz)', 'execute'),
  'internal evaluator ACL confirms no authenticated grant'
);
select ok(
  not has_function_privilege('anon', 'public._evaluate_candidate_vacancy_eligibility(uuid,uuid,timestamptz)', 'execute'),
  'internal evaluator ACL confirms no anon grant'
);
select ok(
  has_function_privilege('authenticated', 'public.submit_candidate_application(uuid)', 'execute'),
  'submit_candidate_application remains executable by authenticated'
);
select ok(
  not has_function_privilege('anon', 'public.submit_candidate_application(uuid)', 'execute'),
  'submit_candidate_application remains denied to anon'
);

select is(
  (select prosecdef from pg_proc where oid = 'public._evaluate_candidate_vacancy_eligibility(uuid,uuid,timestamptz)'::regprocedure),
  true, 'internal evaluator is SECURITY DEFINER'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.resolve_current_candidate_vacancy_match(uuid)'::regprocedure),
  true, 'detail RPC is SECURITY DEFINER'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.list_current_candidate_vacancy_matches()'::regprocedure),
  true, 'list RPC is SECURITY DEFINER'
);
select is(
  (select proconfig from pg_proc where oid = 'public._evaluate_candidate_vacancy_eligibility(uuid,uuid,timestamptz)'::regprocedure),
  array['search_path=pg_catalog, public'],
  'internal evaluator has a fixed search_path'
);
select is(
  (select proconfig from pg_proc where oid = 'public.resolve_current_candidate_vacancy_match(uuid)'::regprocedure),
  array['search_path=pg_catalog, public'],
  'detail RPC has a fixed search_path'
);
select is(
  (select proconfig from pg_proc where oid = 'public.list_current_candidate_vacancy_matches()'::regprocedure),
  array['search_path=pg_catalog, public'],
  'list RPC has a fixed search_path'
);

-- No caller-controlled candidate identity or evaluation timestamp on either
-- public RPC — both accept exactly the arguments their signatures declare.
select is(
  (select pronargs::integer from pg_proc where oid = 'public.resolve_current_candidate_vacancy_match(uuid)'::regprocedure),
  1, 'detail RPC accepts exactly one argument (vacancy id only)'
);
select is(
  (select pronargs::integer from pg_proc where oid = 'public.list_current_candidate_vacancy_matches()'::regprocedure),
  0, 'list RPC accepts no arguments'
);

-- ---------------------------------------------------------------------------
-- Group B — candidate identity handling (detail RPC)
-- ---------------------------------------------------------------------------

-- No authenticated session at all (defensive; anon already denied above by
-- privilege — this proves the function body's own null-uid branch too via a
-- superuser call with no JWT claim set).
select is(
  (select status from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000011')),
  'unavailable', 'no session identity resolves to unavailable, not an error'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000004',true);
select is(
  (select status from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000011')),
  'incomplete', 'authenticated user with no candidate_profiles row is incomplete'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000003',true);
select is(
  (select status from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000011')),
  'incomplete', 'candidate with onboarding_completed_at null is incomplete'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000001',true);
select is(
  (select status from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000011')),
  'incomplete', 'employer-only user (no candidate_profiles row) is incomplete, not eligible'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000002',true);
select is(
  (select status from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000011')),
  'eligible', 'completed candidate on an eligible vacancy resolves to eligible'
);
reset role;

-- ---------------------------------------------------------------------------
-- Group C — effective-public exclusion (identical for the eligibility
-- contract as for the PR 5.5a public read contract; reuses the same
-- is_vacancy_effectively_public gate).
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000002',true);

select is(
  (select status from public.resolve_current_candidate_vacancy_match('99999999-9999-4999-8999-999999999999')),
  'unavailable', 'unknown vacancy id resolves to unavailable, not an error'
);
select is(
  (select status from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000021')),
  'unavailable', 'vacancy owned by an unverified employer is unavailable'
);
reset role;

update public.vacancies set publication_state = 'draft', published_at = null, expires_at = null
  where id = 'c5c00000-0000-4000-8000-000000000022';
set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000002',true);
select is(
  (select status from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000022')),
  'unavailable', 'draft vacancy is unavailable'
);
reset role;

update public.vacancies set publication_state = 'paused', published_at = now() - interval '1 day', expires_at = now() + interval '30 days', paused_at = now()
  where id = 'c5c00000-0000-4000-8000-000000000022';
set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000002',true);
select is(
  (select status from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000022')),
  'unavailable', 'paused vacancy is unavailable'
);
reset role;

update public.vacancies set publication_state = 'filled', paused_at = null, filled_at = now()
  where id = 'c5c00000-0000-4000-8000-000000000022';
set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000002',true);
select is(
  (select status from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000022')),
  'unavailable', 'filled vacancy is unavailable'
);
reset role;

update public.vacancies set publication_state = 'published', filled_at = null, expires_at = now() - interval '1 minute'
  where id = 'c5c00000-0000-4000-8000-000000000022';
set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000002',true);
select is(
  (select status from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000022')),
  'unavailable', 'effectively expired (elapsed, unmaterialized) vacancy is unavailable'
);
reset role;

update public.vacancies set publication_state = 'withdrawn', expires_at = now() + interval '30 days', withdrawn_at = now()
  where id = 'c5c00000-0000-4000-8000-000000000022';
set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000002',true);
select is(
  (select status from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000022')),
  'unavailable', 'withdrawn vacancy is unavailable'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000002',true);
select is(
  (select status from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000024')),
  'unavailable', 'revoked-employer vacancy is unavailable'
);
reset role;

-- ---------------------------------------------------------------------------
-- Group D — matching rules (internal evaluator, direct calls under a
-- superuser session so failures are attributable to rule logic, not RLS)
-- ---------------------------------------------------------------------------

select results_eq(
  $$ select eligible, missing_requirements from public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000002','c5c00000-0000-4000-8000-000000000011', now()) $$,
  $$ values (true, '{}'::text[]) $$,
  'exact-match employer vacancy is eligible with zero missing requirements'
);

select results_eq(
  $$ select eligible, missing_requirements from public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000002','c5c00000-0000-4000-8000-000000000012', now()) $$,
  $$ values (false, array['category']::text[]) $$,
  'category rule: mismatch produces exactly the category code'
);

select results_eq(
  $$ select eligible, missing_requirements from public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000002','c5c00000-0000-4000-8000-000000000013', now()) $$,
  $$ values (false, array['employment_type']::text[]) $$,
  'employment_type rule: no intersection produces exactly the employment_type code'
);

select results_eq(
  $$ select eligible, missing_requirements from public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000002','c5c00000-0000-4000-8000-000000000014', now()) $$,
  $$ values (false, array['shift']::text[]) $$,
  'shift rule: no concrete intersection produces exactly the shift code'
);

select results_eq(
  $$ select eligible, missing_requirements from public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000009','c5c00000-0000-4000-8000-000000000020', now()) $$,
  $$ values (true, '{}'::text[]) $$,
  'shift rule: candidate flexible preference short-circuits a night-only vacancy to eligible'
);

select results_eq(
  $$ select eligible, missing_requirements from public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000002','c5c00000-0000-4000-8000-000000000015', now()) $$,
  $$ values (false, array['german']::text[]) $$,
  'german rule: candidate rank below requirement rank produces exactly the german code'
);

select results_eq(
  $$ select eligible, missing_requirements from public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000002','c5c00000-0000-4000-8000-000000000016', now()) $$,
  $$ values (false, array['language']::text[]) $$,
  'language rule: required proficiency above candidate proficiency produces exactly the language code'
);

select results_eq(
  $$ select eligible, missing_requirements from public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000002','c5c00000-0000-4000-8000-000000000017', now()) $$,
  $$ values (true, '{}'::text[]) $$,
  'language rule: candidate proficiency at or above the requirement is eligible'
);

select results_eq(
  $$ select eligible, missing_requirements from public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000002','c5c00000-0000-4000-8000-000000000018', now()) $$,
  $$ values (false, array['availability']::text[]) $$,
  'availability rule: candidate available after the vacancy start date produces exactly the availability code'
);

select results_eq(
  $$ select eligible, missing_requirements from public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000002','c5c00000-0000-4000-8000-000000000019', now()) $$,
  $$ values (false, array['category','german']::text[]) $$,
  'multiple simultaneous rule failures are all reported, in fixed evaluation order'
);

-- Null/empty semantics: a candidate with empty employment_types/
-- shift_preferences arrays (still "complete" is impossible per the
-- completion gate, so this proves the evaluator itself, called directly,
-- never treats an empty array as an automatic pass — only the
-- language-requirements rule treats "zero rows" as satisfied, and that is
-- zero *vacancy* requirement rows, not an empty candidate array). This
-- fixture's job_categories still contains 'cleaning' (matches) and
-- german_comfort is 'none' (below the vacancy's 'basic' requirement), so
-- the expected failures are employment_type, shift, and german — not
-- category, proving category is evaluated on its own membership rule
-- rather than being incidentally swept up by the empty-array cases.
select results_eq(
  $$ select eligible, missing_requirements from public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000003','c5c00000-0000-4000-8000-000000000011', now()) $$,
  $$ values (false, array['employment_type','shift','german']::text[]) $$,
  'empty candidate preference arrays fail employment_type/shift; german also fails independently; category still matches'
);

-- Seed vacancy 222204 (cleaning / mini_job+part_time / daytime / german
-- none / available_from null / zero language requirements) evaluated
-- against the same candidate as the employer V_ELIGIBLE fixture: identical
-- outcome proves seed/employer parity, not a source-specific shortcut.
select results_eq(
  $$ select eligible, missing_requirements from public._evaluate_candidate_vacancy_eligibility('c5c00000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222204', now()) $$,
  $$ values (true, '{}'::text[]) $$,
  'seed/employer parity: the equivalent seed vacancy is eligible with zero missing requirements'
);
select is(
  (select v.source from public.vacancies v where v.id = '22222222-2222-4222-8222-222222222204'),
  'seed', 'parity fixture is confirmed source=seed (not accidentally reused an employer row)'
);

-- ---------------------------------------------------------------------------
-- Group E — list RPC
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000002',true);

select ok(
  exists (
    select 1 from public.list_current_candidate_vacancy_matches()
    where vacancy_id = 'c5c00000-0000-4000-8000-000000000011'
  ),
  'list RPC includes the eligible employer vacancy'
);
select ok(
  not exists (
    select 1 from public.list_current_candidate_vacancy_matches()
    where vacancy_id = 'c5c00000-0000-4000-8000-000000000012'
  ),
  'list RPC excludes the category-mismatch vacancy'
);
select ok(
  exists (
    select 1 from public.list_current_candidate_vacancy_matches()
    where vacancy_id = '22222222-2222-4222-8222-222222222204'
  ),
  'list RPC includes the eligible seed vacancy (Demo labelling remains a UI concern via source)'
);
select ok(
  not exists (
    select 1 from public.list_current_candidate_vacancy_matches() where eligible is not true
  ),
  'every row the list RPC returns is eligible (hard-filter semantics, matching /candidate/matches)'
);
-- eligible/missing_requirements are retained on every row (not projected
-- away) for contract consistency with the detail RPC and future
-- extensibility (e.g. a later product decision to show ineligible rows
-- with reasons) — but for the current eligible-only filter, every returned
-- row's missing_requirements must be empty by construction
-- (eligible := cardinality(missing) = 0 in the evaluator itself).
select ok(
  not exists (
    select 1 from public.list_current_candidate_vacancy_matches()
    where cardinality(missing_requirements) <> 0
  ),
  'every row the list RPC returns has an empty missing_requirements array'
);

-- Deterministic ordering matches PR 5.5a: published_at desc, vacancy_id asc.
-- Compare the RPC's natural row order against the same rows explicitly
-- re-sorted; any positional mismatch means the RPC's own ORDER BY drifted.
select ok(
  not exists (
    select 1
    from (
      select vacancy_id, row_number() over () as rn
      from public.list_current_candidate_vacancy_matches()
    ) actual
    join (
      select vacancy_id, row_number() over (order by published_at desc, vacancy_id asc) as rn
      from public.list_current_candidate_vacancy_matches()
    ) expected using (rn)
    where actual.vacancy_id <> expected.vacancy_id
  ),
  'list RPC preserves published_at desc, vacancy_id asc ordering'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000003',true);
select is(
  (select count(*) from public.list_current_candidate_vacancy_matches()),
  0::bigint, 'incomplete candidate sees an empty list, not an error'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000001',true);
select is(
  (select count(*) from public.list_current_candidate_vacancy_matches()),
  0::bigint, 'employer-only user (no candidate profile) sees an empty list'
);
reset role;

-- No raw candidate data or private employer data in the list projection —
-- structural column check (exact OUT-column names and order), not a value
-- check (columns that would carry auth ids/emails/exact address simply do
-- not exist in this signature).
select is(
  (select proargnames from pg_proc where oid = 'public.list_current_candidate_vacancy_matches()'::regprocedure),
  array[
    'vacancy_id','title','description','job_category','public_locality',
    'workplace_type','work_frequency','cv_required','interview_english_ok',
    'source','employer_type','employer_display_name','company_name','website',
    'published_at','expires_at','eligible','missing_requirements'
  ],
  'list RPC returns exactly the approved public-projection + eligibility columns, no more'
);

-- ---------------------------------------------------------------------------
-- Group F — detail RPC field shape
-- ---------------------------------------------------------------------------

select is(
  (select proargnames from pg_proc where oid = 'public.resolve_current_candidate_vacancy_match(uuid)'::regprocedure),
  array['p_vacancy_id','status','eligible','missing_requirements'],
  'detail RPC returns exactly status/eligible/missing_requirements — no candidate profile fields'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000002',true);
select results_eq(
  $$ select status, eligible, missing_requirements from public.resolve_current_candidate_vacancy_match('c5c00000-0000-4000-8000-000000000019') $$,
  $$ values ('ineligible'::text, false, array['category','german']::text[]) $$,
  'detail RPC surfaces deterministic missing-requirement codes for an ineligible vacancy'
);
reset role;

-- ---------------------------------------------------------------------------
-- Group G — application transaction
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000002',true);

select is(
  (select public.submit_candidate_application('c5c00000-0000-4000-8000-000000000011')->>'result'),
  'submitted', 'eligible employer-vacancy application succeeds'
);
select is(
  (select public.submit_candidate_application('c5c00000-0000-4000-8000-000000000011')->>'result'),
  'already_applied', 'duplicate submission remains already_applied, not re-evaluated as ineligible'
);
select is(
  (select public.submit_candidate_application('22222222-2222-4222-8222-222222222204')->>'result'),
  'submitted', 'eligible seed-vacancy application succeeds (parity with employer path)'
);

select is(
  (select public.submit_candidate_application('c5c00000-0000-4000-8000-000000000012')->>'result'),
  'ineligible', 'category-ineligible application is rejected transactionally'
);
select is(
  (select jsonb_array_length(public.submit_candidate_application('c5c00000-0000-4000-8000-000000000012')->'missing_requirements')),
  1, 'category-ineligible rejection reports exactly one missing-requirement code'
);
select is(
  (select public.submit_candidate_application('c5c00000-0000-4000-8000-000000000013')->>'result'),
  'ineligible', 'employment-type-ineligible application is rejected transactionally'
);
select is(
  (select public.submit_candidate_application('c5c00000-0000-4000-8000-000000000014')->>'result'),
  'ineligible', 'shift-ineligible application is rejected transactionally'
);
select is(
  (select public.submit_candidate_application('c5c00000-0000-4000-8000-000000000015')->>'result'),
  'ineligible', 'german-ineligible application is rejected transactionally'
);
select is(
  (select public.submit_candidate_application('c5c00000-0000-4000-8000-000000000016')->>'result'),
  'ineligible', 'language-ineligible application is rejected transactionally'
);
select is(
  (select public.submit_candidate_application('c5c00000-0000-4000-8000-000000000018')->>'result'),
  'ineligible', 'availability-ineligible application is rejected transactionally'
);
select is(
  (select public.submit_candidate_application('c5c00000-0000-4000-8000-000000000019')->>'result'),
  'ineligible', 'multi-rule-ineligible application is rejected transactionally'
);

select is(
  (select count(*) from public.applications where vacancy_id in (
    'c5c00000-0000-4000-8000-000000000012','c5c00000-0000-4000-8000-000000000013',
    'c5c00000-0000-4000-8000-000000000014','c5c00000-0000-4000-8000-000000000015',
    'c5c00000-0000-4000-8000-000000000016','c5c00000-0000-4000-8000-000000000018',
    'c5c00000-0000-4000-8000-000000000019'
  )),
  0::bigint, 'no application row is inserted for any rejected ineligible attempt'
);
select is(
  (select count(*) from public.applications where vacancy_id = 'c5c00000-0000-4000-8000-000000000011'),
  1::bigint, 'the eligible application was inserted exactly once despite the duplicate retry'
);

reset role;

-- Incomplete candidate cannot submit at all (unchanged precondition).
set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000003',true);
select is(
  (select public.submit_candidate_application('c5c00000-0000-4000-8000-000000000011')->>'result'),
  'incomplete', 'incomplete candidate cannot submit (unchanged)'
);
reset role;

-- Stale-page race: vacancy is public when read, then paused before submit.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000','c5c00000-0000-4000-8000-000000000006','authenticated','authenticated','c27-stale@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''
);
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'c5c00000-0000-4000-8000-000000000006','C27 Stale Candidate','basic',true,
  now(),'Berlin',30,(timezone('Europe/Berlin', now()))::date,
  array['cleaning'],array['part_time'],array['daytime'],now()
);
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'c5c00000-0000-4000-8000-000000000023','c5c00000-0000-4000-8000-000000000001',
  'C27 Stale Race','c27-stale-race','summary','description','Berlin','Mitte',
  'cleaning',array['part_time'],array['daytime'],'basic','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);
select ok(
  public.is_vacancy_effectively_public('c5c00000-0000-4000-8000-000000000023', now()),
  'stale-race fixture is public when the page loads'
);
update public.vacancies set publication_state = 'paused', paused_at = now()
  where id = 'c5c00000-0000-4000-8000-000000000023';
set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000006',true);
select is(
  (select public.submit_candidate_application('c5c00000-0000-4000-8000-000000000023')->>'result'),
  'unavailable', 'submission after the vacancy is paused mid-session fails safely, ignoring stale client state'
);
reset role;

-- Verification revoked between page load and submit. Revocation goes
-- through the real revoke_employer_verification RPC as an active operator
-- (not a raw UPDATE — verification_state is guarded against direct writes
-- outside the approve/reject/revoke RPCs by a BEFORE UPDATE trigger). The
-- RPC itself atomically pauses all owned published vacancies (D-064); this
-- file only proves submit then rejects, not the pause mechanics themselves
-- (already covered by pgTAP file 24).
update public.vacancies set publication_state = 'published', paused_at = null
  where id = 'c5c00000-0000-4000-8000-000000000023';
select ok(
  public.is_vacancy_effectively_public('c5c00000-0000-4000-8000-000000000023', now()),
  'stale-race fixture is public again after republish (pause reverted for the next case)'
);
set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000008',true);
select is(
  (public.revoke_employer_verification('c5c00000-0000-4000-8000-000000000001', 'Trust concern for stale-race test')->>'status'),
  'ok', 'operator revocation succeeds against the stale-race fixture employer'
);
reset role;
select ok(
  not public.is_vacancy_effectively_public('c5c00000-0000-4000-8000-000000000023', now()),
  'stale-race vacancy is no longer effectively public once its employer is revoked'
);
set local role authenticated;
select set_config('request.jwt.claim.sub','c5c00000-0000-4000-8000-000000000006',true);
select is(
  (select public.submit_candidate_application('c5c00000-0000-4000-8000-000000000023')->>'result'),
  'unavailable', 'submission after employer verification is revoked fails safely'
);
reset role;

select * from finish();
rollback;
