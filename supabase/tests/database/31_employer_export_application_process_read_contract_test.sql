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
('00000000-0000-0000-0000-000000000000','e8300000-0000-4000-8000-000000000001','authenticated','authenticated','c31-operator@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','e8300000-0000-4000-8000-000000000005','authenticated','authenticated','c31-employer-a@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','e8300000-0000-4000-8000-000000000006','authenticated','authenticated','c31-employer-b@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','e8300000-0000-4000-8000-000000000007','authenticated','authenticated','c31-employer-c-suspended@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','e8300000-0000-4000-8000-000000000008','authenticated','authenticated','c31-employer-d-revoked@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','e8300000-0000-4000-8000-000000000009','authenticated','authenticated','c31-employer-e-deleted@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','e8300000-0000-4000-8000-000000000021','authenticated','authenticated','c31-candidate-x@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','e8300000-0000-4000-8000-000000000022','authenticated','authenticated','c31-candidate-y@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

-- Employer A: active, unverified (default state — proves unverified is not a
-- gate), completed onboarding. Owns vacancy X with two applications: one from
-- still-active Candidate X, one from Candidate Y (anonymized below, proving a
-- deleted candidate's application remains as a process-metadata row).
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at
) values (
  'e8300000-0000-4000-8000-000000000005','private','C31 Employer A','Mitte',true,now(),now()
);
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'e8300000-0000-4000-8000-000000000101','e8300000-0000-4000-8000-000000000005','C31 Vacancy A','c31-vacancy-a','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'e8300000-0000-4000-8000-000000000021','candidate-secret-name-8-3','basic',true,now(),
  'Berlin',30,(current_date + interval '7 days')::date,array['cleaning'],array['part_time'],array['daytime'],now()
);
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'e8300000-0000-4000-8000-000000000022','C31 Candidate Y','basic',true,now(),
  'Berlin',30,(current_date + interval '7 days')::date,array['cleaning'],array['part_time'],array['daytime'],now()
);

insert into public.applications (
  id, candidate_id, vacancy_id, status, submitted_at, snapshot_version,
  candidate_snapshot, vacancy_snapshot, created_at, updated_at
) values (
  'e8300000-0000-4000-8000-0000000000a1',
  'e8300000-0000-4000-8000-000000000021',
  'e8300000-0000-4000-8000-000000000101',
  'reviewing',
  now() - interval '2 days',
  1,
  jsonb_build_object('display_name','candidate-secret-name-8-3','job_category','cleaning'),
  jsonb_build_object('vacancy_id','e8300000-0000-4000-8000-000000000101','title','C31 Vacancy A'),
  now() - interval '2 days',
  now() - interval '1 days'
);
insert into public.application_status_history (
  application_id, from_status, to_status, actor_user_id, actor_role, reason, occurred_at
) values
  ('e8300000-0000-4000-8000-0000000000a1', null, 'submitted', 'e8300000-0000-4000-8000-000000000021', 'candidate', null, now() - interval '2 days'),
  ('e8300000-0000-4000-8000-0000000000a1', 'submitted', 'reviewing', 'e8300000-0000-4000-8000-000000000005', 'employer', null, now() - interval '1 days');

insert into public.applications (
  id, candidate_id, vacancy_id, status, submitted_at, snapshot_version,
  candidate_snapshot, vacancy_snapshot, created_at, updated_at
) values (
  'e8300000-0000-4000-8000-0000000000a2',
  'e8300000-0000-4000-8000-000000000022',
  'e8300000-0000-4000-8000-000000000101',
  'submitted',
  now() - interval '1 days',
  1,
  jsonb_build_object('display_name','C31 Candidate Y','job_category','cleaning'),
  jsonb_build_object('vacancy_id','e8300000-0000-4000-8000-000000000101','title','C31 Vacancy A'),
  now() - interval '1 days',
  now() - interval '1 days'
);

