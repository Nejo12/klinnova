begin;

create extension if not exists pgtap with schema extensions;

select plan(246);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

create temporary table deletion_test_ids (label text primary key, id uuid not null);
grant select, insert on deletion_test_ids to authenticated;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000001','authenticated','authenticated','c30-operator@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000002','authenticated','authenticated','c30-candidate-a@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000003','authenticated','authenticated','c30-candidate-b@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000005','authenticated','authenticated','c30-employer-x@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000011','authenticated','authenticated','c30-employer-a@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000012','authenticated','authenticated','c30-employer-b@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000013','authenticated','authenticated','c30-candidate-c@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000021','authenticated','authenticated','c30-dual@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000031','authenticated','authenticated','c30-candidate-d@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000032','authenticated','authenticated','c30-employer-c@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000041','authenticated','authenticated','c30-candidate-e@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000042','authenticated','authenticated','c30-employer-d@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000099','authenticated','authenticated','c30-throwaway@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000051','authenticated','authenticated','c30-candidate-f@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3000000-0000-4000-8000-000000000052','authenticated','authenticated','c30-active-g@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.verification_operators (user_id, created_by)
values ('a3000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001');

-- Employer X: owns the vacancy Candidate A applies to. Never itself deleted
-- in this file — proves candidate deletion never touches employer-side data.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values (
  'a3000000-0000-4000-8000-000000000005','private','C30 Employer X','Mitte',true,
  now(),now(),'verified',now(),now(),'a3000000-0000-4000-8000-000000000001',now(),'v1'
);

insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'a3000000-0000-4000-8000-000000000006','a3000000-0000-4000-8000-000000000005','C30 Vacancy X','c30-vacancy-x','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

-- Candidate A: full anonymization subject — profile, languages, one
-- application (to Employer X's vacancy) with a full status history.
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'a3000000-0000-4000-8000-000000000002','C30 Candidate A','basic',true,now(),
  'Berlin',30,(current_date + interval '7 days')::date,array['cleaning'],array['part_time'],array['daytime'],now()
);
insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('a3000000-0000-4000-8000-000000000002','en','basic');

insert into public.applications (
  id, candidate_id, vacancy_id, status, submitted_at, snapshot_version,
  candidate_snapshot, vacancy_snapshot, created_at, updated_at
) values (
  'a3000000-0000-4000-8000-0000000000a1',
  'a3000000-0000-4000-8000-000000000002',
  'a3000000-0000-4000-8000-000000000006',
  'reviewing',
  now() - interval '2 days',
  1,
  jsonb_build_object('display_name','C30 Candidate A','job_category','cleaning'),
  jsonb_build_object('vacancy_id','a3000000-0000-4000-8000-000000000006','title','C30 Vacancy X'),
  now() - interval '2 days',
  now() - interval '1 days'
);
insert into public.application_status_history (
  application_id, from_status, to_status, actor_user_id, actor_role, reason, occurred_at
) values
  ('a3000000-0000-4000-8000-0000000000a1', null, 'submitted', 'a3000000-0000-4000-8000-000000000002', 'candidate', null, now() - interval '2 days'),
  ('a3000000-0000-4000-8000-0000000000a1', 'submitted', 'reviewing', 'a3000000-0000-4000-8000-000000000005', 'employer', null, now() - interval '1 days');

-- Candidate B: unrelated control, never touched by anything in this file.
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'a3000000-0000-4000-8000-000000000003','C30 Candidate B','basic',true,now(),
  'Berlin',30,(current_date + interval '7 days')::date,array['cleaning'],array['part_time'],array['daytime'],now()
);

-- Candidate C: applies to Employer A's vacancy below. Never itself deleted —
-- proves candidate application/history survive employer deletion.
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'a3000000-0000-4000-8000-000000000013','C30 Candidate C','basic',true,now(),
  'Berlin',30,(current_date + interval '7 days')::date,array['cleaning'],array['part_time'],array['daytime'],now()
);

-- Employer A: full anonymization subject — organisation employer, owned
-- company, two vacancies (one with a candidate application), an
-- employer_suspension row, a vacancy_moderation row, and admin_audit_events
-- targeting both the employer and one of its vacancies.
insert into public.employer_profiles (
  id, employer_type, display_name, organisation_legal_name, berlin_locality,
  website, phone, lawful_hiring_declared, lawful_hiring_declared_at,
  onboarding_completed_at, verification_state, verification_requested_at,
  verification_reviewed_at, verification_reviewed_by, verification_attested_at,
  verification_attestation_version
) values (
  'a3000000-0000-4000-8000-000000000011','organisation','C30 Employer A','C30 Employer A GmbH','Mitte',
  'https://c30-employer-a.example.test','+49 30 1234567',true,now(),now(),'verified',
  now(),now(),'a3000000-0000-4000-8000-000000000001',now(),'v1'
);
insert into public.companies (id, name, slug, source, owner_employer_id)
values ('a3000000-0000-4000-8000-0000000000c1','C30 Employer A Company','c30-employer-a-company','employer','a3000000-0000-4000-8000-000000000011');

insert into public.vacancies (
  id,employer_profile_id,company_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values
  ('a3000000-0000-4000-8000-000000000015','a3000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-0000000000c1','C30 Vacancy A1','c30-vacancy-a1','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days');

insert into public.vacancies (
  id,employer_profile_id,company_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at,paused_at
) values
  ('a3000000-0000-4000-8000-000000000016','a3000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-0000000000c1','C30 Vacancy A2','c30-vacancy-a2','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'paused','employer',now()-interval '2 minutes',now()+interval '30 days',now()-interval '1 minute');

insert into public.applications (
  id, candidate_id, vacancy_id, status, submitted_at, snapshot_version,
  candidate_snapshot, vacancy_snapshot, created_at, updated_at
) values (
  'a3000000-0000-4000-8000-0000000000a2',
  'a3000000-0000-4000-8000-000000000013',
  'a3000000-0000-4000-8000-000000000015',
  'shortlisted',
  now() - interval '3 days',
  1,
  jsonb_build_object('display_name','C30 Candidate C','job_category','cleaning'),
  jsonb_build_object('vacancy_id','a3000000-0000-4000-8000-000000000015','title','C30 Vacancy A1'),
  now() - interval '3 days',
  now() - interval '1 days'
);
insert into public.application_status_history (
  application_id, from_status, to_status, actor_user_id, actor_role, reason, occurred_at
) values
  ('a3000000-0000-4000-8000-0000000000a2', null, 'submitted', 'a3000000-0000-4000-8000-000000000013', 'candidate', null, now() - interval '3 days'),
  ('a3000000-0000-4000-8000-0000000000a2', 'submitted', 'shortlisted', 'a3000000-0000-4000-8000-000000000011', 'employer', null, now() - interval '1 days');

insert into public.employer_suspension (employer_profile_id, suspended_by, suspended_reason)
values ('a3000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-000000000001','C30 test suspension reason mentioning the business');

insert into public.vacancy_moderation (vacancy_id, moderated_by, moderated_reason)
values ('a3000000-0000-4000-8000-000000000016','a3000000-0000-4000-8000-000000000001','C30 test moderation reason mentioning the business');

insert into public.admin_audit_events (event_type, target_kind, target_id, actor_user_id, reason)
values
  ('employer_suspended','employer','a3000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-000000000001','C30 employer target reason'),
  ('vacancy_moderated','vacancy','a3000000-0000-4000-8000-000000000016','a3000000-0000-4000-8000-000000000001','C30 vacancy target reason');

-- Employer B: unrelated control, never touched by anything in this file.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values (
  'a3000000-0000-4000-8000-000000000012','private','C30 Employer B','Mitte',true,
  now(),now(),'verified',now(),now(),'a3000000-0000-4000-8000-000000000001',now(),'v1'
);
insert into public.employer_suspension (employer_profile_id, suspended_by, suspended_reason)
values ('a3000000-0000-4000-8000-000000000012','a3000000-0000-4000-8000-000000000001','C30 unrelated suspension reason');
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source
) values (
  'a3000000-0000-4000-8000-000000000017','a3000000-0000-4000-8000-000000000012','C30 Vacancy B1','c30-vacancy-b1','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer'
);
insert into public.vacancy_moderation (vacancy_id, moderated_by, moderated_reason)
values ('a3000000-0000-4000-8000-000000000017','a3000000-0000-4000-8000-000000000001','C30 unrelated moderation reason');
insert into public.admin_audit_events (event_type, target_kind, target_id, actor_user_id, reason)
values ('employer_suspended','employer','a3000000-0000-4000-8000-000000000012','a3000000-0000-4000-8000-000000000001','C30 unrelated employer target reason');

-- Dual-capability user (D-047/D-085): both a candidate_profiles and an
-- employer_profiles row on the same auth identity.
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'a3000000-0000-4000-8000-000000000021','C30 Dual Candidate','basic',true,now(),
  'Berlin',30,(current_date + interval '7 days')::date,array['cleaning'],array['part_time'],array['daytime'],now()
);
insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('a3000000-0000-4000-8000-000000000021','de','conversational');
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state
) values (
  'a3000000-0000-4000-8000-000000000021','private','C30 Dual Employer','Mitte',true,now(),now(),'unverified'
);

