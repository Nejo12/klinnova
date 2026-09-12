begin;

create extension if not exists pgtap with schema extensions;
select plan(48);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a2310000-0000-4000-8000-000000000001','authenticated','authenticated','n231-employer-a@example.test',crypt('password',gen_salt('bf')),now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2310000-0000-4000-8000-000000000002','authenticated','authenticated','n231-employer-b@example.test',crypt('password',gen_salt('bf')),now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2310000-0000-4000-8000-000000000003','authenticated','authenticated','n231-candidate@example.test',crypt('password',gen_salt('bf')),now(),'{}','{}',now(),now(),'','','','');

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values
('a2310000-0000-4000-8000-000000000001','private','N231 Employer A','Mitte',true,now(),now(),'verified',now(),now(),'a2310000-0000-4000-8000-000000000001',now(),'v1'),
('a2310000-0000-4000-8000-000000000002','private','N231 Employer B','Mitte',true,now(),now(),'verified',now(),now(),'a2310000-0000-4000-8000-000000000002',now(),'v1');

insert into public.candidate_profiles (
  id, display_name, german_comfort, work_authorisation_declared,
  work_authorisation_declared_at, city, travel_radius_minutes, available_from,
  job_categories, employment_types, shift_preferences, onboarding_completed_at
) values (
  'a2310000-0000-4000-8000-000000000003','N231 Candidate','basic',true,
  now(),'Berlin',30,(timezone('Europe/Berlin', now()))::date,array['cleaning'],array['part_time'],array['daytime'],now()
);

insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('a2310000-0000-4000-8000-000000000003','en','conversational');

insert into public.vacancies (
  id, employer_profile_id, title, slug, summary, description, city, public_locality,
  job_category, employment_types, shift_requirements, german_requirement,
  workplace_type, work_frequency, salary_amount_cents, salary_currency, salary_period,
  salary_is_gross, cv_required, interview_english_ok, publication_state, source,
  published_at, expires_at
) values
('a2310000-0000-4000-8000-000000000011','a2310000-0000-4000-8000-000000000001','N231 Vacancy A1','n231-vacancy-a1','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a2310000-0000-4000-8000-000000000012','a2310000-0000-4000-8000-000000000001','N231 Vacancy A2','n231-vacancy-a2','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a2310000-0000-4000-8000-000000000013','a2310000-0000-4000-8000-000000000001','N231 Vacancy rollback','n231-vacancy-rollback','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days');

-- Schema and privilege contract (16)
select has_table('public','notifications','notifications table exists');
select has_column('public','notifications','id','id exists');
select has_column('public','notifications','recipient_user_id','recipient exists');
select has_column('public','notifications','kind','kind exists');
select has_column('public','notifications','application_id','application exists');
select has_column('public','notifications','created_at','created_at exists');
select has_column('public','notifications','read_at','read_at exists');
select ok(exists(select 1 from pg_constraint where conrelid='public.notifications'::regclass and conname='notifications_kind_check' and contype='c'),'kind allow-list is checked');
select ok(exists(select 1 from pg_constraint where conrelid='public.notifications'::regclass and conname='notifications_recipient_application_kind_key' and contype='u'),'event uniqueness exists');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='notifications' and indexname='notifications_recipient_created_at_idx'),'recipient chronology index exists');
select is((select relrowsecurity from pg_class where oid='public.notifications'::regclass),true,'RLS is enabled');
select ok(has_table_privilege('authenticated','public.notifications','select'),'authenticated may select under RLS');
select ok(not has_table_privilege('authenticated','public.notifications','insert'),'authenticated cannot insert');
select ok(has_column_privilege('authenticated','public.notifications','read_at','update'),'recipient read_at update is granted');
select ok(not has_column_privilege('authenticated','public.notifications','application_id','update'),'application_id cannot be updated');
select ok(not has_table_privilege('anon','public.notifications','select'),'anon cannot select');

-- Atomic event creation, idempotency, and approved seed/demo boundary (12)
set local role authenticated;
select set_config('request.jwt.claim.sub','a2310000-0000-4000-8000-000000000003',true);
select is(public.submit_candidate_application('a2310000-0000-4000-8000-000000000011', 'Candidate-authored introduction')->>'result','submitted','new employer application succeeds');
reset role;
select is((select count(*)::int from public.notifications),1,'new application creates exactly one notification');
select is((select recipient_user_id from public.notifications),'a2310000-0000-4000-8000-000000000001'::uuid,'recipient is owning Employer');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2310000-0000-4000-8000-000000000003',true);
select is(public.submit_candidate_application('a2310000-0000-4000-8000-000000000011', 'Changed retry text')->>'result','already_applied','retry remains already_applied');
reset role;
select is((select count(*)::int from public.notifications),1,'already_applied creates no duplicate');
select is((select introduction_text from public.applications where vacancy_id='a2310000-0000-4000-8000-000000000011'),'Candidate-authored introduction','already_applied retry leaves authored introduction unchanged');
select ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name in ('payload','introduction_text')),'notification stores no authored payload/introduction');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2310000-0000-4000-8000-000000000003',true);
select is(public.submit_candidate_application('22222222-2222-4222-8222-222222222204', null)->>'result','submitted','eligible seed/demo application behavior is unchanged');
reset role;
select is((select count(*)::int from public.notifications),1,'approved seed/demo exception creates no notification');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2310000-0000-4000-8000-000000000003',true);
select is(public.submit_candidate_application('a2310000-0000-4000-8000-000000000012', null)->>'result','submitted','second employer application succeeds');
reset role;
select is((select count(*)::int from public.notifications),2,'second application creates one additional notification');
update public.notifications n set created_at = case
  when a.vacancy_id='a2310000-0000-4000-8000-000000000011' then now()-interval '2 hours'
  else now()-interval '1 hour' end