-- Employer B: unrelated, active, owns its own vacancy/application — proves
-- cross-employer isolation.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values (
  'e8300000-0000-4000-8000-000000000006','private','C31 Employer B','Mitte',true,now(),now(),'verified',
  now(),now(),'e8300000-0000-4000-8000-000000000001',now(),'v1'
);
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'e8300000-0000-4000-8000-000000000102','e8300000-0000-4000-8000-000000000006','C31 Vacancy B','c31-vacancy-b','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);
insert into public.applications (
  id, candidate_id, vacancy_id, status, submitted_at, snapshot_version,
  candidate_snapshot, vacancy_snapshot, created_at, updated_at
) values (
  'e8300000-0000-4000-8000-0000000000b1',
  'e8300000-0000-4000-8000-000000000021',
  'e8300000-0000-4000-8000-000000000102',
  'shortlisted',
  now() - interval '3 days',
  1,
  jsonb_build_object('display_name','candidate-secret-name-8-3','job_category','cleaning'),
  jsonb_build_object('vacancy_id','e8300000-0000-4000-8000-000000000102','title','C31 Vacancy B'),
  now() - interval '3 days',
  now() - interval '3 days'
);

-- Employer C: suspended, still owns applications — proves suspension does
-- not gate export.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at
) values (
  'e8300000-0000-4000-8000-000000000007','private','C31 Employer C','Mitte',true,now(),now()
);
insert into public.employer_suspension (employer_profile_id, suspended_by, suspended_reason)
values ('e8300000-0000-4000-8000-000000000007','e8300000-0000-4000-8000-000000000001','C31 test suspension reason');
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source
) values (
  'e8300000-0000-4000-8000-000000000103','e8300000-0000-4000-8000-000000000007','C31 Vacancy C','c31-vacancy-c','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer'
);
insert into public.applications (
  id, candidate_id, vacancy_id, status, submitted_at, snapshot_version,
  candidate_snapshot, vacancy_snapshot, created_at, updated_at
) values (
  'e8300000-0000-4000-8000-0000000000c1',
  'e8300000-0000-4000-8000-000000000021',
  'e8300000-0000-4000-8000-000000000103',
  'submitted',
  now() - interval '1 days',
  1,
  jsonb_build_object('display_name','candidate-secret-name-8-3','job_category','cleaning'),
  jsonb_build_object('vacancy_id','e8300000-0000-4000-8000-000000000103','title','C31 Vacancy C'),
  now() - interval '1 days',
  now() - interval '1 days'
);

-- Employer D: revoked verification, still owns applications — proves
-- verification state does not gate export.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_review_reason, verification_attested_at, verification_attestation_version
) values (
  'e8300000-0000-4000-8000-000000000008','private','C31 Employer D','Mitte',true,now(),now(),'revoked',
  now(),now(),'e8300000-0000-4000-8000-000000000001','C31 test revocation reason',now(),'v1'
);
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source
) values (
  'e8300000-0000-4000-8000-000000000104','e8300000-0000-4000-8000-000000000008','C31 Vacancy D','c31-vacancy-d','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer'
);
insert into public.applications (
  id, candidate_id, vacancy_id, status, submitted_at, snapshot_version,
  candidate_snapshot, vacancy_snapshot, created_at, updated_at
) values (
  'e8300000-0000-4000-8000-0000000000d1',
  'e8300000-0000-4000-8000-000000000021',
  'e8300000-0000-4000-8000-000000000104',
  'submitted',
  now() - interval '1 days',
  1,
  jsonb_build_object('display_name','candidate-secret-name-8-3','job_category','cleaning'),
  jsonb_build_object('vacancy_id','e8300000-0000-4000-8000-000000000104','title','C31 Vacancy D'),
  now() - interval '1 days',
  now() - interval '1 days'
);

-- Employer E: will be anonymized below (deleted) — proves a deleted employer
-- gets zero rows even though its vacancies/applications are preserved.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values (
  'e8300000-0000-4000-8000-000000000009','private','C31 Employer E','Mitte',true,now(),now(),'verified',
  now(),now(),'e8300000-0000-4000-8000-000000000001',now(),'v1'
);
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'e8300000-0000-4000-8000-000000000105','e8300000-0000-4000-8000-000000000009','C31 Vacancy E','c31-vacancy-e','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);
insert into public.applications (
  id, candidate_id, vacancy_id, status, submitted_at, snapshot_version,
  candidate_snapshot, vacancy_snapshot, created_at, updated_at
) values (
  'e8300000-0000-4000-8000-0000000000e1',
  'e8300000-0000-4000-8000-000000000021',
  'e8300000-0000-4000-8000-000000000105',
  'submitted',
  now() - interval '1 days',
  1,
  jsonb_build_object('display_name','candidate-secret-name-8-3','job_category','cleaning'),
  jsonb_build_object('vacancy_id','e8300000-0000-4000-8000-000000000105','title','C31 Vacancy E'),
  now() - interval '1 days',
  now() - interval '1 days'
);