-- Candidate D / Employer C: request/cancel/claim state-machine subjects,
-- kept separate from the anonymization subjects above so the two concerns
-- never interfere with each other's assertions.
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'a3000000-0000-4000-8000-000000000031','C30 Candidate D','basic',true,now(),
  'Berlin',30,(current_date + interval '7 days')::date,array['cleaning'],array['part_time'],array['daytime'],now()
);
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state
) values (
  'a3000000-0000-4000-8000-000000000032','private','C30 Employer C','Mitte',true,now(),now(),'unverified'
);

-- Candidate E / Employer D: stale-JWT-style DB gate proof subjects.
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'a3000000-0000-4000-8000-000000000041','C30 Candidate E','basic',true,now(),
  'Berlin',30,(current_date + interval '7 days')::date,array['cleaning'],array['part_time'],array['daytime'],now()
);
insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('a3000000-0000-4000-8000-000000000041','en','basic');
insert into public.applications (
  id, candidate_id, vacancy_id, status, submitted_at, snapshot_version,
  candidate_snapshot, vacancy_snapshot, created_at, updated_at
) values (
  'a3000000-0000-4000-8000-0000000000a4',
  'a3000000-0000-4000-8000-000000000041',
  'a3000000-0000-4000-8000-000000000006',
  'submitted',
  now() - interval '1 days',
  1,
  jsonb_build_object('display_name','C30 Candidate E','job_category','cleaning'),
  jsonb_build_object('vacancy_id','a3000000-0000-4000-8000-000000000006','title','C30 Vacancy X'),
  now() - interval '1 days',
  now() - interval '1 days'
);

insert into public.employer_profiles (
  id, employer_type, display_name, organisation_legal_name, berlin_locality,
  lawful_hiring_declared, lawful_hiring_declared_at, onboarding_completed_at,
  verification_state, verification_requested_at, verification_reviewed_at,
  verification_reviewed_by, verification_attested_at, verification_attestation_version
) values (
  'a3000000-0000-4000-8000-000000000042','organisation','C30 Employer D','C30 Employer D GmbH','Mitte',
  true,now(),now(),'verified',now(),now(),'a3000000-0000-4000-8000-000000000001',now(),'v1'
);
insert into public.companies (id, name, slug, source, owner_employer_id)
values ('a3000000-0000-4000-8000-0000000000c2','C30 Employer D Company','c30-employer-d-company','employer','a3000000-0000-4000-8000-000000000042');
insert into public.vacancies (
  id,employer_profile_id,company_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source
) values (
  'a3000000-0000-4000-8000-000000000018','a3000000-0000-4000-8000-000000000042','a3000000-0000-4000-8000-0000000000c2','C30 Vacancy D1','c30-vacancy-d1','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer'
);
insert into public.applications (
  id, candidate_id, vacancy_id, status, submitted_at, snapshot_version,
  candidate_snapshot, vacancy_snapshot, created_at, updated_at
) values (
  'a3000000-0000-4000-8000-0000000000a5',
  'a3000000-0000-4000-8000-000000000013',
  'a3000000-0000-4000-8000-000000000018',
  'submitted',
  now() - interval '1 days',
  1,
  jsonb_build_object('display_name','C30 Candidate C','job_category','cleaning'),
  jsonb_build_object('vacancy_id','a3000000-0000-4000-8000-000000000018','title','C30 Vacancy D1'),
  now() - interval '1 days',
  now() - interval '1 days'
);

-- Candidate F: dedicated D-087 fixture — an active (never anonymized)
-- candidate whose application to Employer X's vacancy exists solely to
-- prove the deleted-candidate transition-boundary check (Section D.2)
-- does not affect an unrelated, still-active candidate's application.
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'a3000000-0000-4000-8000-000000000051','C30 Candidate F','basic',true,now(),
  'Berlin',30,(current_date + interval '7 days')::date,array['cleaning'],array['part_time'],array['daytime'],now()
);

insert into public.applications (
  id, candidate_id, vacancy_id, status, submitted_at, snapshot_version,
  candidate_snapshot, vacancy_snapshot, created_at, updated_at
) values (
  'a3000000-0000-4000-8000-0000000000a6',
  'a3000000-0000-4000-8000-000000000051',
  'a3000000-0000-4000-8000-000000000006',
  'submitted',
  now() - interval '1 days',
  1,
  jsonb_build_object('display_name','C30 Candidate F','job_category','cleaning'),
  jsonb_build_object('vacancy_id','a3000000-0000-4000-8000-000000000006','title','C30 Vacancy X'),
  now() - interval '1 days',
  now() - interval '1 days'
);

-- Active G: a dedicated review-fix fixture — an auth identity with no
-- candidate_profiles or employer_profiles row of either kind and never
-- anonymized in this file. Proves the D-085 whole-account
-- resurrection-boundary check (Section F.1) is not a false positive: an
-- ordinary active account can still create a missing capability normally.

-- ---------------------------------------------------------------------------
-- Section A — schema
-- ---------------------------------------------------------------------------

select has_column('public','candidate_profiles','account_deleted_at','candidate_profiles.account_deleted_at exists');
select col_type_is('public','candidate_profiles','account_deleted_at','timestamp with time zone','candidate_profiles.account_deleted_at is timestamptz');
select col_is_null('public','candidate_profiles','account_deleted_at','candidate_profiles.account_deleted_at is nullable');

select has_column('public','employer_profiles','account_deleted_at','employer_profiles.account_deleted_at exists');
select col_type_is('public','employer_profiles','account_deleted_at','timestamp with time zone','employer_profiles.account_deleted_at is timestamptz');
select col_is_null('public','employer_profiles','account_deleted_at','employer_profiles.account_deleted_at is nullable');

select has_table('public','deletion_requests','deletion_requests table exists');
select has_column('public','deletion_requests','user_id','deletion_requests.user_id exists');
select col_not_null('public','deletion_requests','user_id','deletion_requests.user_id is NOT NULL');
select hasnt_column('public','deletion_requests','account_role','deletion_requests has no account_role column (D-085: user_id is the sole authoritative scope)');
select hasnt_column('public','deletion_requests','role','deletion_requests has no role column');

select is(
  (select count(*)::integer from pg_constraint where conname = 'deletion_requests_status_chk' and conrelid = 'public.deletion_requests'::regclass),
  1,
  'deletion_requests has a status enum CHECK constraint'
);

select throws_ok(
  $$ insert into public.deletion_requests (user_id, status) values ('a3000000-0000-4000-8000-000000000099','cancelled') $$,
  '23514', null,
  'deletion_requests rejects an unsupported status value (no cancelled status per D-081)'
);

select throws_ok(
  $$ insert into public.deletion_requests (user_id, status, auth_deleted_at) values ('a3000000-0000-4000-8000-000000000099','pending', now()) $$,
  '23514', null,
  'auth_deleted_at cannot be set without domain_scrubbed_at'
);

select throws_ok(
  $$ insert into public.deletion_requests (user_id, status, processing_started_at, completed_at) values ('a3000000-0000-4000-8000-000000000099','completed', now(), now()) $$,
  '23514', null,
  'completed status requires domain_scrubbed_at/auth_deleted_at evidence'
);

select throws_ok(
  $$ insert into public.deletion_requests (user_id, status) values ('a3000000-0000-4000-8000-000000000099','completed') $$,
  '23514', null,
  'completed status without completed_at is rejected'
);

select throws_ok(
  $$ insert into public.deletion_requests (user_id, status, processing_started_at) values ('a3000000-0000-4000-8000-000000000099','processing', null) $$,
  '23514', null,
  'a non-pending status without processing_started_at is rejected'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.deletion_requests'::regclass),
  true,
  'RLS enabled on deletion_requests'
);

select is_empty(
  $$ select privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='deletion_requests' and grantee in ('anon','authenticated') $$,
  'no anon/authenticated direct grant of any kind on deletion_requests'
);

select ok(
  has_function_privilege('authenticated','public.request_account_deletion()','execute'),
  'authenticated has EXECUTE on request_account_deletion (self-service)'
);

select is(
  (select count(*)::integer from pg_proc where proname='request_account_deletion' and pronamespace='public'::regnamespace and pronargs=0),
  1,
  'request_account_deletion takes zero arguments — target is always auth.uid(), never caller-supplied'
);

-- ---------------------------------------------------------------------------
-- Section B — self-service request/cancel RPCs
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000031',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000031","role":"authenticated"}',true);

select is(
  public.request_account_deletion() ->> 'status',
  'created',
  'candidate D can create a deletion request for themselves'
);

insert into deletion_test_ids (label, id)
select 'candidate-d-request', (public.request_account_deletion() ->> 'request_id')::uuid;

select is(
  public.request_account_deletion() ->> 'status',
  'existing_pending',
  'a duplicate request while pending returns the existing request, not a new row'
);

select is(
  (select (public.request_account_deletion() ->> 'request_id')::uuid),
  (select id from deletion_test_ids where label = 'candidate-d-request'),
  'the duplicate call returns the exact same request_id'
);

reset role;

