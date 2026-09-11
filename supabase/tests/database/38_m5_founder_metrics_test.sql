begin;

create extension if not exists pgtap with schema extensions;
select plan(54);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a3800000-0000-4000-8000-000000000001','authenticated','authenticated','m5-operator@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3800000-0000-4000-8000-000000000002','authenticated','authenticated','m5-plain@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3800000-0000-4000-8000-000000000011','authenticated','authenticated','m5-employer-1@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3800000-0000-4000-8000-000000000012','authenticated','authenticated','m5-employer-2@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3800000-0000-4000-8000-000000000013','authenticated','authenticated','m5-employer-3@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3800000-0000-4000-8000-000000000014','authenticated','authenticated','m5-employer-4@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3800000-0000-4000-8000-000000000015','authenticated','authenticated','m5-employer-5@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3800000-0000-4000-8000-000000000021','authenticated','authenticated','m5-candidate-pre-no@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3800000-0000-4000-8000-000000000022','authenticated','authenticated','m5-candidate-pre-yes@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a3800000-0000-4000-8000-000000000023','authenticated','authenticated','m5-candidate-post@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.verification_operators (user_id, created_by)
values ('a3800000-0000-4000-8000-000000000001','a3800000-0000-4000-8000-000000000001');

select has_table('public','m5_candidate_cohort_enrollments','Candidate cohort enrollment ledger exists');
select has_table('public','m5_vacancy_qualifications','vacancy qualification ledger exists');
select col_is_pk('public','m5_candidate_cohort_enrollments','candidate_user_id','one enrollment row per Candidate');
select col_is_pk('public','m5_vacancy_qualifications','vacancy_id','one qualification row per vacancy');

select throws_ok(
  $$ insert into public.m5_candidate_cohort_enrollments (candidate_user_id, cohort) values ('a3800000-0000-4000-8000-000000000021','cohort_x') $$,
  '23514',
  null,
  'cohort is allow-listed'
);