select public._anonymize_employer_domain('e8300000-0000-4000-8000-000000000009', now());
select public._anonymize_candidate_domain('e8300000-0000-4000-8000-000000000022', now());

-- ---------------------------------------------------------------------------
-- Section A — static SECURITY DEFINER/grant audit
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::integer from pg_proc where pronamespace='public'::regnamespace and proname='list_current_employer_export_applications'),
  1,
  'list_current_employer_export_applications() exists exactly once'
);
select is(
  (select pronargs::integer from pg_proc where pronamespace='public'::regnamespace and proname='list_current_employer_export_applications'),
  0,
  'list_current_employer_export_applications() takes zero parameters'
);
select ok(
  (select prosecdef from pg_proc where pronamespace='public'::regnamespace and proname='list_current_employer_export_applications'),
  'list_current_employer_export_applications() is SECURITY DEFINER'
);
select is(
  (select proconfig from pg_proc where pronamespace='public'::regnamespace and proname='list_current_employer_export_applications'),
  array['search_path=pg_catalog, public'],
  'list_current_employer_export_applications() has a fixed search_path'
);
select ok(
  has_function_privilege('authenticated','public.list_current_employer_export_applications()','execute'),
  'authenticated can execute list_current_employer_export_applications()'
);
select is_empty(
  $$ select privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name='list_current_employer_export_applications' and grantee in ('anon','service_role') $$,
  'neither anon nor service_role can execute list_current_employer_export_applications()'
);
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select throws_ok(
  $$ select * from public.list_current_employer_export_applications() $$,
  '42501', null,
  'anon cannot call list_current_employer_export_applications() directly'
);
reset role;

select is_empty(
  $$ select policyname from pg_policies where schemaname='public' and tablename='applications' and cmd='SELECT' and policyname <> 'applications_select_own' $$,
  'no new employer-scoped SELECT RLS policy was added to applications — the RPC remains the sole new boundary'
);