select is(
  (select count(*)::integer from public.deletion_requests where user_id = 'a3000000-0000-4000-8000-000000000031'),
  1,
  'only one deletion_requests row exists for candidate D despite two request calls'
);

select throws_ok(
  format('insert into public.deletion_requests (user_id, status) values (%L, %L)', 'a3000000-0000-4000-8000-000000000031', 'pending'),
  '23505', null,
  'a raw second pending/processing row for the same user_id violates the active-request uniqueness index'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000032',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000032","role":"authenticated"}',true);

select is(
  public.request_account_deletion() ->> 'status',
  'created',
  'employer C can independently create their own deletion request'
);
insert into deletion_test_ids (label, id)
select 'employer-c-request', (public.request_account_deletion() ->> 'request_id')::uuid;

select isnt(
  (select id from deletion_test_ids where label='employer-c-request'),
  (select id from deletion_test_ids where label='candidate-d-request'),
  'employer C and candidate D each have their own distinct request row'
);

select is(
  public.cancel_account_deletion_request() ->> 'status',
  'cancelled',
  'employer C can cancel their own pending request'
);
select is(
  public.cancel_account_deletion_request() ->> 'status',
  'not_cancellable',
  'cancelling again with no pending request is a deterministic no-op, not an error'
);

reset role;

select is(
  (select count(*)::integer from public.deletion_requests where user_id = 'a3000000-0000-4000-8000-000000000032'),
  0,
  'cancellation deletes the pending row outright — no cancelled status is introduced'
);

-- Processing-state cancellation denial (PR 8.5 closure proof gap): employer
-- C creates a second, independent pending request (the first was fully
-- removed above, so the active-request uniqueness index does not block
-- this), it is claimed into processing by the privileged claim primitive,
-- and the SAME owning user then attempts ordinary self-service
-- cancellation. This proves cancel_account_deletion_request()'s own
-- `DELETE ... WHERE status = 'pending'` predicate denies cancellation once
-- processing has begun — no new status, no row mutation, no row deletion.
set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000032',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000032","role":"authenticated"}',true);

insert into deletion_test_ids (label, id)
select 'employer-c-processing-request', (public.request_account_deletion() ->> 'request_id')::uuid;

reset role;

select is(
  public._claim_deletion_request((select id from deletion_test_ids where label='employer-c-processing-request')) ->> 'status',
  'claimed',
  'employer C''s second request can be claimed into processing ahead of the cancellation-denial proof'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000032',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000032","role":"authenticated"}',true);

select is(
  public.cancel_account_deletion_request() ->> 'status',
  'not_cancellable',
  'employer C cannot cancel their own request through the ordinary self-service RPC once it has entered processing'
);

reset role;

select is(
  (select count(*)::integer from public.deletion_requests where id = (select id from deletion_test_ids where label='employer-c-processing-request')),
  1,
  'the processing request row is not deleted by the denied cancellation attempt'
);
select is(
  (select status from public.deletion_requests where id = (select id from deletion_test_ids where label='employer-c-processing-request')),
  'processing',
  'the processing request''s status is unchanged by the denied cancellation attempt — no fake cancelled status is introduced'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000099',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000099","role":"authenticated"}',true);
select is(
  public.request_account_deletion() ->> 'status',
  'unavailable',
  'a user with neither a candidate nor an employer profile cannot create a deletion request'
);
reset role;

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select throws_ok($$ select * from public.deletion_requests $$, '42501', null, 'anon cannot select deletion_requests');
select throws_ok($$ insert into public.deletion_requests (user_id, status) values ('a3000000-0000-4000-8000-000000000099','pending') $$, '42501', null, 'anon cannot insert deletion_requests');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000031',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000031","role":"authenticated"}',true);
select throws_ok($$ select * from public.deletion_requests $$, '42501', null, 'authenticated cannot select deletion_requests directly (no own-row policy — RPC-mediated only)');
select throws_ok(
  (select format('update public.deletion_requests set status = %L where id = %L', 'failed', id) from deletion_test_ids where label='candidate-d-request'),
  '42501', null,
  'authenticated cannot update deletion_requests directly'
);
select throws_ok(
  (select format('delete from public.deletion_requests where id = %L', id) from deletion_test_ids where label='candidate-d-request'),
  '42501', null,
  'authenticated cannot delete a processing/other-status deletion_requests row directly (cancellation is RPC-only, self-scoped, pending-only)'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section C — processor claim/evidence/failure primitives, authorization
-- boundary, and concurrency
-- ---------------------------------------------------------------------------

select is_empty(
  $$ select privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name in ('_claim_deletion_request','_process_deletion_domain_scrub','_record_deletion_auth_evidence','_record_deletion_failure','_anonymize_candidate_domain','_anonymize_employer_domain','_withdraw_vacancy_for_deletion') and grantee in ('anon','authenticated') $$,
  'no anon/authenticated EXECUTE on any processor-only or private domain-scrub function'
);

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select throws_ok($$ select public._claim_deletion_request('00000000-0000-0000-0000-000000000000') $$, '42501', null, 'anon cannot call _claim_deletion_request') ;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000031',true);
select throws_ok(
  (select format('select public._claim_deletion_request(%L)', id) from deletion_test_ids where label='candidate-d-request'),
  '42501', null,
  'authenticated (even the request owner) cannot call the processor-only claim function'
);
reset role;

select is(
  public._claim_deletion_request((select id from deletion_test_ids where label='candidate-d-request')) ->> 'status',
  'claimed',
  'a pending request can be claimed'
);
select is(
  (select status from public.deletion_requests where id = (select id from deletion_test_ids where label='candidate-d-request')),
  'processing',
  'claiming transitions pending to processing'
);
select is(
  public._claim_deletion_request((select id from deletion_test_ids where label='candidate-d-request')) ->> 'status',
  'no_op',
  'a second claim attempt on an already-processing request is a deterministic no-op'
);
select is(
  public._claim_deletion_request((select id from deletion_test_ids where label='candidate-d-request')) ->> 'current_status',
  'processing',
  'the no_op result reports the current status rather than erroring'
);

select is(
  public._process_deletion_domain_scrub((select id from deletion_test_ids where label='candidate-d-request')) ->> 'status',
  'scrubbed',
  'domain scrub succeeds for the claimed candidate D request'
);
select isnt(
  (select domain_scrubbed_at from public.deletion_requests where id = (select id from deletion_test_ids where label='candidate-d-request')),
  null,
  'domain_scrubbed_at evidence is recorded'
);
select is(
  public._process_deletion_domain_scrub((select id from deletion_test_ids where label='candidate-d-request')) ->> 'status',
  'already_scrubbed',
  're-running the domain scrub against an already-scrubbed request is idempotent, not an error'
);

select is(
  public._record_deletion_auth_evidence((select id from deletion_test_ids where label='candidate-d-request')) ->> 'status',
  'completed',
  'recording Auth evidence completes the request once domain_scrubbed_at exists'
);
select is(
  (select status from public.deletion_requests where id = (select id from deletion_test_ids where label='candidate-d-request')),
  'completed',
  'the request row is now completed'
);
select isnt(
  (select completed_at from public.deletion_requests where id = (select id from deletion_test_ids where label='candidate-d-request')),
  null,
  'completed_at evidence is recorded'
);
select is(
  public._record_deletion_auth_evidence((select id from deletion_test_ids where label='candidate-d-request')) ->> 'status',
  'completed',
  'calling the evidence/reconciliation function again on an already-completed request is idempotent — this is the reconciliation primitive reused, not a separate function'
);
select is(
  public._claim_deletion_request((select id from deletion_test_ids where label='candidate-d-request')) ->> 'status',
  'no_op',
  'a completed (terminal) request cannot be claimed again'
);

-- Failure path, using a fresh request from candidate E so it does not
-- interfere with the Section D stale-JWT-gate fixtures for that account.
set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000041',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000041","role":"authenticated"}',true);
insert into deletion_test_ids (label, id)
select 'candidate-e-request', (public.request_account_deletion() ->> 'request_id')::uuid;
reset role;

select public._claim_deletion_request((select id from deletion_test_ids where label='candidate-e-request'));
select is(
  public._record_deletion_failure((select id from deletion_test_ids where label='candidate-e-request'), 'auth_delete_failed') ->> 'status',
  'failed',
  'a processing request can be marked failed with a bounded failure code'
);
select is(
  (select failure_code from public.deletion_requests where id = (select id from deletion_test_ids where label='candidate-e-request')),
  'auth_delete_failed',
  'the exact bounded allow-listed failure code is persisted'
);
select is(
  public._record_deletion_failure((select id from deletion_test_ids where label='candidate-e-request'), 'x') ->> 'status',
  'no_op',
  'a failed (non-processing) request cannot be failed again'
);
select is(
  public._claim_deletion_request((select id from deletion_test_ids where label='candidate-e-request')) ->> 'status',
  'claimed',
  'a failed request can be re-claimed for retry (no separate retry function needed)'
);
select is(
  (select status from public.deletion_requests where id = (select id from deletion_test_ids where label='candidate-e-request')),
  'processing',
  'the retry claim transitions failed back to processing'
);