set local role anon;
select throws_ok(
  $$ select * from public.m5_candidate_cohort_enrollments $$,
  '42501',
  null,
  'anonymous users cannot read Candidate enrollment rows'
);
select ok(
  not has_function_privilege('anon','public.get_m5_founder_metrics()','execute'),
  'anonymous users cannot execute the metrics RPC'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a3800000-0000-4000-8000-000000000021',true);
select throws_ok(
  $$ insert into public.m5_candidate_cohort_enrollments (candidate_user_id, cohort) values ('a3800000-0000-4000-8000-000000000021','cohort_a') $$,
  '42501',
  null,
  'a Candidate cannot self-enroll'
);
select throws_ok(
  $$ select * from public.m5_vacancy_qualifications $$,
  '42501',
  null,
  'ordinary authenticated users cannot read qualification rows'
);
select throws_ok(
  $$ update public.m5_candidate_cohort_enrollments set cohort = 'cohort_b' $$,
  '42501',
  null,
  'ordinary authenticated users cannot update enrollments'
);
select throws_ok(
  $$ update public.m5_vacancy_qualifications set qualified_at = now() $$,
  '42501',
  null,
  'ordinary authenticated users cannot rewrite qualifications'
);
reset role;

insert into public.candidate_profiles (
  id, display_name, german_comfort, work_authorisation_declared,
  work_authorisation_declared_at, city, travel_radius_minutes, available_from,
  job_categories, employment_types, shift_preferences, onboarding_completed_at
) values
('a3800000-0000-4000-8000-000000000021','M5 Pre No','basic',true,now(),'Berlin',30,current_date,array['cleaning'],array['part_time'],array['daytime'],'2026-08-01T00:00:00Z'),
('a3800000-0000-4000-8000-000000000022','M5 Pre Yes','basic',true,now(),'Berlin',30,current_date,array['cleaning'],array['part_time'],array['daytime'],'2026-08-01T00:00:00Z'),
('a3800000-0000-4000-8000-000000000023','M5 Post','basic',true,now(),'Berlin',30,current_date,array['cleaning'],array['part_time'],array['daytime'],now());

insert into public.m5_candidate_cohort_enrollments (
  candidate_user_id,
  cohort,
  enrolled_at
) values (
  'a3800000-0000-4000-8000-000000000022',
  'cohort_a',
  now()
);

select throws_ok(
  $$ insert into public.m5_candidate_cohort_enrollments (candidate_user_id, cohort) values ('a3800000-0000-4000-8000-000000000022','cohort_b') $$,
  '23505',
  null,
  'a Candidate cannot have ambiguous duplicate cohort enrollment'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3800000-0000-4000-8000-000000000001',true);
select is(
  public.get_m5_founder_metrics() #>> '{conversions,application_to_interview_percent}',
  null,
  'zero submitted-application denominator returns null'
);
select is(
  public.get_m5_founder_metrics() #>> '{conversions,interview_to_hire_percent}',
  null,
  'zero interview denominator returns null'
);
reset role;

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values
('a3800000-0000-4000-8000-000000000011','private','M5 Employer 1','Mitte',true,now(),now(),'verified',now(),now(),'a3800000-0000-4000-8000-000000000001',now(),'v1'),
('a3800000-0000-4000-8000-000000000012','private','M5 Employer 2','Mitte',true,now(),null,'verified',now(),now(),'a3800000-0000-4000-8000-000000000001',now(),'v1'),
('a3800000-0000-4000-8000-000000000013','private','M5 Employer 3','Mitte',true,now(),now(),'verified',now(),now(),'a3800000-0000-4000-8000-000000000001',now(),'v1'),
('a3800000-0000-4000-8000-000000000014','private','M5 Employer 4','Mitte',true,now(),now(),'verified',now(),now(),'a3800000-0000-4000-8000-000000000001',now(),'v1'),
('a3800000-0000-4000-8000-000000000015','private','M5 Employer 5','Mitte',true,now(),now(),'verified',now(),now(),'a3800000-0000-4000-8000-000000000001',now(),'v1');

insert into public.vacancies (
  id, employer_profile_id, title, slug, summary, description, city, public_locality,
  job_category, employment_types, shift_requirements, german_requirement,
  workplace_type, work_frequency, salary_amount_cents, salary_currency,
  salary_period, salary_is_gross, cv_required, interview_english_ok,
  publication_state, source, published_at, expires_at
) values
('a3800000-0000-4000-8000-000000000041','a3800000-0000-4000-8000-000000000011','M5 Publish','m5-publish','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer',null,null),
('a3800000-0000-4000-8000-000000000042','a3800000-0000-4000-8000-000000000012','M5 Complete','m5-complete','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a3800000-0000-4000-8000-000000000043','a3800000-0000-4000-8000-000000000013','M5 Unsuspend','m5-unsuspend','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a3800000-0000-4000-8000-000000000044','a3800000-0000-4000-8000-000000000014','M5 Restore','m5-restore','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a3800000-0000-4000-8000-000000000045','a3800000-0000-4000-8000-000000000015','M5 Blocked','m5-blocked','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a3800000-0000-4000-8000-000000000046','a3800000-0000-4000-8000-000000000011','M5 No History','m5-no-history','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days');

insert into public.vacancy_language_requirements (
  vacancy_id,
  language_code,
  min_proficiency
) values ('a3800000-0000-4000-8000-000000000041','en','basic');

select is(
  (select count(*)::integer from public.m5_vacancy_qualifications where vacancy_id = 'a3800000-0000-4000-8000-000000000046'),
  0,
  'current mutable public state alone creates no historical qualification'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3800000-0000-4000-8000-000000000011',true);
select is(
  public.publish_employer_vacancy('a3800000-0000-4000-8000-000000000041')->>'status',
  'ok',
  'publish succeeds when canonical conditions are met'
);
reset role;
select is(
  (select count(*)::integer from public.m5_vacancy_qualifications where vacancy_id = 'a3800000-0000-4000-8000-000000000041'),
  1,
  'publish records one qualification'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3800000-0000-4000-8000-000000000011',true);
select is(
  public.publish_employer_vacancy('a3800000-0000-4000-8000-000000000041')->>'status',
  'ok',
  'idempotent publish remains successful'
);
reset role;
select is(
  (select count(*)::integer from public.m5_vacancy_qualifications where vacancy_id = 'a3800000-0000-4000-8000-000000000041'),
  1,
  'idempotent publish cannot duplicate qualification'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3800000-0000-4000-8000-000000000011',true);
select is(
  public.pause_employer_vacancy('a3800000-0000-4000-8000-000000000041')->>'status',
  'ok',
  'qualified vacancy pauses'
);
select is(
  public.resume_employer_vacancy('a3800000-0000-4000-8000-000000000041')->>'status',
  'ok',
  'qualified vacancy resumes'
);
reset role;
select is(
  (select count(*)::integer from public.m5_vacancy_qualifications where vacancy_id = 'a3800000-0000-4000-8000-000000000041'),
  1,
  'resume preserves exactly one first qualification'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3800000-0000-4000-8000-000000000012',true);
select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'employer completes onboarding'
);
reset role;
select is(
  (select count(*)::integer from public.m5_vacancy_qualifications where vacancy_id = 'a3800000-0000-4000-8000-000000000042'),
  1,
  'onboarding completion qualifies an already-published eligible vacancy'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3800000-0000-4000-8000-000000000001',true);
select is(
  public.suspend_employer('a3800000-0000-4000-8000-000000000013','proof hold')->>'status',
  'ok',
  'operator suspends employer'
);
select is(
  public.unsuspend_employer('a3800000-0000-4000-8000-000000000013')->>'status',
  'ok',
  'operator unsuspends employer'
);
reset role;
select is(
  (select count(*)::integer from public.m5_vacancy_qualifications where vacancy_id = 'a3800000-0000-4000-8000-000000000043'),
  1,
  'unsuspension records qualification when canonical public status is restored'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3800000-0000-4000-8000-000000000001',true);
select is(
  public.moderate_vacancy('a3800000-0000-4000-8000-000000000044','proof moderation')->>'status',
  'ok',
  'operator moderates vacancy'
);
select is(
  public.restore_vacancy('a3800000-0000-4000-8000-000000000044')->>'status',
  'ok',
  'operator restores vacancy'
);
reset role;
select is(
  (select count(*)::integer from public.m5_vacancy_qualifications where vacancy_id = 'a3800000-0000-4000-8000-000000000044'),
  1,
  'restoration records qualification when canonical public status is restored'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3800000-0000-4000-8000-000000000001',true);
select is(
  public.moderate_vacancy('a3800000-0000-4000-8000-000000000045','still blocked')->>'status',
  'ok',
  'blocked fixture is moderated'
);
select is(
  public.suspend_employer('a3800000-0000-4000-8000-000000000015','second blocker')->>'status',
  'ok',
  'blocked fixture employer is suspended'
);
select is(
  public.unsuspend_employer('a3800000-0000-4000-8000-000000000015')->>'status',
  'ok',
  'one blocker is removed'
);
reset role;
select is(
  (select count(*)::integer from public.m5_vacancy_qualifications where vacancy_id = 'a3800000-0000-4000-8000-000000000045'),
  0,
  'non-qualifying transition records nothing while moderation remains'
);

insert into public.companies (id, name, slug, source)
values ('a3800000-0000-4000-8000-000000000031','M5 Seed','m5-seed','seed');
insert into public.vacancies (
  id, company_id, title, slug, summary, city, job_category, employment_types,
  shift_requirements, german_requirement, publication_state, source,
  published_at, expires_at
) values (
  'a3800000-0000-4000-8000-000000000047',
  'a3800000-0000-4000-8000-000000000031',
  'M5 Seed',
  'm5-seed',
  'summary',
  'Berlin',
  'cleaning',
  array['part_time'],
  array['daytime'],
  'none',
  'published',
  'seed',
  now(),
  now() + interval '30 days'
);
select is(
  (select count(*)::integer from public.m5_vacancy_qualifications where vacancy_id = 'a3800000-0000-4000-8000-000000000047'),
  0,
  'seed/demo vacancies never qualify'
);

update public.employer_profiles
set lawful_hiring_declared = false
where id = 'a3800000-0000-4000-8000-000000000011';
select is(
  (select onboarding_completed_at from public.employer_profiles where id = 'a3800000-0000-4000-8000-000000000011'),
  null,
  'later profile edit can clear current onboarding completion'
);
select is(
  (select count(*)::integer from public.m5_vacancy_qualifications where vacancy_id = 'a3800000-0000-4000-8000-000000000041'),
  1,
  'later profile edits cannot erase historical qualification'
);

insert into public.applications (
  id, candidate_id, vacancy_id, status, snapshot_version,
  candidate_snapshot, vacancy_snapshot, submitted_at
) values
('a3800000-0000-4000-8000-000000000061','a3800000-0000-4000-8000-000000000022','a3800000-0000-4000-8000-000000000042','submitted',1,'{}'::jsonb,'{}'::jsonb,now()),
('a3800000-0000-4000-8000-000000000062','a3800000-0000-4000-8000-000000000023','a3800000-0000-4000-8000-000000000043','accepted',1,'{}'::jsonb,'{}'::jsonb,now());

insert into public.application_outcome_events (
  application_id, outcome_type, occurred_at, recorded_by
) values
('a3800000-0000-4000-8000-000000000061','interview_completed',now(),'a3800000-0000-4000-8000-000000000012'),
('a3800000-0000-4000-8000-000000000061','interview_completed',now(),'a3800000-0000-4000-8000-000000000012'),
('a3800000-0000-4000-8000-000000000061','hired',now(),'a3800000-0000-4000-8000-000000000012');

set local role authenticated;
select set_config('request.jwt.claim.sub','a3800000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$ select public.get_m5_founder_metrics() $$,
  '42501',
  null,
  'an authenticated non-operator cannot read metrics'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a3800000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$ select public.get_m5_founder_metrics() $$,
  'an active operator can read aggregate metrics'
);
select is(
  (public.get_m5_founder_metrics() #>> '{core,verified_vacancies}')::integer,
  4,
  'metrics use four durable qualification records'
);
select is(
  (public.get_m5_founder_metrics() #>> '{core,participating_employers}')::integer,
  4,
  'participating employers count distinct qualification owners'
);
select is(
  (public.get_m5_founder_metrics() #>> '{core,completed_candidates}')::integer,
  2,
  'pre-M5 Candidate requires enrollment while post-M5 Candidate counts normally'
);
select is(
  (public.get_m5_founder_metrics() #>> '{core,submitted_applications}')::integer,
  2,
  'submitted applications count employer-vacancy applications during M5'
);
select is(
  (public.get_m5_founder_metrics() #>> '{core,completed_interview_conversions}')::integer,
  1,
  'multiple completed rounds count as one top-level interview conversion'
);
select is(
  (public.get_m5_founder_metrics() #>> '{diagnostic,completed_interview_rounds}')::integer,
  2,
  'diagnostic completed rounds preserve multiplicity'
);
select is(
  (public.get_m5_founder_metrics() #>> '{core,confirmed_hires}')::integer,
  1,
  'only an active hired event counts; accepted status alone does not'
);
select is(
  (public.get_m5_founder_metrics() #>> '{current_supply,effective_public_vacancies}')::integer,
  3,
  'current effective-public supply remains distinct from four historical qualifications'
);
select is(
  (public.get_m5_founder_metrics() #>> '{current_supply,active_safe_participating_employers}')::integer,
  3,
  'current active/safe employers remain distinct from cumulative participation'
);
select is(
  public.get_m5_founder_metrics() #>> '{conversions,candidate_to_application_percent}',
  '100.0',
  'Candidate-to-application conversion uses distinct counted Candidates'
);
select is(
  public.get_m5_founder_metrics() #>> '{conversions,application_to_interview_percent}',
  '50.0',
  'application-to-interview conversion uses distinct converted applications'
);
select is(
  public.get_m5_founder_metrics() #>> '{conversions,interview_to_hire_percent}',
  '100.0',
  'interview-to-hire conversion uses active outcome facts'
);
select ok(
  position('email' in public.get_m5_founder_metrics()::text) = 0,
  'aggregate output contains no email field'
);
select ok(
  position('candidate_snapshot' in public.get_m5_founder_metrics()::text) = 0,
  'aggregate output contains no user-authored snapshot field'
);
reset role;

select is(
  (select provolatile::text from pg_proc where oid = 'public.get_m5_founder_metrics()'::regprocedure),
  's',
  'metrics RPC is declared STABLE and introduces no mutation'
);

select * from finish();
rollback;
