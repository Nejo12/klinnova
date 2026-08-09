begin;

create extension if not exists pgtap with schema extensions;

select plan(72);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a2600000-0000-4000-8000-000000000001','authenticated','authenticated','pub26-operator@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2600000-0000-4000-8000-000000000002','authenticated','authenticated','pub26-employer-a@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2600000-0000-4000-8000-000000000003','authenticated','authenticated','pub26-employer-b@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2600000-0000-4000-8000-000000000004','authenticated','authenticated','pub26-employer-c@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2600000-0000-4000-8000-000000000005','authenticated','authenticated','pub26-employer-d@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2600000-0000-4000-8000-000000000006','authenticated','authenticated','pub26-unrelated@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.verification_operators (user_id, created_by, active) values
('a2600000-0000-4000-8000-000000000001','a2600000-0000-4000-8000-000000000001', true);

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, website,
  lawful_hiring_declared, lawful_hiring_declared_at, onboarding_completed_at,
  verification_state, verification_requested_at, verification_reviewed_at,
  verification_reviewed_by, verification_review_reason, verification_attested_at,
  verification_attestation_version
) values
('a2600000-0000-4000-8000-000000000002','private','Public Private Employer A','Mitte',null,
  true, now(), now(),
  'verified', now()-interval '5 hours', now()-interval '4 hours', 'a2600000-0000-4000-8000-000000000001', null, now()-interval '5 hours','v1'),
('a2600000-0000-4000-8000-000000000003','organisation','Public Org Employer B','Kreuzberg','https://public-org-b.example.test',
  true, now(), now(),
  'verified', now()-interval '5 hours', now()-interval '4 hours', 'a2600000-0000-4000-8000-000000000001', null, now()-interval '5 hours','v1'),
('a2600000-0000-4000-8000-000000000004','private','Unverified Employer C','Mitte',null,
  true, now(), now(),
  'unverified', null, null, null, null, null, null),
('a2600000-0000-4000-8000-000000000005','private','Rejected Employer D','Mitte',null,
  true, now(), now(),
  'rejected', now()-interval '6 hours', now()-interval '5 hours', 'a2600000-0000-4000-8000-000000000001', 'Needs review', now()-interval '6 hours','v1');

insert into public.companies (id, name, slug, source, owner_employer_id) values
('a2600000-0000-4000-8000-000000000101','Public Org Co B','public-org-co-b-26','employer','a2600000-0000-4000-8000-000000000003');

-- Employer A vacancies (private employer, no company). Timestamps: 010 and
-- the org vacancy (020) below share the exact same published_at to test
-- stable id-ascending tie-break ordering.
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,paused_at,filled_at,withdrawn_at,expired_at,expires_at
) values
('a2600000-0000-4000-8000-000000000210','a2600000-0000-4000-8000-000000000002',
  'Public Vacancy A Main','public-vacancy-a-main','summary','A full public description.','Berlin','Mitte',
  'cleaning','{full_time}','{morning}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,
  'published','employer','2026-08-05 12:00:00+00',null,null,null,null,now()+interval '30 days'),
('a2600000-0000-4000-8000-000000000211','a2600000-0000-4000-8000-000000000002',
  'Public Vacancy A Draft','public-vacancy-a-draft','summary','description','Berlin','Mitte',
  'cleaning','{full_time}','{morning}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,
  'draft','employer',null,null,null,null,null,null),
('a2600000-0000-4000-8000-000000000212','a2600000-0000-4000-8000-000000000002',
  'Public Vacancy A Paused','public-vacancy-a-paused','summary','description','Berlin','Mitte',
  'cleaning','{full_time}','{morning}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,
  'paused','employer',now()-interval '1 day',now(),null,null,null,now()+interval '30 days'),
('a2600000-0000-4000-8000-000000000213','a2600000-0000-4000-8000-000000000002',
  'Public Vacancy A Filled','public-vacancy-a-filled','summary','description','Berlin','Mitte',
  'cleaning','{full_time}','{morning}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,
  'filled','employer',now()-interval '1 day',null,now(),null,null,null),