select is(
  public._claim_deletion_request('00000000-0000-0000-0000-000000000000') ->> 'status',
  'not_found',
  'claiming a nonexistent request id is a deterministic not_found, not an error'
);

-- ---------------------------------------------------------------------------
-- failure_code allow-list bounding (PR 8.2 review fix, D-081). A fresh,
-- disposable deletion_requests row for the throwaway identity, never
-- completed, used solely to prove _record_deletion_failure normalizes
-- against the fixed allow-list rather than persisting caller-supplied text
-- — both defensively inside the function and via the CHECK constraint.
-- ---------------------------------------------------------------------------

with inserted as (
  insert into public.deletion_requests (user_id, status)
  values ('a3000000-0000-4000-8000-000000000099', 'pending')
  returning id
)
insert into deletion_test_ids (label, id)
select 'throwaway-failure-code-request', id from inserted;

select public._claim_deletion_request((select id from deletion_test_ids where label='throwaway-failure-code-request'));

select is(
  public._record_deletion_failure((select id from deletion_test_ids where label='throwaway-failure-code-request'), 'AuthApiError: user foo@example.com not found in tenant abc-123') ->> 'status',
  'failed',
  'a raw-looking error string still transitions the request to failed — status transition is unconditional, only the stored code is bounded'
);
select is(
  (select failure_code from public.deletion_requests where id = (select id from deletion_test_ids where label='throwaway-failure-code-request')),
  'unknown',
  'a raw, non-allow-listed error string (containing an email address) is never persisted — it normalizes to the fixed generic code "unknown"'
);

select public._claim_deletion_request((select id from deletion_test_ids where label='throwaway-failure-code-request'));

select is(
  public._record_deletion_failure((select id from deletion_test_ids where label='throwaway-failure-code-request'), repeat('x', 5000)) ->> 'status',
  'failed',
  'an oversized failure-code input still transitions the request to failed'
);
select is(
  (select failure_code from public.deletion_requests where id = (select id from deletion_test_ids where label='throwaway-failure-code-request')),
  'unknown',
  'an oversized (5000-char) failure-code input is never persisted raw — it normalizes to "unknown"'
);
select is(
  (select char_length(failure_code) from public.deletion_requests where id = (select id from deletion_test_ids where label='throwaway-failure-code-request')),
  7,
  'the persisted failure_code length matches "unknown" exactly (7 chars) — no truncated fragment of the oversized input survived'
);

select public._claim_deletion_request((select id from deletion_test_ids where label='throwaway-failure-code-request'));

select is(
  public._record_deletion_failure((select id from deletion_test_ids where label='throwaway-failure-code-request'), 'domain_scrub_failed') ->> 'status',
  'failed',
  'an allow-listed failure code transitions the request to failed'
);
select is(
  (select failure_code from public.deletion_requests where id = (select id from deletion_test_ids where label='throwaway-failure-code-request')),
  'domain_scrub_failed',
  'the allow-listed failure code persists exactly, unmodified'
);

select throws_ok(
  $$ update public.deletion_requests set failure_code = 'raw_exception_text_that_is_not_allow_listed' where id = (select id from deletion_test_ids where label='throwaway-failure-code-request') $$,
  '23514', null,
  'the failure_code CHECK constraint itself rejects a non-allow-listed value at the SQL level — defense in depth beyond the function normalization'
);

-- Complete candidate E's and employer D's deletion through the real
-- request/claim/scrub/evidence pipeline (not a direct call to the private
-- anonymization helpers) — Section E reuses both as the stale-JWT-style
-- gate proof subjects, so their account_deleted_at must be set the same
-- way a real deletion would set it end to end.
select public._process_deletion_domain_scrub((select id from deletion_test_ids where label='candidate-e-request'));
select public._record_deletion_auth_evidence((select id from deletion_test_ids where label='candidate-e-request'));

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000042',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000042","role":"authenticated"}',true);
insert into deletion_test_ids (label, id)
select 'employer-d-request', (public.request_account_deletion() ->> 'request_id')::uuid;
reset role;
select public._claim_deletion_request((select id from deletion_test_ids where label='employer-d-request'));
select public._process_deletion_domain_scrub((select id from deletion_test_ids where label='employer-d-request'));
select public._record_deletion_auth_evidence((select id from deletion_test_ids where label='employer-d-request'));

-- ---------------------------------------------------------------------------
-- Section D — candidate anonymization (D-078), field-by-field, using the
-- richer Candidate A fixture (languages + application + status history) via
-- a direct call to the private domain-scrub helper — isolates the
-- anonymization contract itself from the request-state-machine concern
-- already proven in Section C.
-- ---------------------------------------------------------------------------

-- Snapshot the full application row before anonymization, to prove
-- byte/value-exact preservation of every field except candidate_snapshot
-- (PR 8.2 review fix: application.updated_at was previously touched as an
-- unnecessary side effect of the candidate_snapshot replacement).
create temporary table d078_pre_anonymize_application_snapshot as
select id, candidate_id, vacancy_id, status, submitted_at, created_at, updated_at, vacancy_snapshot, snapshot_version, candidate_snapshot
from public.applications
where id = 'a3000000-0000-4000-8000-0000000000a1';

create temporary table d078_pre_anonymize_history_snapshot as
select id, application_id, from_status, to_status, actor_user_id, actor_role, reason, occurred_at
from public.application_status_history
where application_id = 'a3000000-0000-4000-8000-0000000000a1';

select public._anonymize_candidate_domain('a3000000-0000-4000-8000-000000000002', now());