from public.applications a where a.id=n.application_id;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2310000-0000-4000-8000-000000000001',true);
select is((select vacancy_title from public.list_current_employer_notifications() limit 1),'N231 Vacancy A2','notification projection is newest first');

-- RLS and read-state behavior (13)
select is((select count(*)::int from public.notifications),2,'recipient can select own notifications');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2310000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from public.notifications),0,'unrelated Employer cannot select notifications');
update public.notifications set read_at=now();
reset role;
select is((select count(*)::int from public.notifications where read_at is not null),0,'unrelated Employer cannot mutate read_at');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2310000-0000-4000-8000-000000000003',true);
select is((select count(*)::int from public.notifications),0,'Candidate cannot select Employer notifications');
select throws_ok($$ insert into public.notifications(recipient_user_id,kind,application_id) values ('a2310000-0000-4000-8000-000000000003','new_application','00000000-0000-4000-8000-000000000000') $$,'42501',null,'authenticated client cannot arbitrarily insert');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2310000-0000-4000-8000-000000000001',true);
update public.notifications set read_at=now();
reset role;
select is((select count(*)::int from public.notifications where read_at is not null),2,'recipient can update own read_at');

select throws_ok(
  $$ insert into public.notifications(recipient_user_id,kind,application_id) select recipient_user_id,kind,application_id from public.notifications limit 1 $$,
  '23505',null,'uniqueness constraint prevents duplicate event rows'
);

update public.notifications set read_at=null;
set local role authenticated;
select set_config('request.jwt.claim.sub','a2310000-0000-4000-8000-000000000001',true);
select is((public.mark_current_employer_notification_read((select notification_id from public.list_current_employer_notifications() where vacancy_title='N231 Vacancy A1'))->>'result'),'ok','individual read succeeds');
select is((public.mark_current_employer_notification_read((select notification_id from public.list_current_employer_notifications() where vacancy_title='N231 Vacancy A1'))->>'application_id'),(select application_id::text from public.list_current_employer_notifications() where vacancy_title='N231 Vacancy A1'),'individual read returns authorized application destination');
select is((public.mark_all_current_employer_notifications_read()->>'updated_count')::int,1,'mark all reads only the remaining unread row');
reset role;
select is((select count(*)::int from public.notifications where read_at is null),0,'all recipient notifications are now read');
select is((select count(*)::int from public.applications where status='submitted'),3,'read actions do not mutate application state');
select is((select count(*)::int from public.application_status_history),3,'read actions do not add workflow history');

-- Transaction rollback proof (3)
create function public._n231_reject_notification_test()
returns trigger language plpgsql as $$ begin raise exception 'forced notification failure'; end $$;
create trigger n231_reject_notification_test before insert on public.notifications
for each row execute function public._n231_reject_notification_test();

set local role authenticated;
select set_config('request.jwt.claim.sub','a2310000-0000-4000-8000-000000000003',true);
select throws_ok($$ select public.submit_candidate_application('a2310000-0000-4000-8000-000000000013', null) $$,'P0001','forced notification failure','notification failure aborts submission transaction');
reset role;
drop trigger n231_reject_notification_test on public.notifications;
drop function public._n231_reject_notification_test();
select is((select count(*)::int from public.applications where vacancy_id='a2310000-0000-4000-8000-000000000013'),0,'failed notification leaves no application');
select is((select count(*)::int from public.notifications n join public.applications a on a.id=n.application_id where a.vacancy_id='a2310000-0000-4000-8000-000000000013'),0,'failed submission leaves no orphan notification');

-- Narrow RPC grants (4)
select ok(not has_function_privilege('anon','public.list_current_employer_notifications()','execute'),'anon cannot list notifications');
select ok(has_function_privilege('authenticated','public.list_current_employer_notifications()','execute'),'authenticated may call recipient-scoped list');
select ok(has_function_privilege('authenticated','public.mark_current_employer_notification_read(uuid)','execute'),'authenticated may call recipient-scoped individual read');
select ok(has_function_privilege('authenticated','public.mark_all_current_employer_notifications_read()','execute'),'authenticated may call recipient-scoped read-all');

select * from finish();
rollback;