('a2600000-0000-4000-8000-000000000214','a2600000-0000-4000-8000-000000000002',
  'Public Vacancy A Withdrawn','public-vacancy-a-withdrawn','summary','description','Berlin','Mitte',
  'cleaning','{full_time}','{morning}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,
  'withdrawn','employer',now()-interval '1 day',null,null,now(),null,null),
('a2600000-0000-4000-8000-000000000215','a2600000-0000-4000-8000-000000000002',
  'Public Vacancy A Expired','public-vacancy-a-expired','summary','description','Berlin','Mitte',
  'cleaning','{full_time}','{morning}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,
  'expired','employer',now()-interval '40 days',null,null,null,now()-interval '10 days',now()-interval '10 days'),
('a2600000-0000-4000-8000-000000000216','a2600000-0000-4000-8000-000000000002',
  'Public Vacancy A Elapsed Not Materialized','public-vacancy-a-elapsed','summary','description','Berlin','Mitte',
  'cleaning','{full_time}','{morning}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,
  'published','employer',now()-interval '40 days',null,null,null,null,now()-interval '1 minute'),
('a2600000-0000-4000-8000-000000000217','a2600000-0000-4000-8000-000000000002',
  'Public Vacancy A Pause Target','public-vacancy-a-pause-target','summary','description','Berlin','Mitte',
  'cleaning','{full_time}','{morning}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,
  'published','employer',now()-interval '1 hour',null,null,null,null,now()+interval '30 days'),
('a2600000-0000-4000-8000-000000000218','a2600000-0000-4000-8000-000000000002',
  'Public Vacancy A Fill Target','public-vacancy-a-fill-target','summary','description','Berlin','Mitte',
  'cleaning','{full_time}','{morning}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,
  'published','employer',now()-interval '1 hour',null,null,null,null,now()+interval '30 days'),
('a2600000-0000-4000-8000-000000000219','a2600000-0000-4000-8000-000000000002',
  'Public Vacancy A Withdraw Target','public-vacancy-a-withdraw-target','summary','description','Berlin','Mitte',
  'cleaning','{full_time}','{morning}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,
  'published','employer',now()-interval '1 hour',null,null,null,null,now()+interval '30 days');

-- Employer B (organisation, owns company) vacancy — same published_at as A's
-- main vacancy for the tie-break ordering test; revoked later in Group G.
insert into public.vacancies (
  id,employer_profile_id,company_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'a2600000-0000-4000-8000-000000000220','a2600000-0000-4000-8000-000000000003','a2600000-0000-4000-8000-000000000101',
  'Public Vacancy B Org','public-vacancy-b-org','summary','description','Berlin','Kreuzberg',
  'cleaning','{full_time}','{morning}','none','office','recurring',2000,'EUR','hourly',true,false,true,
  'published','employer','2026-08-05 12:00:00+00',now()+interval '30 days'
);

-- Employer C (unverified) and D (rejected): publication_state='published' is
-- only reachable through publish_employer_vacancy in the real product, which
-- requires a verified employer — these rows are inserted directly to prove
-- the effective-public helper's own verification gate, independent of
-- whichever path produced the stored row.
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values
('a2600000-0000-4000-8000-000000000221','a2600000-0000-4000-8000-000000000004',
  'Public Vacancy C Unverified','public-vacancy-c-unverified','summary','description','Berlin','Mitte',
  'cleaning','{full_time}','{morning}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,
  'published','employer',now()-interval '1 hour',now()+interval '30 days'),
('a2600000-0000-4000-8000-000000000222','a2600000-0000-4000-8000-000000000005',
  'Public Vacancy D Rejected','public-vacancy-d-rejected','summary','description','Berlin','Mitte',
  'cleaning','{full_time}','{morning}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,
  'published','employer',now()-interval '1 hour',now()+interval '30 days');

insert into public.vacancy_language_requirements (vacancy_id, language_code, min_proficiency) values
('a2600000-0000-4000-8000-000000000210','de','conversational'),
('a2600000-0000-4000-8000-000000000210','en','basic'),
('a2600000-0000-4000-8000-000000000211','en','basic'),
('a2600000-0000-4000-8000-000000000216','en','basic'),
('a2600000-0000-4000-8000-000000000217','en','basic');