-- ---------------------------------------------------------------------------
-- Section B — unauthenticated/no-identity behavior
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
select is_empty(
  $$ select * from public.list_current_employer_export_applications() $$,
  'no identity (no jwt sub) returns zero rows safely, not an error'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section C — Employer A: own rows, correct shape, no candidate PII
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','e8300000-0000-4000-8000-000000000005',true);
select set_config('request.jwt.claims','{"sub":"e8300000-0000-4000-8000-000000000005","role":"authenticated"}',true);

select is(
  (select count(*)::integer from public.list_current_employer_export_applications()),
  2,
  'employer A (unverified) sees exactly its own two application process rows'
);
select is(
  (select array_agg(application_id order by application_id) from public.list_current_employer_export_applications()),
  array['e8300000-0000-4000-8000-0000000000a1'::uuid,'e8300000-0000-4000-8000-0000000000a2'::uuid],
  'employer A sees exactly its own two application ids, no others'
);
select is(
  (select status from public.list_current_employer_export_applications() where application_id = 'e8300000-0000-4000-8000-0000000000a1'),
  'reviewing',
  'employer A row a1 has the correct current status'
);
select is(
  (select vacancy_id from public.list_current_employer_export_applications() where application_id = 'e8300000-0000-4000-8000-0000000000a1'),
  'e8300000-0000-4000-8000-000000000101'::uuid,
  'employer A row a1 has the correct owned vacancy_id'
);
select isnt(
  (select submitted_at from public.list_current_employer_export_applications() where application_id = 'e8300000-0000-4000-8000-0000000000a1'),
  null,
  'employer A row a1 has a submitted_at value'
);
select is(
  (select status from public.list_current_employer_export_applications() where application_id = 'e8300000-0000-4000-8000-0000000000a2'),
  'submitted',
  'employer A row a2 (deleted candidate Y''s application) still returns its true current status as a process record'
);

select is(
  (
    select array_agg(k order by k)
    from (
      select jsonb_object_keys(row_json) as k
      from (
        select to_jsonb(t) as row_json
        from public.list_current_employer_export_applications() t
        limit 1
      ) one_row
    ) keys
  ),
  array['application_id','status','submitted_at','vacancy_id'],
  'returned row shape is exactly application_id/vacancy_id/status/submitted_at, nothing else'
);

select is(
  (
    select string_agg(row_text, ' | ')
    from (
      select to_jsonb(t)::text as row_text
      from public.list_current_employer_export_applications() t
    ) rows
  ) !~ 'candidate-secret-name-8-3',
  true,
  'the fixture candidate PII string (display name) never appears in the serialized employer export rows'
);
select is_empty(
  $$ select 1 from public.list_current_employer_export_applications() t where to_jsonb(t) ? 'candidate_id' $$,
  'no returned row carries a candidate_id key'
);

reset role;

-- ---------------------------------------------------------------------------
-- Section D — cross-employer isolation
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','e8300000-0000-4000-8000-000000000006',true);
select set_config('request.jwt.claims','{"sub":"e8300000-0000-4000-8000-000000000006","role":"authenticated"}',true);

select is(
  (select count(*)::integer from public.list_current_employer_export_applications()),
  1,
  'employer B sees exactly its own one application process row'
);
select is(
  (select application_id from public.list_current_employer_export_applications() limit 1),
  'e8300000-0000-4000-8000-0000000000b1'::uuid,
  'employer B sees its own application, never employer A''s rows'
);
select is_empty(
  $$ select 1 from public.list_current_employer_export_applications() where application_id in ('e8300000-0000-4000-8000-0000000000a1','e8300000-0000-4000-8000-0000000000a2') $$,
  'employer B cannot see employer A''s application rows'
);

reset role;

-- ---------------------------------------------------------------------------
-- Section E — suspension/verification-state do not gate export
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','e8300000-0000-4000-8000-000000000007',true);
select set_config('request.jwt.claims','{"sub":"e8300000-0000-4000-8000-000000000007","role":"authenticated"}',true);
select is(
  (select count(*)::integer from public.list_current_employer_export_applications()),
  1,
  'a suspended (but not deleted) employer still receives its own export process rows'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','e8300000-0000-4000-8000-000000000008',true);
select set_config('request.jwt.claims','{"sub":"e8300000-0000-4000-8000-000000000008","role":"authenticated"}',true);
select is(
  (select count(*)::integer from public.list_current_employer_export_applications()),
  1,
  'a revoked-verification employer still receives its own export process rows'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section F — deleted employer: zero rows despite preserved data
-- ---------------------------------------------------------------------------

select isnt(
  (select account_deleted_at from public.employer_profiles where id = 'e8300000-0000-4000-8000-000000000009'),
  null,
  'employer E is confirmed anonymized/deleted'
);
select is(
  (select count(*)::integer from public.applications where vacancy_id = 'e8300000-0000-4000-8000-000000000105'),
  1,
  'employer E''s application row is preserved at the table level (D-079), not deleted'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','e8300000-0000-4000-8000-000000000009',true);
select set_config('request.jwt.claims','{"sub":"e8300000-0000-4000-8000-000000000009","role":"authenticated"}',true);
select is_empty(
  $$ select * from public.list_current_employer_export_applications() $$,
  'a deleted employer receives zero export rows, even with a still-valid pre-delete JWT, despite the preserved underlying data'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section G — deterministic ordering and no mutation
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','e8300000-0000-4000-8000-000000000005',true);
select set_config('request.jwt.claims','{"sub":"e8300000-0000-4000-8000-000000000005","role":"authenticated"}',true);

select is(
  (select array_agg(application_id) from public.list_current_employer_export_applications()),
  array['e8300000-0000-4000-8000-0000000000a1'::uuid,'e8300000-0000-4000-8000-0000000000a2'::uuid],
  'rows are returned ordered by submitted_at ascending, application_id ascending as a stable tiebreak'
);

reset role;

select is(
  (select count(*)::integer from public.applications where id in ('e8300000-0000-4000-8000-0000000000a1','e8300000-0000-4000-8000-0000000000a2')),
  2,
  'calling the export RPC mutates nothing — both employer A application rows still exist'
);
select is(
  (select status from public.applications where id = 'e8300000-0000-4000-8000-0000000000a1'),
  'reviewing',
  'calling the export RPC did not change application a1''s status'
);

select * from finish();
rollback;
