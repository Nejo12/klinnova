begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000','a2200000-0000-4000-8000-000000000001',
  'authenticated','authenticated','lifecycle-owner@example.test',crypt('password',gen_salt('bf')),now(),
  '{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''
);

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values (
  'a2200000-0000-4000-8000-000000000001','private','Lifecycle Owner','Mitte',true,
  now(),now(),'verified',now(),now(),'a2200000-0000-4000-8000-000000000001',now(),'v1'
);

insert into public.vacancies (
  id, employer_profile_id, title, slug, summary, description, city, public_locality,
  job_category, employment_types, shift_requirements, german_requirement,
  workplace_type, work_frequency, salary_amount_cents, salary_currency,
  salary_period, salary_is_gross, cv_required, interview_english_ok,
  publication_state, source
) values
('a2200000-0000-4000-8000-000000000011','a2200000-0000-4000-8000-000000000001','Lifecycle One','lifecycle-one','summary','description','Berlin','Mitte','cleaning','{}','{}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer'),
('a2200000-0000-4000-8000-000000000012','a2200000-0000-4000-8000-000000000001','Lifecycle Two','lifecycle-two','summary','description','Berlin','Mitte','cleaning','{}','{}','none','private_home','recurring',1800,'EUR','hourly',true,false,true,'draft','employer'),
('a2200000-0000-4000-8000-000000000013','a2200000-0000-4000-8000-000000000001','Lifecycle Three','lifecycle-three','summary','description','Berlin','Mitte','cleaning','{}','{}','none','private_home','recurring',1800,'EUR','hourly',true,true,false,'draft','employer');

insert into public.vacancy_language_requirements (vacancy_id,language_code,min_proficiency)
values
('a2200000-0000-4000-8000-000000000011','en','basic'),
('a2200000-0000-4000-8000-000000000012','en','basic'),
('a2200000-0000-4000-8000-000000000013','en','basic');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2200000-0000-4000-8000-000000000001',true);

select is(public.publish_employer_vacancy('a2200000-0000-4000-8000-000000000011')->>'status','ok','ready draft publishes');
select is(public.publish_employer_vacancy('a2200000-0000-4000-8000-000000000011')->>'status','ok','publish is idempotent');
select is((select count(*)::integer from public.vacancy_lifecycle_events where vacancy_id='a2200000-0000-4000-8000-000000000011' and event_type='published'),1,'idempotent publish creates one event');
select is(public.pause_employer_vacancy('a2200000-0000-4000-8000-000000000011')->>'status','ok','published vacancy pauses');
select is(public.pause_employer_vacancy('a2200000-0000-4000-8000-000000000011')->>'status','ok','pause is idempotent');
select is((select count(*)::integer from public.vacancy_lifecycle_events where vacancy_id='a2200000-0000-4000-8000-000000000011' and event_type='paused'),1,'idempotent pause creates one event');
select is(public.update_employer_vacancy_draft('a2200000-0000-4000-8000-000000000011',p_title:='Edited While Paused')->>'status','ok','paused vacancy is editable');
select is((select publication_state from public.vacancies where id='a2200000-0000-4000-8000-000000000011'),'paused','paused edit preserves lifecycle');
select is(public.replace_employer_vacancy_languages('a2200000-0000-4000-8000-000000000011','[{"language_code":"de","min_proficiency":"basic"}]')->>'status','ok','paused languages are editable');
select is(public.resume_employer_vacancy('a2200000-0000-4000-8000-000000000011')->>'status','ok','paused vacancy resumes');
select is(public.fill_employer_vacancy('a2200000-0000-4000-8000-000000000011')->>'status','ok','published vacancy fills');
select is(public.resume_employer_vacancy('a2200000-0000-4000-8000-000000000011')->>'status','invalid_state','filled vacancy is terminal');

select is(public.publish_employer_vacancy('a2200000-0000-4000-8000-000000000012',now()+interval '91 days')->>'status','incomplete','expiry over ninety days rejected');
select is(public.publish_employer_vacancy('a2200000-0000-4000-8000-000000000012')->>'status','ok','second vacancy publishes');
select is(public.withdraw_employer_vacancy('a2200000-0000-4000-8000-000000000012')->>'status','ok','published vacancy withdraws');
select is(public.pause_employer_vacancy('a2200000-0000-4000-8000-000000000012')->>'status','invalid_state','withdrawn vacancy is terminal');

select is(public.publish_employer_vacancy('a2200000-0000-4000-8000-000000000013',now()+interval '1 minute')->>'status','ok','third vacancy publishes');
reset role;
update public.vacancies
set published_at=now()-interval '2 minutes',
    expires_at=now()-interval '1 minute'
where id='a2200000-0000-4000-8000-000000000013';
set local role authenticated;
select is(public.materialize_employer_vacancy_expiry('a2200000-0000-4000-8000-000000000013')->>'status','ok','due expiry materializes');
select is(public.materialize_employer_vacancy_expiry('a2200000-0000-4000-8000-000000000013')->>'status','ok','materialized expiry is idempotent');
select is(public.renew_employer_vacancy_to_draft('a2200000-0000-4000-8000-000000000013')->>'status','ok','expired vacancy renews to draft');
select is(public.pause_employer_vacancy('22222222-2222-4222-8222-222222222201')->>'status','unavailable','seed vacancy rejected by lifecycle RPC');

select * from finish();
rollback;