-- ---------------------------------------------------------------------------
-- Group A — privileges
-- ---------------------------------------------------------------------------

select ok(
  has_function_privilege('anon', 'public.list_effective_public_vacancies()', 'execute'),
  'anon may execute the list RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.list_effective_public_vacancies()', 'execute'),
  'authenticated may execute the list RPC'
);
select ok(
  has_function_privilege('anon', 'public.get_effective_public_vacancy(uuid)', 'execute'),
  'anon may execute the detail RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.get_effective_public_vacancy(uuid)', 'execute'),
  'authenticated may execute the detail RPC'
);
select ok(
  has_function_privilege('anon', 'public.get_effective_public_vacancy_languages(uuid)', 'execute'),
  'anon may execute the languages RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.get_effective_public_vacancy_languages(uuid)', 'execute'),
  'authenticated may execute the languages RPC'
);

set local role anon;
select throws_ok(
  $$ select * from public.vacancies $$,
  '42501', null, 'anon still cannot select from vacancies table'
);
select throws_ok(
  $$ select * from public.vacancy_language_requirements $$,
  '42501', null, 'anon still cannot select from vacancy_language_requirements table'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2600000-0000-4000-8000-000000000006',true);
select is(
  (select count(*)::integer from public.vacancies where id = 'a2600000-0000-4000-8000-000000000220'),
  0, 'unrelated authenticated user cannot read employer Bs vacancy via raw table select'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000220')),
  1, 'the same unrelated authenticated user can read it through the narrow RPC'
);
reset role;

-- ---------------------------------------------------------------------------
-- Group A2 — no caller-controlled visibility time
-- ---------------------------------------------------------------------------

select has_function(
  'public', 'list_effective_public_vacancies', array[]::text[],
  'list RPC has exactly zero arguments'
);
select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'list_effective_public_vacancies'
      and p.pronargs > 0
  ),
  'no overload of list_effective_public_vacancies accepts any argument'
);
select throws_ok(
  $$ select * from public.list_effective_public_vacancies(now()) $$,
  '42883', null,
  'calling with a timestamp argument fails — no such overload exists, so anon cannot influence the evaluation instant'
);
select throws_ok(
  $$ select * from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000210'::uuid, now()) $$,
  '42883', null,
  'detail RPC likewise accepts no visibility-time argument'
);

-- ---------------------------------------------------------------------------
-- Group B — list eligibility and ordering
-- ---------------------------------------------------------------------------

select ok(
  exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = '22222222-2222-4222-8222-222222222201'),
  'active seed vacancy is included'
);
select ok(
  exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000210'),
  'employer A published vacancy is included'
);
select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000211'),
  'draft vacancy excluded'
);
select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000212'),
  'paused vacancy excluded'
);
select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000213'),
  'filled vacancy excluded'
);
select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000214'),
  'withdrawn vacancy excluded'
);
select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000215'),
  'materialized expired vacancy excluded'
);
select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000216'),
  'stored published but elapsed expiry excluded before materialization'
);
select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000221'),
  'unverified employers published-state row excluded'
);
select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000222'),
  'rejected employers published-state row excluded'
);
select ok(
  (
    select array_position(ids, 'a2600000-0000-4000-8000-000000000210'::uuid)
         < array_position(ids, '22222222-2222-4222-8222-222222222201'::uuid)
    from (
      select array_agg(vacancy_id order by published_at desc, vacancy_id asc) as ids
      from public.list_effective_public_vacancies()
    ) t
  ),
  'ordering is published_at descending (2026 vacancy before 2026-01 seed vacancy)'
);
select ok(
  (
    select array_position(ids, 'a2600000-0000-4000-8000-000000000210'::uuid)
         < array_position(ids, 'a2600000-0000-4000-8000-000000000220'::uuid)
    from (
      select array_agg(vacancy_id order by published_at desc, vacancy_id asc) as ids
      from public.list_effective_public_vacancies()
    ) t
  ),
  'equal published_at ties break by vacancy id ascending'
);