select is(
  (select count(*)::integer from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  1,
  'candidate A profile row still exists — preserved tombstone, not deleted'
);
select isnt(
  (select account_deleted_at from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  null,
  'candidate A account_deleted_at is set'
);
select is(
  (select display_name from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  'Deleted candidate',
  'candidate A display_name replaced with the fixed placeholder'
);
select is(
  (select german_comfort from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  null,
  'candidate A german_comfort cleared'
);
select is(
  (select city from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  null,
  'candidate A city cleared'
);
select is(
  (select work_authorisation_declared from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  null,
  'candidate A work_authorisation_declared cleared'
);
select is(
  (select work_authorisation_declared_at from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  null,
  'candidate A work_authorisation_declared_at cleared'
);
select is(
  (select travel_radius_minutes from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  null,
  'candidate A travel_radius_minutes cleared'
);
select is(
  (select job_categories from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  '{}'::text[],
  'candidate A job_categories emptied'
);
select is(
  (select employment_types from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  '{}'::text[],
  'candidate A employment_types emptied'
);
select is(
  (select shift_preferences from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  '{}'::text[],
  'candidate A shift_preferences emptied'
);
select isnt(
  (select onboarding_completed_at from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  null,
  'candidate A onboarding_completed_at is PRESERVED as a lifecycle fact, not cleared by the essentials trigger'
);
select isnt(
  (select created_at from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  null,
  'candidate A created_at is preserved'
);

select is(
  (select count(*)::integer from public.candidate_languages where candidate_id = 'a3000000-0000-4000-8000-000000000002'),
  0,
  'candidate A candidate_languages rows are deleted entirely'
);

select is(
  (select count(*)::integer from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  1,
  'candidate A application row is preserved'
);
select is(
  (select status from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  'reviewing',
  'candidate A application status is unchanged'
);
select is(
  (select vacancy_id from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  'a3000000-0000-4000-8000-000000000006'::uuid,
  'candidate A application vacancy_id is unchanged'
);
select is(
  (select vacancy_snapshot from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  jsonb_build_object('vacancy_id','a3000000-0000-4000-8000-000000000006','title','C30 Vacancy X'),
  'candidate A application vacancy_snapshot is unchanged'
);
select is(
  (select candidate_snapshot from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  jsonb_build_object('deleted', true),
  'candidate A application candidate_snapshot equals the exact minimal deleted-candidate tombstone — no fabricated candidate attributes'
);
select is(
  (select candidate_snapshot -> 'job_category' from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  null::jsonb,
  'candidate A candidate_snapshot carries no job_category key at all (not even a placeholder value)'
);
select is(
  (select candidate_snapshot -> 'german_comfort' from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  null::jsonb,
  'candidate A candidate_snapshot carries no german_comfort key at all'
);
select is(
  (select candidate_snapshot -> 'display_name' from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  null::jsonb,
  'candidate A candidate_snapshot carries no display_name key at all — the truthful "Deleted candidate" label is synthesized only at the read layer (list/detail RPCs), never stored as a fabricated snapshot field'
);

-- PR 8.2 review fix: full byte/value-exact preservation proof against the
-- pre-anonymization snapshot. Only candidate_snapshot may differ.
select is(
  (select id from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  (select id from d078_pre_anonymize_application_snapshot),
  'candidate A application id is byte/value-exact unchanged'
);
select is(
  (select candidate_id from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  (select candidate_id from d078_pre_anonymize_application_snapshot),
  'candidate A application candidate_id is byte/value-exact unchanged'
);
select is(
  (select vacancy_id from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  (select vacancy_id from d078_pre_anonymize_application_snapshot),
  'candidate A application vacancy_id is byte/value-exact unchanged (redundant with the earlier literal check, against the captured snapshot)'
);
select is(
  (select status from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  (select status from d078_pre_anonymize_application_snapshot),
  'candidate A application status is byte/value-exact unchanged (redundant with the earlier literal check, against the captured snapshot)'
);
select is(
  (select submitted_at from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  (select submitted_at from d078_pre_anonymize_application_snapshot),
  'candidate A application submitted_at is byte/value-exact unchanged'
);
select is(
  (select created_at from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  (select created_at from d078_pre_anonymize_application_snapshot),
  'candidate A application created_at is byte/value-exact unchanged'
);
select is(
  (select updated_at from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  (select updated_at from d078_pre_anonymize_application_snapshot),
  'candidate A application updated_at is byte/value-exact unchanged — the candidate_snapshot replacement no longer touches it'
);
select is(
  (select vacancy_snapshot from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  (select vacancy_snapshot from d078_pre_anonymize_application_snapshot),
  'candidate A application vacancy_snapshot is byte/value-exact unchanged (redundant with the earlier literal check, against the captured snapshot)'
);
select is(
  (select snapshot_version from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  (select snapshot_version from d078_pre_anonymize_application_snapshot),
  'candidate A application snapshot_version is byte/value-exact unchanged'
);
select isnt(
  (select candidate_snapshot from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  (select candidate_snapshot from d078_pre_anonymize_application_snapshot),
  'candidate A application candidate_snapshot is the only field that changed'
);
select is(
  (select count(*)::integer from public.applications a, jsonb_object_keys(a.candidate_snapshot) where a.id = 'a3000000-0000-4000-8000-0000000000a1'),
  1,
  'candidate A candidate_snapshot has exactly one key'
);
select is(
  (select count(*)::integer from public.application_status_history where application_id = 'a3000000-0000-4000-8000-0000000000a1'),
  2,
  'candidate A application_status_history rows are preserved (count unchanged)'
);
select is(
  (select to_status from public.application_status_history where application_id = 'a3000000-0000-4000-8000-0000000000a1' and from_status = 'submitted'),
  'reviewing',
  'candidate A application_status_history content is unchanged'
);
select is(
  (
    select count(*)::integer
    from public.application_status_history h
    join d078_pre_anonymize_history_snapshot s
      on h.id = s.id
      and h.application_id is not distinct from s.application_id
      and h.from_status is not distinct from s.from_status
      and h.to_status is not distinct from s.to_status
      and h.actor_user_id is not distinct from s.actor_user_id
      and h.actor_role is not distinct from s.actor_role
      and h.reason is not distinct from s.reason
      and h.occurred_at is not distinct from s.occurred_at
    where h.application_id = 'a3000000-0000-4000-8000-0000000000a1'
  ),
  2,
  'candidate A application_status_history is byte/value-exact unchanged across every column, both rows, against the pre-anonymization snapshot'
);

select is(
  (select display_name from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000003'),
  'C30 Candidate B',
  'unrelated candidate B is completely untouched'
);
select is(
  (select account_deleted_at from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000003'),
  null,
  'unrelated candidate B account_deleted_at remains null'
);
select is(
  (select display_name from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000005'),
  'C30 Employer X',
  'the employer who owns candidate A''s vacancy is completely untouched by candidate A''s deletion'
);

-- ---------------------------------------------------------------------------
-- Section D.1 — Employer X's own truthful view of candidate A's now-deleted,
-- preserved application (list + detail RPC projections). The employer never
-- receives a fabricated job_category/german_comfort/available_from for a
-- deleted candidate — only the explicit candidate_deleted marker and the
-- application/vacancy/status facts that remain legitimately theirs.
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000005',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000005","role":"authenticated"}',true);

select is(
  (select candidate_deleted from public.list_current_employer_applications() where application_id = 'a3000000-0000-4000-8000-0000000000a1'),
  true,
  'employer X''s applicant list truthfully marks candidate A''s row as candidate_deleted'
);
select is(
  (select candidate_display_name from public.list_current_employer_applications() where application_id = 'a3000000-0000-4000-8000-0000000000a1'),
  'Deleted candidate',
  'employer X''s applicant list shows the truthful "Deleted candidate" label, derived server-side from the explicit deleted marker'
);
select is(
  (select job_category from public.list_current_employer_applications() where application_id = 'a3000000-0000-4000-8000-0000000000a1'),
  null,
  'employer X''s applicant list returns no fabricated job_category for the deleted candidate''s row'
);
select is(
  (select german_comfort from public.list_current_employer_applications() where application_id = 'a3000000-0000-4000-8000-0000000000a1'),
  null,
  'employer X''s applicant list returns no fabricated german_comfort for the deleted candidate''s row'
);
select is(
  (select available_from from public.list_current_employer_applications() where application_id = 'a3000000-0000-4000-8000-0000000000a1'),
  null,
  'employer X''s applicant list returns no fabricated available_from for the deleted candidate''s row'
);
select is(
  (select current_status from public.list_current_employer_applications() where application_id = 'a3000000-0000-4000-8000-0000000000a1'),
  'reviewing',
  'employer X''s applicant list still shows the true preserved application status for the deleted candidate'
);

select is(
  (public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a1') ->> 'candidate_deleted')::boolean,
  true,
  'employer X''s applicant detail truthfully marks the application as candidate_deleted'
);
select is(
  public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a1') ->> 'candidate_display_name',
  'Deleted candidate',
  'employer X''s applicant detail shows the truthful "Deleted candidate" label'
);
select is(
  public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a1') ? 'matched_job_category',
  false,
  'employer X''s applicant detail carries no matched_job_category key at all for a deleted candidate — not even null — since it is not a legitimate business fact to report'
);
select is(
  public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a1') ? 'german_comfort',
  false,
  'employer X''s applicant detail carries no german_comfort key for a deleted candidate'
);
select is(
  public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a1') ? 'languages',
  false,
  'employer X''s applicant detail carries no languages key for a deleted candidate'
);
select is(
  public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a1') ? 'employment_types',
  false,
  'employer X''s applicant detail carries no employment_types key for a deleted candidate'
);
select is(
  public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a1') ? 'shift_preferences',
  false,
  'employer X''s applicant detail carries no shift_preferences key for a deleted candidate'
);
select is(
  public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a1') ->> 'status',
  'ready',
  'employer X''s applicant detail remains status=ready for a deleted candidate''s preserved application — never collapsed to unavailable merely because the candidate deleted their account'
);
select is(
  jsonb_array_length(public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a1') -> 'status_history'),
  2,
  'employer X''s applicant detail still returns the full preserved status history for a deleted candidate'
);
select is(
  (select employer_seen_at from public.list_current_employer_applications() where application_id = 'a3000000-0000-4000-8000-0000000000a1'),
  null,
  'employer X''s applicant list projects employer_seen_at as null for the deleted candidate''s row, before the employer has ever opened it'
);
select is(
  (public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a1') ->> 'employer_seen_at'),
  null,
  'employer X''s applicant detail projects employer_seen_at as null for a deleted candidate''s application, before the employer has ever opened it'
);

reset role;

-- Direct fixture mutation (superuser context, outside RLS — this file's own
-- convention, e.g. the raw table reads elsewhere in this section) to prove
-- both RPCs project a real employer_seen_at timestamp, not just null, even
-- for a deleted candidate's preserved application.
update public.applications
set employer_seen_at = '2026-08-10T09:30:00+00'::timestamptz
where id = 'a3000000-0000-4000-8000-0000000000a1';

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000005',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000005","role":"authenticated"}',true);

select is(
  (select employer_seen_at from public.list_current_employer_applications() where application_id = 'a3000000-0000-4000-8000-0000000000a1'),
  '2026-08-10T09:30:00+00'::timestamptz,
  'employer X''s applicant list projects the real employer_seen_at timestamp once set, even for a deleted candidate''s row'
);
select is(
  (public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a1') ->> 'employer_seen_at')::timestamptz,
  '2026-08-10T09:30:00+00'::timestamptz,
  'employer X''s applicant detail projects the real employer_seen_at timestamp once set, even for a deleted candidate''s application'
);

reset role;

-- ---------------------------------------------------------------------------
-- Section D.2 — D-087: deleted-candidate application transition boundary.
-- Candidate A (application a1) was anonymized above; Candidate F
-- (application a6, a dedicated fixture never referenced elsewhere in this
-- file) remains active throughout. Both applications belong to Employer X,
-- so a single authenticated session below proves the new deletion-boundary
-- check denies exactly the deleted candidate's application, using
-- candidate_profiles.account_deleted_at as the sole authoritative signal
-- (never the presentation-only candidate_snapshot 'deleted' marker), while
-- leaving the ordinary D-070 transition machine untouched for everyone
-- else.
-- ---------------------------------------------------------------------------

select isnt(
  (select account_deleted_at from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  null,
  'D-087: candidate A is confirmed anonymized/deleted before the transition-boundary checks below'
);

-- Direct-table snapshot, taken as the elevated test role (mirrors the rest
-- of this file's convention: raw table reads run outside `authenticated`,
-- since neither `applications` nor `application_status_history` grants
-- ordinary employers a direct table SELECT — only the RPCs below expose
-- them, row-shaped and access-controlled).
create temporary table d087_pre_transition_snapshot as
select updated_at from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1';

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000005',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000005","role":"authenticated"}',true);

select is(
  (public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a1') -> 'allowed_transitions'),
  '[]'::jsonb,
  'D-087: a deleted candidate''s application detail advertises no allowed_transitions'
);

select is(
  public.transition_current_employer_application_status('a3000000-0000-4000-8000-0000000000a1','shortlisted') ->> 'result',
  'unavailable',
  'D-087: transitioning a deleted candidate''s application returns the existing unavailable result'
);

select is(
  public.transition_current_employer_application_status('a3000000-0000-4000-8000-0000000000a1','rejected','Should not be persisted') ->> 'result',
  'unavailable',
  'D-087: a denied transition with a supplied reason still returns unavailable'
);

select is(
  public.transition_current_employer_application_status('a3000000-0000-4000-8000-0000000000a6','reviewing') ->> 'result',
  'updated',
  'D-087: an unrelated application whose candidate account remains active transitions normally per D-070'
);

reset role;

select is(
  (select status from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  'reviewing',
  'D-087: the denied transition leaves application.status unchanged'
);
select is(
  (select updated_at from public.applications where id = 'a3000000-0000-4000-8000-0000000000a1'),
  (select updated_at from d087_pre_transition_snapshot),
  'D-087: the denied transition leaves application.updated_at byte-exact unchanged'
);
select is(
  (select count(*)::integer from public.application_status_history where application_id = 'a3000000-0000-4000-8000-0000000000a1'),
  2,
  'D-087: the denied transition appends no application_status_history row'
);
select is_empty(
  $$ select 1 from public.application_status_history where application_id = 'a3000000-0000-4000-8000-0000000000a1' and reason = 'Should not be persisted' $$,
  'D-087: the supplied transition reason is never persisted for a deleted-candidate application'
);
select is(
  (select status from public.applications where id = 'a3000000-0000-4000-8000-0000000000a6'),
  'reviewing',
  'D-087: the unrelated active application''s status is actually updated'
);

-- ---------------------------------------------------------------------------
-- Section E — employer anonymization (D-079), D-086 moderation cleanup, and
-- D-082 audit redaction, field-by-field, using the Employer A fixture via a
-- direct call to the private domain-scrub helper.
-- ---------------------------------------------------------------------------

select public._anonymize_employer_domain('a3000000-0000-4000-8000-000000000011', now());

select is(
  (select count(*)::integer from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000011'),
  1,
  'employer A profile row still exists — preserved tombstone, not deleted'
);
select isnt(
  (select account_deleted_at from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000011'),
  null,
  'employer A account_deleted_at is set'
);
select is(
  (select display_name from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000011'),
  'Deleted employer',
  'employer A display_name replaced with the fixed placeholder'
);
select is(
  (select berlin_locality from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000011'),
  null,
  'employer A berlin_locality cleared'
);
select is(
  (select phone from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000011'),
  null,
  'employer A phone cleared'
);
select is(
  (select website from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000011'),
  null,
  'employer A website cleared'
);
select is(
  (select organisation_legal_name from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000011'),
  null,
  'employer A organisation_legal_name cleared'
);
select is(
  (select verification_state from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000011'),
  'verified',
  'employer A verification_state is PRESERVED as operator-facing historical fact'
);
select isnt(
  (select verification_reviewed_by from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000011'),
  null,
  'employer A verification_reviewed_by is preserved'
);

select is(
  (select count(*)::integer from public.companies where id = 'a3000000-0000-4000-8000-0000000000c1'),
  1,
  'employer A owned company row still exists — preserved tombstone'
);
select is(
  (select name from public.companies where id = 'a3000000-0000-4000-8000-0000000000c1'),
  'Deleted company',
  'employer A company name replaced with the fixed placeholder'
);
select is(
  (select slug from public.companies where id = 'a3000000-0000-4000-8000-0000000000c1'),
  'deleted-company-a3000000-0000-4000-8000-0000000000c1',
  'employer A company slug is the exact deterministic deleted-company-<uuid> tombstone, derived only from the immutable company id'
);
select isnt(
  (select slug from public.companies where id = 'a3000000-0000-4000-8000-0000000000c1'),
  'c30-employer-a-company',
  'the pre-deletion slug is no longer in use by this row'
);

select is(
  (select count(*)::integer from public.vacancies where id in ('a3000000-0000-4000-8000-000000000015','a3000000-0000-4000-8000-000000000016')),
  2,
  'employer A owned vacancies still exist as rows'
);
select is(
  (select publication_state from public.vacancies where id = 'a3000000-0000-4000-8000-000000000015'),
  'withdrawn',
  'employer A previously-published vacancy is withdrawn'
);
select is(
  (select publication_state from public.vacancies where id = 'a3000000-0000-4000-8000-000000000016'),
  'withdrawn',
  'employer A previously-paused vacancy is withdrawn'
);
select isnt(
  (select withdrawn_at from public.vacancies where id = 'a3000000-0000-4000-8000-000000000015'),
  null,
  'withdrawn_at is set on the withdrawn vacancy'
);
select is(
  public.is_vacancy_effectively_public('a3000000-0000-4000-8000-000000000015', now()),
  false,
  'employer A withdrawn vacancy is not effective-public'
);
select is(
  (select count(*)::integer from public.vacancy_lifecycle_events where vacancy_id = 'a3000000-0000-4000-8000-000000000015' and event_type = 'withdrawn' and actor_user_id = 'a3000000-0000-4000-8000-000000000011'),
  1,
  'the withdrawal lifecycle event is attributed to the deleted employer''s own id, never service_role/an operator/another user'
);

select is(
  (select count(*)::integer from public.applications where id = 'a3000000-0000-4000-8000-0000000000a2'),
  1,
  'the candidate application against employer A''s vacancy is preserved'
);
select is(
  (select status from public.applications where id = 'a3000000-0000-4000-8000-0000000000a2'),
  'shortlisted',
  'candidate C''s application status is unchanged by employer A''s deletion'
);
select is(
  (select count(*)::integer from public.application_status_history where application_id = 'a3000000-0000-4000-8000-0000000000a2'),
  2,
  'candidate C''s application_status_history is unchanged by employer A''s deletion'
);
select is(
  (select display_name from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000013'),
  'C30 Candidate C',
  'candidate C''s own profile is completely untouched by employer A''s deletion'
);
select is(
  (select account_deleted_at from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000013'),
  null,
  'candidate C is not marked deleted merely because the employer they applied to was deleted'
);

select is(
  (select count(*)::integer from public.employer_suspension where employer_profile_id = 'a3000000-0000-4000-8000-000000000011'),
  0,
  'D-086: employer A''s current employer_suspension row is removed (deleted, not redacted, not preserved)'
);
select is(
  (select count(*)::integer from public.vacancy_moderation where vacancy_id = 'a3000000-0000-4000-8000-000000000016'),
  0,
  'D-086: the current vacancy_moderation row for employer A''s owned vacancy is removed'
);

select is(
  (select count(*)::integer from public.employer_suspension where employer_profile_id = 'a3000000-0000-4000-8000-000000000012'),
  1,
  'unrelated employer B''s employer_suspension row is unchanged'
);
select is(
  (select suspended_reason from public.employer_suspension where employer_profile_id = 'a3000000-0000-4000-8000-000000000012'),
  'C30 unrelated suspension reason',
  'unrelated employer B''s suspension reason text is unchanged'
);
select is(
  (select count(*)::integer from public.vacancy_moderation where vacancy_id = 'a3000000-0000-4000-8000-000000000017'),
  1,
  'unrelated employer B''s vacancy_moderation row is unchanged'
);
select is(
  (select moderated_reason from public.vacancy_moderation where vacancy_id = 'a3000000-0000-4000-8000-000000000017'),
  'C30 unrelated moderation reason',
  'unrelated employer B''s moderation reason text is unchanged'
);

select is(
  (select reason from public.admin_audit_events where event_type='employer_suspended' and target_id='a3000000-0000-4000-8000-000000000011'),
  '[redacted after account deletion]',
  'D-082: the audit reason for the event targeting the deleted employer is exactly the fixed redaction marker'
);
select is(
  (select reason from public.admin_audit_events where event_type='vacancy_moderated' and target_id='a3000000-0000-4000-8000-000000000016'),
  '[redacted after account deletion]',
  'D-082: the audit reason for the event targeting the deleted employer''s vacancy is exactly the fixed redaction marker'
);
select is(
  (select count(*)::integer from public.admin_audit_events where target_id='a3000000-0000-4000-8000-000000000011'),
  1,
  'the redacted audit event row itself still exists — not deleted'
);
select is(
  (select event_type from public.admin_audit_events where target_id='a3000000-0000-4000-8000-000000000011'),
  'employer_suspended',
  'the redacted audit event''s event_type is preserved'
);
select is(
  (select actor_user_id from public.admin_audit_events where target_id='a3000000-0000-4000-8000-000000000011'),
  'a3000000-0000-4000-8000-000000000001'::uuid,
  'the redacted audit event''s actor_user_id is preserved'
);
select is(
  (select reason from public.admin_audit_events where target_id='a3000000-0000-4000-8000-000000000012'),
  'C30 unrelated employer target reason',
  'the unrelated employer B audit reason is unchanged'
);
select is(
  (select count(*)::integer from public.admin_audit_events where event_type in ('employer_unsuspended','vacancy_restored') and (target_id='a3000000-0000-4000-8000-000000000011' or target_id='a3000000-0000-4000-8000-000000000016')),
  0,
  'no employer_unsuspended/vacancy_restored audit event was generated merely because D-086 cleanup removed the current-state moderation rows'
);

-- ---------------------------------------------------------------------------
-- Section F — D-085 dual-capability whole-account deletion
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::integer from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000021'),
  1,
  'dual-capability user has a candidate_profiles row before deletion'
);
select is(
  (select count(*)::integer from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000021'),
  1,
  'dual-capability user also has an employer_profiles row before deletion'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000021',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000021","role":"authenticated"}',true);
insert into deletion_test_ids (label, id)
select 'dual-request', (public.request_account_deletion() ->> 'request_id')::uuid;
select is(
  public.request_account_deletion() ->> 'status',
  'existing_pending',
  'the dual-capability account gets exactly one deletion request — the caller cannot choose a candidate-only or employer-only scope, there is no parameter to do so'
);
reset role;

select is(
  (select count(*)::integer from public.deletion_requests where user_id = 'a3000000-0000-4000-8000-000000000021'),
  1,
  'exactly one deletion_requests row exists for the dual-capability account, covering both capabilities'
);

select public._claim_deletion_request((select id from deletion_test_ids where label='dual-request'));
select public._process_deletion_domain_scrub((select id from deletion_test_ids where label='dual-request'));

select is(
  (select count(*)::integer from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000021'),
  1,
  'dual-capability candidate_profiles row still exists after deletion — preserved tombstone'
);
select is(
  (select count(*)::integer from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000021'),
  1,
  'dual-capability employer_profiles row still exists after deletion — preserved tombstone'
);
select isnt(
  (select account_deleted_at from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000021'),
  null,
  'dual-capability candidate_profiles.account_deleted_at is set'
);
select isnt(
  (select account_deleted_at from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000021'),
  null,
  'dual-capability employer_profiles.account_deleted_at is set'
);
select is(
  (select display_name from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000021'),
  'Deleted candidate',
  'dual-capability candidate side is scrubbed exactly like a candidate-only deletion'
);
select is(
  (select display_name from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000021'),
  'Deleted employer',
  'dual-capability employer side is scrubbed exactly like an employer-only deletion'
);
select is(
  (select count(*)::integer from public.candidate_languages where candidate_id = 'a3000000-0000-4000-8000-000000000021'),
  0,
  'dual-capability candidate_languages rows are deleted, same as a candidate-only deletion'
);
select is(
  (select count(*)::integer from public.deletion_requests where id = (select id from deletion_test_ids where label='dual-request') and domain_scrubbed_at is not null),
  1,
  'both capability scrubs completed inside the single domain_scrubbed_at-marked pass — one atomic call, not two separately committed transactions (docs/45 §3.4/D-085)'
);
select public._record_deletion_auth_evidence((select id from deletion_test_ids where label='dual-request'));
select is(
  (select status from public.deletion_requests where id = (select id from deletion_test_ids where label='dual-request')),
  'completed',
  'the single whole-account request reaches completed once both capabilities are scrubbed and Auth evidence is recorded'
);

-- Candidate-only and employer-only account shapes, proven independently so
-- D-085's "determine capabilities transactionally" branch is exercised for
-- each shape, not only the dual case above.
select public._anonymize_candidate_domain('a3000000-0000-4000-8000-000000000003', now());
select is(
  (select count(*)::integer from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000003'),
  0,
  'anonymizing a candidate-only account creates no employer_profiles row as a side effect'
);
select isnt(
  (select account_deleted_at from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000003'),
  null,
  'the candidate-only account (candidate B, reused here) is anonymized correctly on its own'
);

select public._anonymize_employer_domain('a3000000-0000-4000-8000-000000000012', now());
select is(
  (select count(*)::integer from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000012'),
  0,
  'anonymizing an employer-only account creates no candidate_profiles row as a side effect'
);
select isnt(
  (select account_deleted_at from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000012'),
  null,
  'the employer-only account (employer B, reused here) is anonymized correctly on its own'
);

-- ---------------------------------------------------------------------------
-- Section F.1 — D-085 cross-capability stale-JWT resurrection boundary
-- (discovered in PR 8.2 review). A role-local deleted check alone
-- (_is_current_candidate_deleted/_is_current_employer_deleted) is a no-op
-- for a capability that was never created — there is no row for it to
-- find — so a still-valid pre-delete JWT could otherwise create the
-- missing capability after the existing one was scrubbed.
-- _is_stint_account_deleted/_is_current_stint_account_deleted close this
-- gap. Candidate A (candidate-only, deleted in Section D) and Employer B
-- (employer-only, deleted immediately above) are reused as the
-- deleted-side fixtures; the fresh, never-deleted Active G proves the
-- ordinary creation path is unaffected.
-- ---------------------------------------------------------------------------

-- A. candidate-only deleted account cannot create the employer capability.
select is(
  (select count(*)::integer from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  0,
  'candidate A (candidate-only, deleted) has no employer_profiles row'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000002","role":"authenticated"}',true);

select throws_ok(
  $$ insert into public.employer_profiles (id, employer_type, display_name, berlin_locality, lawful_hiring_declared) values ('a3000000-0000-4000-8000-000000000002','private','Resurrected Employer','Mitte',true) $$,
  '42501', null,
  'a candidate-only deleted account cannot INSERT an employer_profiles row with a still-valid pre-delete JWT'
);

select is(
  public.bootstrap_organisation_employer('Resurrected Org','Resurrected Org GmbH','Mitte','Resurrected Co','resurrected-co') ->> 'status',
  'unavailable',
  'a candidate-only deleted account cannot bootstrap_organisation_employer with a still-valid pre-delete JWT'
);

reset role;

select is(
  (select count(*)::integer from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000002'),
  0,
  'no employer_profiles row was created for candidate A by either resurrection attempt above'
);
select is(
  (select count(*)::integer from public.companies where owner_employer_id = 'a3000000-0000-4000-8000-000000000002'),
  0,
  'no company row was created for candidate A by the bootstrap resurrection attempt above'
);

-- B. employer-only deleted account cannot create the candidate capability.
select is(
  (select count(*)::integer from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000012'),
  0,
  'employer B (employer-only, deleted) has no candidate_profiles row'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000012',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000012","role":"authenticated"}',true);

select throws_ok(
  $$ insert into public.candidate_profiles (id, display_name, job_categories, employment_types, shift_preferences) values ('a3000000-0000-4000-8000-000000000012','Resurrected Candidate',array['cleaning'],array['part_time'],array['daytime']) $$,
  '42501', null,
  'an employer-only deleted account cannot INSERT a candidate_profiles row with a still-valid pre-delete JWT'
);

reset role;

select is(
  (select count(*)::integer from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000012'),
  0,
  'no candidate_profiles row was created for employer B by the resurrection attempt above'
);

-- C. an active (never-deleted) account can still create a missing
-- capability normally — the new whole-account check is not a false
-- positive for an account that was never deleted at all.
select is(
  (select count(*)::integer from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000052'),
  0,
  'Active G (fresh, never deleted) has no employer_profiles row yet'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000052',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000052","role":"authenticated"}',true);

select is(
  public.bootstrap_organisation_employer('New Org','New Org GmbH','Mitte','New Co','new-co-active-g') ->> 'status',
  'ok',
  'an active (never-deleted) account can still bootstrap_organisation_employer normally — the D-085 whole-account check is not a false positive'
);

reset role;

select is(
  (select count(*)::integer from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000052'),
  1,
  'Active G now has an employer_profiles row, created by the successful bootstrap above'
);

-- ---------------------------------------------------------------------------
-- Section G — stale-JWT-style database gate (D-080 §3.2/§3.3): an
-- authenticated session (auth.uid() resolving successfully — exactly what a
-- still-cryptographically-valid pre-delete JWT would produce) must be
-- denied every ordinary candidate/employer business surface once
-- account_deleted_at is set. Candidate E and Employer D (Section C/D) were
-- deleted through the real request pipeline for this proof.
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000041',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000041","role":"authenticated"}',true);

select is_empty($$ select * from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000041' $$, 'deleted candidate E: own profile SELECT denied');
select is_empty($$ select * from public.candidate_languages where candidate_id = 'a3000000-0000-4000-8000-000000000041' $$, 'deleted candidate E: candidate_languages SELECT denied');
select throws_ok($$ insert into public.candidate_languages (candidate_id, language_code, proficiency) values ('a3000000-0000-4000-8000-000000000041','fr','basic') $$, '42501', null, 'deleted candidate E: candidate_languages INSERT denied');
select lives_ok(
  $$ update public.candidate_profiles set city = 'Berlin' where id = 'a3000000-0000-4000-8000-000000000041' $$,
  'deleted candidate E: own-profile UPDATE is a silent RLS no-op (not an error)'
);
select is(
  public.complete_candidate_onboarding() ->> 'status',
  'missing_profile',
  'deleted candidate E: complete_candidate_onboarding denied'
);
select is(
  public.submit_candidate_application('a3000000-0000-4000-8000-000000000006') ->> 'result',
  'incomplete',
  'deleted candidate E: submit_candidate_application denied'
);
select is(
  (public.resolve_current_candidate_vacancy_match('a3000000-0000-4000-8000-000000000006')).status,
  'incomplete',
  'deleted candidate E: resolve_current_candidate_vacancy_match denied'
);
select is_empty($$ select * from public.list_current_candidate_vacancy_matches() $$, 'deleted candidate E: list_current_candidate_vacancy_matches returns nothing');
select is_empty($$ select * from public.list_current_candidate_application_status_history('a3000000-0000-4000-8000-0000000000a4') $$, 'deleted candidate E: application status history denied');
select is_empty($$ select * from public.applications where id = 'a3000000-0000-4000-8000-0000000000a4' $$, 'deleted candidate E: own application SELECT denied');
reset role;

select is(
  (select city from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000041'),
  null,
  'the deleted candidate E UPDATE attempt above was a genuine no-op — city was never actually set to Berlin'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000042',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000042","role":"authenticated"}',true);

select is_empty($$ select * from public.employer_profiles where id = 'a3000000-0000-4000-8000-000000000042' $$, 'deleted employer D: own profile SELECT denied');
select is_empty($$ select * from public.companies where owner_employer_id = 'a3000000-0000-4000-8000-000000000042' $$, 'deleted employer D: own company SELECT denied');
select is_empty($$ select * from public.vacancies where employer_profile_id = 'a3000000-0000-4000-8000-000000000042' $$, 'deleted employer D: own vacancies SELECT denied');
select is(
  public.complete_employer_onboarding() ->> 'status',
  'unavailable',
  'deleted employer D: complete_employer_onboarding denied'
);
select is(
  public.create_employer_vacancy_draft('T','cleaning','Mitte') ->> 'status',
  'unavailable',
  'deleted employer D: create_employer_vacancy_draft denied'
);
select is(
  public.publish_employer_vacancy('a3000000-0000-4000-8000-000000000018') ->> 'status',
  'unavailable',
  'deleted employer D: publish_employer_vacancy denied'
);
select is(
  public.withdraw_employer_vacancy('a3000000-0000-4000-8000-000000000018') ->> 'status',
  'unavailable',
  'deleted employer D: vacancy lifecycle transition (withdraw) denied'
);
select is(
  public.request_employer_verification() ->> 'status',
  'unavailable',
  'deleted employer D: request_employer_verification denied'
);
select is_empty($$ select * from public.list_current_employer_applications() $$, 'deleted employer D: applicant list is empty');
select is(
  public.get_current_employer_application('a3000000-0000-4000-8000-0000000000a5') ->> 'status',
  'unavailable',
  'deleted employer D: applicant detail denied'
);
select is(
  public.transition_current_employer_application_status('a3000000-0000-4000-8000-0000000000a5','reviewing') ->> 'result',
  'employer_unavailable',
  'deleted employer D: application status transition denied'
);
reset role;

-- Fresh login cannot be established for either deleted account, and an
-- unrelated account remains fully functional throughout.
select is(
  public._is_candidate_deleted('a3000000-0000-4000-8000-000000000041'),
  true,
  'the arbitrary-id deleted check confirms candidate E is deleted'
);
select is(
  public._is_employer_deleted('a3000000-0000-4000-8000-000000000042'),
  true,
  'the arbitrary-id deleted check confirms employer D is deleted'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000013',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000013","role":"authenticated"}',true);
select is(
  (select display_name from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000013'),
  'C30 Candidate C',
  'an unrelated, non-deleted candidate remains fully able to read their own profile throughout this file'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section H — bootstrap/reactivation prevention
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000041',true);
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000041","role":"authenticated"}',true);
select throws_ok(
  $$ insert into public.candidate_profiles (id, display_name, job_categories, employment_types, shift_preferences) values ('a3000000-0000-4000-8000-000000000041','Reborn',array['cleaning'],array['part_time'],array['daytime']) $$,
  null, null,
  'a deleted candidate cannot resurrect their own tombstoned profile row via INSERT (PK conflict and RLS WITH CHECK both block it)'
);
reset role;

select is(
  (select account_deleted_at from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000041') is not null,
  true,
  'candidate E account_deleted_at remains set after the failed reactivation attempt'
);
select is(
  (select display_name from public.candidate_profiles where id = 'a3000000-0000-4000-8000-000000000041'),
  'Deleted candidate',
  'candidate E display_name was not reverted by the failed reactivation attempt'
);

-- ---------------------------------------------------------------------------
-- Section I — static SECURITY DEFINER/grant audit for the new surface
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::integer from pg_proc where pronamespace='public'::regnamespace and proname in ('_is_candidate_deleted','_is_employer_deleted') and prosecdef),
  2,
  'both arbitrary-id deleted-account helpers are SECURITY DEFINER'
);
select is_empty(
  $$ select privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name in ('_is_candidate_deleted','_is_employer_deleted') and grantee in ('anon','authenticated') $$,
  'neither arbitrary-id deleted-account helper is anon/authenticated-executable — no existence oracle'
);
select ok(
  has_function_privilege('authenticated','public.is_current_candidate_deleted()','execute'),
  'authenticated can execute the self-scoped candidate deleted-check'
);
select ok(
  has_function_privilege('authenticated','public.is_current_employer_deleted()','execute'),
  'authenticated can execute the self-scoped employer deleted-check'
);

select is(
  (select count(*)::integer from pg_proc where pronamespace='public'::regnamespace and proname = 'deletion_requests' ),
  0,
  'sanity: deletion_requests is a table, not shadowed by a function of the same name'
);

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select throws_ok($$ select public._is_candidate_deleted('a3000000-0000-4000-8000-000000000041') $$, '42501', null, 'anon cannot call the arbitrary-id candidate helper directly') ;
reset role;

-- ---------------------------------------------------------------------------
-- Section I.1 — full deletion-function privilege matrix (PR 8.2 review fix).
-- Explicit, deterministic ACLs are proven for every category rather than
-- relying on Supabase's project-level default schema privileges: ordinary
-- authenticated gets self-service request/cancel only; anon gets nothing;
-- service_role gets exactly the four request-bound processor functions and
-- nothing else — not the arbitrary-target anonymization/withdrawal helpers,
-- which remain reachable only via internal owner-implicit calls from within
-- those four functions' own bodies.
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::integer from pg_proc where pronamespace='public'::regnamespace and proname in ('_is_stint_account_deleted','_is_current_stint_account_deleted') and prosecdef),
  2,
  'both new whole-account deleted helpers are SECURITY DEFINER'
);

select is_empty(
  $$ select privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name in ('_is_candidate_deleted','_is_employer_deleted','_is_stint_account_deleted','_withdraw_vacancy_for_deletion','_anonymize_candidate_domain','_anonymize_employer_domain') and grantee in ('anon','authenticated','service_role') $$,
  'no arbitrary-target/private deletion helper is anon/authenticated/service_role-executable — reachable only via internal owner-implicit calls, never as a direct RPC'
);

select ok(
  has_function_privilege('authenticated','public._is_current_stint_account_deleted()','execute'),
  'authenticated can execute the self-scoped whole-account deleted-check (RLS support)'
);
select is_empty(
  $$ select privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name = '_is_current_stint_account_deleted' and grantee = 'anon' $$,
  'anon cannot execute the self-scoped whole-account deleted-check'
);

select is(
  (select count(*)::integer from information_schema.routine_privileges where routine_schema='public' and routine_name in ('_claim_deletion_request','_process_deletion_domain_scrub','_record_deletion_auth_evidence','_record_deletion_failure') and grantee='service_role' and privilege_type='EXECUTE'),
  4,
  'service_role has an explicit EXECUTE grant on exactly the four request-bound processor functions'
);
select is_empty(
  $$ select privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name in ('_claim_deletion_request','_process_deletion_domain_scrub','_record_deletion_auth_evidence','_record_deletion_failure') and grantee in ('anon','authenticated') $$,
  'no request-bound processor function is anon/authenticated-executable'
);

select is(
  (select count(*)::integer from information_schema.routine_privileges where routine_schema='public' and routine_name in ('request_account_deletion','cancel_account_deletion_request') and grantee='authenticated' and privilege_type='EXECUTE'),
  2,
  'authenticated has an explicit EXECUTE grant on both self-service deletion RPCs'
);
select is_empty(
  $$ select privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name in ('request_account_deletion','cancel_account_deletion_request') and grantee in ('anon','service_role') $$,
  'neither self-service deletion RPC is anon/service_role-executable — self-service only, never the processor role'
);

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select throws_ok($$ select public._is_stint_account_deleted('a3000000-0000-4000-8000-000000000041') $$, '42501', null, 'anon cannot call the arbitrary-id whole-account helper directly') ;
reset role;

select * from finish();
rollback;
