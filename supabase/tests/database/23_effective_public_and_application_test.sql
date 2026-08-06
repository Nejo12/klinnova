begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,recovery_token,email_change_token_new,email_change
) values
('00000000-0000-0000-0000-000000000000','a2300000-0000-4000-8000-000000000001','authenticated','authenticated','public-employer@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2300000-0000-4000-8000-000000000002','authenticated','authenticated','public-candidate@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.employer_profiles (
  id,employer_type,display_name,berlin_locality,lawful_hiring_declared,
  lawful_hiring_declared_at,onboarding_completed_at,verification_state,
  verification_requested_at,verification_reviewed_at,verification_reviewed_by,
  verification_attested_at,verification_attestation_version
) values (
  'a2300000-0000-4000-8000-000000000001','private','Public Private Employer','Mitte',true,
  now(),now(),'verified',now(),now(),'a2300000-0000-4000-8000-000000000001',now(),'v1'
);

insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'a2300000-0000-4000-8000-000000000002','Public Candidate','basic',true,
  now(),'Berlin',30,(timezone('Europe/Berlin', now()))::date,array['cleaning'],array['part_time'],array['daytime'],now()
);

insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values (
  'a2300000-0000-4000-8000-000000000011','a2300000-0000-4000-8000-000000000001',
  'Public Employer Vacancy','public-employer-vacancy','summary','description','Berlin','Mitte',
  'cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',
  1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'
);

insert into public.vacancy_language_requirements (vacancy_id,language_code,min_proficiency)
values ('a2300000-0000-4000-8000-000000000011','en','basic');
insert into public.candidate_languages (candidate_id,language_code,proficiency)
values ('a2300000-0000-4000-8000-000000000002','en','conversational');

select ok(public.is_vacancy_effectively_public('22222222-2222-4222-8222-222222222201',now()),'active seed vacancy is effectively public');
select ok(public.is_vacancy_effectively_public('a2300000-0000-4000-8000-000000000011',now()),'verified employer vacancy is effectively public');
select ok(exists(select 1 from public.visible_public_vacancy_ids(now()) ids where ids='a2300000-0000-4000-8000-000000000011'),'visible helper includes employer vacancy');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2300000-0000-4000-8000-000000000002',true);
select is(public.submit_candidate_application('a2300000-0000-4000-8000-000000000011')->>'result','submitted','candidate applies to public employer vacancy');
select is(public.submit_candidate_application('a2300000-0000-4000-8000-000000000011')->>'result','already_applied','employer vacancy application remains unique');
reset role;
select is((select vacancy_snapshot->>'employer_display_name' from public.applications where vacancy_id='a2300000-0000-4000-8000-000000000011'),'Public Private Employer','private employer display name is snapshotted');

update public.vacancies set publication_state='paused',paused_at=now() where id='a2300000-0000-4000-8000-000000000011';
select ok(not public.is_vacancy_effectively_public('a2300000-0000-4000-8000-000000000011',now()),'paused vacancy is not effectively public');
set local role authenticated;
select is(public.submit_candidate_application('a2300000-0000-4000-8000-000000000011')->>'result','unavailable','paused vacancy rejects new submit resolution');
reset role;

update public.vacancies set publication_state='published',paused_at=null,expires_at=now()-interval '1 minute' where id='a2300000-0000-4000-8000-000000000011';
select ok(not public.is_vacancy_effectively_public('a2300000-0000-4000-8000-000000000011',now()),'expired time window is never public before materialization');
select ok(not exists(select 1 from public.visible_public_vacancy_ids(now()) ids where ids='a2300000-0000-4000-8000-000000000011'),'expired vacancy omitted from visible ids');

set local role anon;
select ok(exists(select 1 from public.visible_public_vacancy_ids(now())),'anon can call field-safe public id helper');
select throws_ok($$ select * from public.vacancies $$,'42501',null,'anon still cannot select vacancies table');

select * from finish();
rollback;