-- ---------------------------------------------------------------------------
-- Group C — detail eligibility
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::integer from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000210')),
  1, 'main published vacancy returns exactly one row'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy('99999999-9999-4999-8999-999999999999')),
  0, 'nonexistent id returns zero rows'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000211')),
  0, 'draft returns zero rows'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000212')),
  0, 'paused returns zero rows'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000213')),
  0, 'filled returns zero rows'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000214')),
  0, 'withdrawn returns zero rows'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000215')),
  0, 'materialized expired returns zero rows'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000216')),
  0, 'elapsed not-materialized expiry returns zero rows'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000221')),
  0, 'unverified employer vacancy returns zero rows'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000222')),
  0, 'rejected employer vacancy returns zero rows'
);

-- ---------------------------------------------------------------------------
-- Group D — projection safety (structural)
-- ---------------------------------------------------------------------------

select ok(
  pg_get_function_result('public.list_effective_public_vacancies()'::regprocedure)
    !~* 'employer_profile_id|company_id|user_id|owner_id|email|phone|street|address|verification_state|reviewed_by|review_reason|candidate|application|document|storage|metadata',
  'list RPC return type excludes forbidden fields'
);
select ok(
  pg_get_function_result('public.get_effective_public_vacancy(uuid)'::regprocedure)
    !~* 'employer_profile_id|company_id|user_id|owner_id|email|phone|street|address|verification_state|reviewed_by|review_reason|candidate|application|document|storage|metadata',
  'detail RPC return type excludes forbidden fields'
);
select ok(
  pg_get_function_result('public.get_effective_public_vacancy_languages(uuid)'::regprocedure)
    !~* 'employer_profile_id|company_id|user_id|owner_id|email|phone|street|address|verification_state|reviewed_by|review_reason|candidate|application|document|storage|metadata',
  'languages RPC return type excludes forbidden fields'
);

-- ---------------------------------------------------------------------------
-- Group E — public employer presentation
-- ---------------------------------------------------------------------------

select is(
  (select company_name from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000220')),
  'Public Org Co B', 'organisation employer shows its company name'
);
select is(
  (select company_name from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000210')),
  null::text, 'private employer company name remains null'
);
select is(
  (select employer_display_name from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000210')),
  'Public Private Employer A', 'private employer display name is the profile display name'
);
select is(
  (select employer_display_name from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000220')),
  'Public Org Co B', 'organisation employer display name prefers the company name'
);
select is(
  (select company_name from public.get_effective_public_vacancy('22222222-2222-4222-8222-222222222201')),
  'Demo Berlin Work Co', 'seed vacancy shows its seed company name'
);
select is(
  (select employer_type from public.get_effective_public_vacancy('22222222-2222-4222-8222-222222222201')),
  null::text, 'seed vacancy has no real employer_type (no employer_profiles row)'
);
select is(
  (select website from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000220')),
  'https://public-org-b.example.test', 'organisation employer website is projected when set'
);

-- ---------------------------------------------------------------------------
-- Group F — languages
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::integer from public.get_effective_public_vacancy_languages('a2600000-0000-4000-8000-000000000210')),
  2, 'main vacancy returns both language requirements'
);
select is(
  (select array_agg(language_code order by language_code) from public.get_effective_public_vacancy_languages('a2600000-0000-4000-8000-000000000210')),
  array['de','en'], 'language requirements are ordered by language code ascending'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy_languages('a2600000-0000-4000-8000-000000000211')),
  0, 'draft vacancy languages are not returned even though rows exist'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy_languages('99999999-9999-4999-8999-999999999999')),
  0, 'nonexistent vacancy id returns zero language rows'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy_languages('a2600000-0000-4000-8000-000000000216')),
  0, 'elapsed-but-unmaterialized expiry vacancy languages are not returned even though rows exist'
);

-- ---------------------------------------------------------------------------
-- Group F2 — elapsed-but-unmaterialized expiry proven through all three
-- public RPCs, no timestamp argument involved
-- ---------------------------------------------------------------------------

