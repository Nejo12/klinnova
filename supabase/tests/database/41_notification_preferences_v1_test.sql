begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a2800000-0000-4000-8000-000000000001','authenticated','authenticated','n280-employer-a@example.test',crypt('password',gen_salt('bf')),now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2800000-0000-4000-8000-000000000002','authenticated','authenticated','n280-employer-b@example.test',crypt('password',gen_salt('bf')),now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2800000-0000-4000-8000-000000000003','authenticated','authenticated','n280-candidate@example.test',crypt('password',gen_salt('bf')),now(),'{}','{}',now(),now(),'','','','');

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values
('a2800000-0000-4000-8000-000000000001','private','N280 Employer A','Mitte',true,now(),now(),'verified',now(),now(),'a2800000-0000-4000-8000-000000000001',now(),'v1'),
('a2800000-0000-4000-8000-000000000002','private','N280 Employer B','Mitte',true,now(),now(),'verified',now(),now(),'a2800000-0000-4000-8000-000000000002',now(),'v1');

insert into public.candidate_profiles (
  id, display_name, german_comfort, work_authorisation_declared,
  work_authorisation_declared_at, city, travel_radius_minutes, available_from,
  job_categories, employment_types, shift_preferences, onboarding_completed_at
) values (
  'a2800000-0000-4000-8000-000000000003','N280 Candidate','basic',true,
  now(),'Berlin',30,(timezone('Europe/Berlin', now()))::date,array['cleaning'],array['part_time'],array['daytime'],now()
);

insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('a2800000-0000-4000-8000-000000000003','en','conversational');

insert into public.vacancies (
  id, employer_profile_id, title, slug, summary, description, city, public_locality,
  job_category, employment_types, shift_requirements, german_requirement,
  workplace_type, work_frequency, salary_amount_cents, salary_currency, salary_period,
  salary_is_gross, cv_required, interview_english_ok, publication_state, source,
  published_at, expires_at
) values
('a2800000-0000-4000-8000-000000000011','a2800000-0000-4000-8000-000000000001','N280 Vacancy A1','n280-vacancy-a1','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a2800000-0000-4000-8000-000000000012','a2800000-0000-4000-8000-000000000001','N280 Vacancy A2','n280-vacancy-a2','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a2800000-0000-4000-8000-000000000013','a2800000-0000-4000-8000-000000000001','N280 Vacancy rollback','n280-vacancy-rollback','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days');

select has_table('public', 'notification_preferences', 'preference table exists');
select has_pk('public', 'notification_preferences', 'user/category primary key exists');
select is((select count(*)::int from information_schema.columns where table_schema='public' and table_name='notification_preferences'),5,'only approved columns');
select ok((select relrowsecurity from pg_class where oid='public.notification_preferences'::regclass),'RLS enabled');
select is((select count(*)::int from public.notification_preferences),0,'no backfill');
select throws_ok($$insert into public.notification_preferences(user_id,category,email_enabled) values('a2800000-0000-4000-8000-000000000003','marketing',true)$$,'23514',null,'other categories prohibited');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2800000-0000-4000-8000-000000000003',true);
select is(public.get_current_notification_email_preference('candidate_application_updates')->>'email_enabled','true','Candidate missing row enabled');
select is(public.set_current_notification_email_preference('employer_new_applicants',false)->>'result','unavailable','Candidate cannot change Employer category');
select is(public.get_current_notification_email_preference('employer_new_applicants')->>'result','unavailable','Candidate cannot read Employer category');
select is(public.set_current_notification_email_preference('candidate_application_updates',false)->>'result','ok','Candidate opt out succeeds');
select is(public.get_current_notification_email_preference('candidate_application_updates')->>'email_enabled','false','Candidate OFF durable');
select is(public.set_current_notification_email_preference('candidate_application_updates',true)->>'result','ok','Candidate opt in succeeds');
select is(public.get_current_notification_email_preference('candidate_application_updates')->>'email_enabled','true','Candidate ON durable');
select is(public.set_current_notification_email_preference('candidate_application_updates',false)->>'result','ok','Candidate OFF for product proof');
select is(public.set_current_notification_email_preference('push',false)->>'result','unavailable','unknown category denied');
select is(public.set_current_notification_email_preference('candidate_application_updates',null)->>'result','unavailable','null boolean denied');
select throws_ok($$insert into public.notification_preferences(user_id,category,email_enabled) values('a2800000-0000-4000-8000-000000000001','employer_new_applicants',false)$$,'42501',null,'arbitrary preference insert denied');
select throws_ok($$update public.notification_preferences set email_enabled=true where user_id='a2800000-0000-4000-8000-000000000001'$$,'42501',null,'arbitrary preference update denied');

