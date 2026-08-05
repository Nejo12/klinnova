begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,recovery_token,email_change_token_new,email_change
) values
('00000000-0000-0000-0000-000000000000','a2400000-0000-4000-8000-000000000001','authenticated','authenticated','revoke-employer@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2400000-0000-4000-8000-000000000002','authenticated','authenticated','revoke-operator@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2400000-0000-4000-8000-000000000003','authenticated','authenticated','revoke-other@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.employer_profiles (
  id,employer_type,display_name,berlin_locality,lawful_hiring_declared,
  lawful_hiring_declared_at,onboarding_completed_at,verification_state,
  verification_requested_at,verification_reviewed_at,verification_reviewed_by,
  verification_attested_at,verification_attestation_version
) values (
  'a2400000-0000-4000-8000-000000000001','private','Revocation Employer','Mitte',true,
  now(),now(),'verified',now(),now(),'a2400000-0000-4000-8000-000000000002',now(),'v1'
);

insert into public.verification_operators (user_id,created_by)
values ('a2400000-0000-4000-8000-000000000002','a2400000-0000-4000-8000-000000000002');

insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,published_at,expires_at
) values
('a2400000-0000-4000-8000-000000000011','a2400000-0000-4000-8000-000000000001','Revoke One','revoke-one','summary','description','Berlin','Mitte','cleaning','{}','{}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now(),now()+interval '30 days'),
('a2400000-0000-4000-8000-000000000012','a2400000-0000-4000-8000-000000000001','Revoke Two','revoke-two','summary','description','Berlin','Mitte','cleaning','{}','{}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now(),now()+interval '30 days'),
('a2400000-0000-4000-8000-000000000013','a2400000-0000-4000-8000-000000000001','Keep Draft','keep-draft','summary','description','Berlin','Mitte','cleaning','{}','{}','none','private_home','recurring',1800,'EUR','hourly',true,true,true,'draft','employer',null,null);

select ok(public.is_vacancy_effectively_public('a2400000-0000-4000-8000-000000000011',now()),'published vacancy starts public');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2400000-0000-4000-8000-000000000003',true);
select is(public.revoke_employer_verification('a2400000-0000-4000-8000-000000000001','trust concern')->>'status','forbidden','non-operator cannot revoke');
select set_config('request.jwt.claim.sub','a2400000-0000-4000-8000-000000000002',true);
select is(public.revoke_employer_verification('a2400000-0000-4000-8000-000000000001','  ')->>'status','validation_error','blank revoke reason rejected');
select is(public.revoke_employer_verification('a2400000-0000-4000-8000-000000000001','Trust concern')->>'paused_vacancy_count','2','revoke pauses every published vacancy');
reset role;

select is((select verification_state from public.employer_profiles where id='a2400000-0000-4000-8000-000000000001'),'revoked','employer becomes revoked');
select is((select count(*)::integer from public.vacancies where employer_profile_id='a2400000-0000-4000-8000-000000000001' and publication_state='paused'),2,'published vacancies become paused');
select is((select publication_state from public.vacancies where id='a2400000-0000-4000-8000-000000000013'),'draft','draft remains draft');
select ok(not public.is_vacancy_effectively_public('a2400000-0000-4000-8000-000000000011',now()),'revoked vacancy immediately becomes non-public');
select is((select count(*)::integer from public.vacancy_lifecycle_events where event_type='paused' and vacancy_id in ('a2400000-0000-4000-8000-000000000011','a2400000-0000-4000-8000-000000000012')),2,'revocation appends pause events');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2400000-0000-4000-8000-000000000001',true);
select is((select count(*)::integer from public.vacancies where employer_profile_id='a2400000-0000-4000-8000-000000000001'),3,'owner reads every lifecycle state');
select is((select count(*)::integer from public.vacancy_lifecycle_events),2,'owner reads own lifecycle events');
select throws_ok(
  $$ insert into public.vacancy_lifecycle_events(vacancy_id,event_type) values ('a2400000-0000-4000-8000-000000000013','paused') $$,
  '42501',null,'owner cannot directly append lifecycle events'
);

select set_config('request.jwt.claim.sub','a2400000-0000-4000-8000-000000000003',true);
select is((select count(*)::integer from public.vacancies where employer_profile_id='a2400000-0000-4000-8000-000000000001'),0,'unrelated employer cannot read owned vacancies');
select is((select count(*)::integer from public.vacancy_lifecycle_events),0,'unrelated employer cannot read lifecycle events');
select is(public.revoke_employer_verification('a2400000-0000-4000-8000-000000000001','Again')->>'status','forbidden','non-operator remains forbidden after revoke');

reset role;
update public.verification_operators set active=false where user_id='a2400000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','a2400000-0000-4000-8000-000000000002',true);
select is(public.approve_employer_verification('a2400000-0000-4000-8000-000000000001')->>'status','forbidden','inactive operator is forbidden');

select * from finish();
rollback;