select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000216'),
  'list RPC excludes stored-published-but-elapsed-expiry vacancy (re-confirmed post signature change)'
);
select is(
  (select count(*)::integer from public.get_effective_public_vacancy('a2600000-0000-4000-8000-000000000216')),
  0, 'detail RPC excludes stored-published-but-elapsed-expiry vacancy (re-confirmed post signature change)'
);

-- ---------------------------------------------------------------------------
-- Group F3 — runtime nullability (seed rows omit several fields the
-- employer-publish gate would otherwise require; the RPC must pass the
-- actual nulls through rather than coercing them)
-- ---------------------------------------------------------------------------

select is(
  (select description from public.get_effective_public_vacancy('22222222-2222-4222-8222-222222222201')),
  null::text, 'seed vacancy description is null (not coerced to empty string)'
);
select is(
  (select public_locality from public.get_effective_public_vacancy('22222222-2222-4222-8222-222222222201')),
  null::text, 'seed vacancy public_locality is null'
);
select is(
  (select workplace_type from public.get_effective_public_vacancy('22222222-2222-4222-8222-222222222201')),
  null::text, 'seed vacancy workplace_type is null'
);
select is(
  (select work_frequency from public.get_effective_public_vacancy('22222222-2222-4222-8222-222222222201')),
  null::text, 'seed vacancy work_frequency is null'
);
select is(
  (select cv_required from public.get_effective_public_vacancy('22222222-2222-4222-8222-222222222201')),
  null::boolean, 'seed vacancy cv_required is null'
);
select is(
  (select interview_english_ok from public.get_effective_public_vacancy('22222222-2222-4222-8222-222222222201')),
  null::boolean, 'seed vacancy interview_english_ok is null'
);
select is(
  (select website from public.get_effective_public_vacancy('22222222-2222-4222-8222-222222222201')),
  null::text, 'seed vacancy website is null (no real employer_profiles row)'
);

-- ---------------------------------------------------------------------------
-- Group G — state changes remove/restore live visibility
-- ---------------------------------------------------------------------------

select ok(
  exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000217'),
  'pause target starts effectively public'
);
set local role authenticated;
select set_config('request.jwt.claim.sub','a2600000-0000-4000-8000-000000000002',true);
select is(public.pause_employer_vacancy('a2600000-0000-4000-8000-000000000217')->>'status','ok','pause action succeeds');
reset role;
select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000217'),
  'pausing removes the vacancy from the effective-public list'
);
set local role authenticated;
select set_config('request.jwt.claim.sub','a2600000-0000-4000-8000-000000000002',true);
select is(public.resume_employer_vacancy('a2600000-0000-4000-8000-000000000217')->>'status','ok','resume action succeeds');
reset role;
select ok(
  exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000217'),
  'resuming restores effective-public visibility'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2600000-0000-4000-8000-000000000002',true);
select is(public.fill_employer_vacancy('a2600000-0000-4000-8000-000000000218')->>'status','ok','fill action succeeds');
reset role;
select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000218'),
  'filling removes the vacancy from the effective-public list'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a2600000-0000-4000-8000-000000000002',true);
select is(public.withdraw_employer_vacancy('a2600000-0000-4000-8000-000000000219')->>'status','ok','withdraw action succeeds');
reset role;
select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000219'),
  'withdrawing removes the vacancy from the effective-public list'
);

select ok(
  exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000220'),
  'employer B vacancy is public before verification revocation'
);
set local role authenticated;
select set_config('request.jwt.claim.sub','a2600000-0000-4000-8000-000000000001',true);
select is(
  public.revoke_employer_verification('a2600000-0000-4000-8000-000000000003','Trust concern')->>'status',
  'ok', 'operator revokes employer B verification'
);
reset role;
select ok(
  not exists(select 1 from public.list_effective_public_vacancies() where vacancy_id = 'a2600000-0000-4000-8000-000000000220'),
  'revoking employer verification removes its published vacancy from the effective-public list'
);

select * from finish();
rollback;