select set_config('request.jwt.claim.sub','a2800000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from public.notification_preferences),0,'Employer cannot read Candidate row');
select is(public.get_current_notification_email_preference('candidate_application_updates')->>'result','unavailable','Employer cannot read Candidate category');
select is(public.set_current_notification_email_preference('candidate_application_updates',false)->>'result','unavailable','Employer cannot change Candidate category');
select is(public.get_current_notification_email_preference('employer_new_applicants')->>'email_enabled','true','Employer missing row enabled');
select is(public.set_current_notification_email_preference('employer_new_applicants',false)->>'result','ok','Employer opt out succeeds');
select is(public.get_current_notification_email_preference('employer_new_applicants')->>'email_enabled','false','Employer OFF durable');
select is(public.set_current_notification_email_preference('employer_new_applicants',true)->>'result','ok','Employer ON succeeds');
select is(public.set_current_notification_email_preference('employer_new_applicants',false)->>'result','ok','Employer OFF for product proof');
select set_config('request.jwt.claim.sub','a2800000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from public.notification_preferences),0,'unrelated user cannot read others');
select is(public.get_current_notification_email_preference('employer_new_applicants')->>'email_enabled','true','other Employer remains default enabled');

-- Email OFF does not enter application transaction logic or suppress notifications.
select set_config('request.jwt.claim.sub','a2800000-0000-4000-8000-000000000003',true);
select is(public.submit_candidate_application('a2800000-0000-4000-8000-000000000011',null)->>'result','submitted','submit with both Email categories OFF');
select is(public.submit_candidate_application('a2800000-0000-4000-8000-000000000011',null)->>'result','already_applied','repeat submission remains unchanged');
select is(public.submit_candidate_application('a2800000-0000-4000-8000-000000000012',null)->>'result','submitted','second submission');
reset role;
select is((select count(*)::int from public.notifications where kind='new_application' and recipient_user_id='a2800000-0000-4000-8000-000000000001'),2,'Employer durable notifications independent of Email OFF');
select is((select count(*)::int from public.notifications where kind like 'application_%' and recipient_user_id='a2800000-0000-4000-8000-000000000003'),0,'submitted no Candidate event');
create temporary table n280_apps as select id,vacancy_id from public.applications where candidate_id='a2800000-0000-4000-8000-000000000003';
grant select on n280_apps to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','a2800000-0000-4000-8000-000000000001',true);
select is(public.transition_current_employer_application_status((select id from n280_apps where vacancy_id='a2800000-0000-4000-8000-000000000011'),'reviewing',null)->>'result','updated','reviewing unchanged');
select is(public.transition_current_employer_application_status((select id from n280_apps where vacancy_id='a2800000-0000-4000-8000-000000000011'),'shortlisted',null)->>'result','updated','shortlist with Email OFF');
select is(public.transition_current_employer_application_status((select id from n280_apps where vacancy_id='a2800000-0000-4000-8000-000000000011'),'shortlisted',null)->>'result','already_in_state','retry unchanged');
select is(public.transition_current_employer_application_status((select id from n280_apps where vacancy_id='a2800000-0000-4000-8000-000000000011'),'accepted',null)->>'result','updated','accept with Email OFF');
select is(public.transition_current_employer_application_status((select id from n280_apps where vacancy_id='a2800000-0000-4000-8000-000000000012'),'rejected','private reason')->>'result','updated','reject with Email OFF');
reset role;
select is((select count(*)::int from public.notifications where kind like 'application_%' and recipient_user_id='a2800000-0000-4000-8000-000000000003'),3,'all three Candidate events remain durable with Email OFF');
select is((select count(*)::int from public.application_outcome_events where application_id in(select id from n280_apps)),0,'acceptance still not hiring');

-- Dual role independence; role gating follows current lifecycle.
insert into public.candidate_profiles(id,display_name,onboarding_completed_at) values('a2800000-0000-4000-8000-000000000001','Dual Candidate',now());
set local role authenticated;
select is(public.set_current_notification_email_preference('candidate_application_updates',true)->>'result','ok','dual-role Candidate category enabled');
select is(public.get_current_notification_email_preference('employer_new_applicants')->>'email_enabled','false','dual-role Employer OFF unchanged');
select is(public.get_current_notification_email_preference('candidate_application_updates')->>'email_enabled','true','dual-role Candidate ON unchanged');
reset role;
update public.candidate_profiles set onboarding_completed_at=null where id='a2800000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.get_current_notification_email_preference('candidate_application_updates')->>'result','unavailable','incomplete Candidate denied');
reset role;
update public.candidate_profiles set account_deleted_at=now() where id='a2800000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','a2800000-0000-4000-8000-000000000003',true);
select is(public.set_current_notification_email_preference('candidate_application_updates',true)->>'result','unavailable','deleted Candidate denied');
reset role;
insert into public.employer_suspension(employer_profile_id,suspended_by,suspended_reason) values('a2800000-0000-4000-8000-000000000002','a2800000-0000-4000-8000-000000000001','test suspension');
set local role authenticated;
select set_config('request.jwt.claim.sub','a2800000-0000-4000-8000-000000000002',true);
select is(public.set_current_notification_email_preference('employer_new_applicants',false)->>'result','unavailable','suspended Employer denied');
reset role;
update public.employer_profiles set onboarding_completed_at=null where id='a2800000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','a2800000-0000-4000-8000-000000000001',true);
select is(public.get_current_notification_email_preference('employer_new_applicants')->>'result','unavailable','incomplete Employer denied');
reset role;

-- Deleted Employer denial is independent of suspension.
delete from public.employer_suspension where employer_profile_id='a2800000-0000-4000-8000-000000000002';
update public.employer_profiles set account_deleted_at=now() where id='a2800000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','a2800000-0000-4000-8000-000000000002',true);
select is(public.get_current_notification_email_preference('employer_new_applicants')->>'result','unavailable','deleted Employer getter denied');
select is(public.set_current_notification_email_preference('employer_new_applicants',true)->>'result','unavailable','deleted Employer setter denied');
reset role;

-- Isolated user for FK cascade proof, without unrelated product references.
insert into auth.users(id,email) values('a2800000-0000-4000-8000-000000000004','n280-cascade@example.test');
insert into public.notification_preferences(user_id,category,email_enabled) values('a2800000-0000-4000-8000-000000000004','candidate_application_updates',false);
select throws_ok($$insert into public.notification_preferences(user_id,category,email_enabled) values('a2800000-0000-4000-8000-000000000004','candidate_application_updates',true)$$,'23505',null,'user/category uniqueness');
delete from auth.users where id='a2800000-0000-4000-8000-000000000004';
select is((select count(*)::int from public.notification_preferences where user_id='a2800000-0000-4000-8000-000000000004'),0,'Auth deletion cascades preference');
set local role anon;
select throws_ok($$select * from public.notification_preferences$$,'42501',null,'anon table denied');
select throws_ok($$select public.get_current_notification_email_preference('candidate_application_updates')$$,'42501',null,'anon getter denied');
select throws_ok($$select public.set_current_notification_email_preference('employer_new_applicants',false)$$,'42501',null,'anon setter denied');
reset role;
select * from finish();
rollback;
