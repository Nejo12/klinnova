begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a2780000-0000-4000-8000-000000000001','authenticated','authenticated','n278-employer-a@example.test',crypt('password',gen_salt('bf')),now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2780000-0000-4000-8000-000000000002','authenticated','authenticated','n278-employer-b@example.test',crypt('password',gen_salt('bf')),now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2780000-0000-4000-8000-000000000003','authenticated','authenticated','n278-candidate@example.test',crypt('password',gen_salt('bf')),now(),'{}','{}',now(),now(),'','','','');

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values
('a2780000-0000-4000-8000-000000000001','private','N278 Employer A','Mitte',true,now(),now(),'verified',now(),now(),'a2780000-0000-4000-8000-000000000001',now(),'v1'),
('a2780000-0000-4000-8000-000000000002','private','N278 Employer B','Mitte',true,now(),now(),'verified',now(),now(),'a2780000-0000-4000-8000-000000000002',now(),'v1');

insert into public.candidate_profiles (
  id, display_name, german_comfort, work_authorisation_declared,
  work_authorisation_declared_at, city, travel_radius_minutes, available_from,
  job_categories, employment_types, shift_preferences, onboarding_completed_at
) values (
  'a2780000-0000-4000-8000-000000000003','N278 Candidate','basic',true,
  now(),'Berlin',30,(timezone('Europe/Berlin', now()))::date,array['cleaning'],array['part_time'],array['daytime'],now()
);

insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('a2780000-0000-4000-8000-000000000003','en','conversational');

insert into public.vacancies (
  id, employer_profile_id, title, slug, summary, description, city, public_locality,
  job_category, employment_types, shift_requirements, german_requirement,
  workplace_type, work_frequency, salary_amount_cents, salary_currency, salary_period,
  salary_is_gross, cv_required, interview_english_ok, publication_state, source,
  published_at, expires_at
) values
('a2780000-0000-4000-8000-000000000011','a2780000-0000-4000-8000-000000000001','N278 Vacancy A1','n278-vacancy-a1','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a2780000-0000-4000-8000-000000000012','a2780000-0000-4000-8000-000000000001','N278 Vacancy A2','n278-vacancy-a2','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('a2780000-0000-4000-8000-000000000013','a2780000-0000-4000-8000-000000000001','N278 Vacancy rollback','n278-vacancy-rollback','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'none','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days');

-- Real submissions retain Employer v1 behavior, with no Candidate event.
set local role authenticated;
select set_config('request.jwt.claim.sub','a2780000-0000-4000-8000-000000000003',true);
select is(public.submit_candidate_application('a2780000-0000-4000-8000-000000000011', null)->>'result','submitted','first submission succeeds');
select is(public.submit_candidate_application('a2780000-0000-4000-8000-000000000012', null)->>'result','submitted','second submission succeeds');
reset role;
select is((select count(*)::int from public.notifications where kind='new_application'),2,'Employer v1 events retained');
select is((select count(*)::int from public.notifications where kind like 'application_%'),0,'submitted produces no Candidate event');
create temporary table n278_apps as select id, vacancy_id from public.applications where candidate_id='a2780000-0000-4000-8000-000000000003';
grant select on n278_apps to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub','a2780000-0000-4000-8000-000000000001',true);
select is(public.transition_current_employer_application_status((select id from n278_apps where vacancy_id='a2780000-0000-4000-8000-000000000011'),'reviewing',null)->>'result','updated','reviewing transition succeeds');
reset role;
select is((select count(*)::int from public.notifications where kind like 'application_%'),0,'reviewing produces no Candidate event');
set local role authenticated;
select is(public.transition_current_employer_application_status((select id from n278_apps where vacancy_id='a2780000-0000-4000-8000-000000000011'),'shortlisted',null)->>'result','updated','shortlist transition succeeds');
select is(public.transition_current_employer_application_status((select id from n278_apps where vacancy_id='a2780000-0000-4000-8000-000000000011'),'shortlisted',null)->>'result','already_in_state','same-state retry');
reset role;
select is((select count(*)::int from public.notifications where kind='application_shortlisted'),1,'exactly one shortlist event');
select is((select recipient_user_id from public.notifications where kind='application_shortlisted'),'a2780000-0000-4000-8000-000000000003'::uuid,'recipient is the Candidate');
select is((select n.created_at=h.occurred_at from public.notifications n join public.application_status_history h on h.application_id=n.application_id and h.to_status='shortlisted' where n.kind='application_shortlisted'),true,'notification/audit share transition timestamp');
select throws_ok($$insert into public.notifications(recipient_user_id,kind,application_id) select recipient_user_id,kind,application_id from public.notifications where kind='application_shortlisted'$$,'23505',null,'uniqueness remains enforced');

-- Fault injection proves notification failure rolls back status AND history.
create function pg_temp.n278_fail() returns trigger language plpgsql as $$begin if new.kind='application_accepted' then raise exception 'n278 failure'; end if; return new; end$$;
create trigger n278_fail before insert on public.notifications for each row execute function pg_temp.n278_fail();
set local role authenticated;
select throws_ok($$select public.transition_current_employer_application_status((select id from n278_apps where vacancy_id='a2780000-0000-4000-8000-000000000011'),'accepted',null)$$,'P0001','n278 failure','notification failure aborts transition');
reset role;
select is((select status from public.applications where id=(select id from n278_apps where vacancy_id='a2780000-0000-4000-8000-000000000011')),'shortlisted','failed transaction preserves status');
select is((select count(*)::int from public.application_status_history where to_status='accepted' and application_id in (select id from n278_apps)),0,'failed transaction rolls back audit');
select is((select count(*)::int from public.notifications where kind='application_accepted'),0,'failed transaction leaves no notification');
drop trigger n278_fail on public.notifications;
set local role authenticated;
select is(public.transition_current_employer_application_status((select id from n278_apps where vacancy_id='a2780000-0000-4000-8000-000000000011'),'accepted',null)->>'result','updated','accept succeeds atomically');
select is(public.transition_current_employer_application_status((select id from n278_apps where vacancy_id='a2780000-0000-4000-8000-000000000011'),'accepted',null)->>'result','already_in_state','accepted retry');
select is(public.transition_current_employer_application_status((select id from n278_apps where vacancy_id='a2780000-0000-4000-8000-000000000012'),'rejected','Employer private rejection reason')->>'result','updated','reject succeeds');
select is(public.transition_current_employer_application_status((select id from n278_apps where vacancy_id='a2780000-0000-4000-8000-000000000012'),'rejected',null)->>'result','already_in_state','rejected retry');
select is((select count(*)::int from public.list_current_candidate_notifications()),0,'Employer projection cannot access Candidate events');
select is((select count(*)::int from public.notifications where kind like 'application_%'),0,'Employer RLS cannot read Candidate events');
select is(public.mark_current_candidate_notification_read('00000000-0000-4000-8000-000000000000')->>'result','unavailable','invalid destination unavailable');
select is(public.mark_current_candidate_notification_read((select id from public.notifications where kind='new_application' limit 1))->>'result','unavailable','Employer cannot use Candidate RPC on Employer-kind notification');
reset role;
select is((select count(*)::int from public.notifications where kind='application_accepted'),1,'exactly one acceptance');
select is((select count(*)::int from public.notifications where kind='application_rejected'),1,'exactly one rejection');

-- Safe snapshot context survives unpublished/changed vacancies.
update public.vacancies set title='Changed live title', publication_state='paused' where id='a2780000-0000-4000-8000-000000000012';
set local role authenticated;
select set_config('request.jwt.claim.sub','a2780000-0000-4000-8000-000000000003',true);
select is((select count(*)::int from public.list_current_candidate_notifications()),3,'Candidate owns three events');
select is(public.count_current_candidate_unread_notifications(),3,'unread count includes all three');
select is((select kind from public.list_current_candidate_notifications() limit 1),'application_rejected','newest-first order');
select is((select vacancy_title from public.list_current_candidate_notifications() where kind='application_rejected'),'N278 Vacancy A2','immutable safe context retained');
select ok(not exists(select 1 from public.list_current_candidate_notifications() n where to_jsonb(n)::text like '%Employer private rejection reason%'),'projection never exposes rejection reason');
select throws_ok($$insert into public.notifications(recipient_user_id,kind,application_id) select 'a2780000-0000-4000-8000-000000000003','application_accepted',id from n278_apps limit 1$$,'42501',null,'authenticated cannot insert');
select is((select count(*)::int from public.list_current_employer_notifications()),0,'Candidate cannot access Employer projection');
select is(public.mark_current_candidate_notification_read((select notification_id from public.list_current_candidate_notifications() where kind='application_accepted'))->>'application_id',(select id::text from n278_apps where vacancy_id='a2780000-0000-4000-8000-000000000011'),'read returns authorized application destination');
select is(public.count_current_candidate_unread_notifications(),2,'one read affects only one event');
select is(public.mark_all_current_candidate_notifications_read()->>'updated_count','2','mark all reads remaining owned Candidate rows');
select is(public.mark_all_current_candidate_notifications_read()->>'updated_count','0','mark all is idempotent');
select is((select count(*)::int from public.list_current_candidate_notifications()),3,'read history remains durable');
reset role;
select is((select count(*)::int from public.notifications where kind='new_application' and read_at is null),2,'Candidate read operations preserve Employer events');
select is((select string_agg(status,',' order by vacancy_id) from public.applications where id in (select id from n278_apps)),'accepted,rejected','read operations preserve status');
select is((select count(*)::int from public.application_outcome_events where application_id in (select id from n278_apps)),0,'accepted does not create hired outcome');

-- A different completed Candidate (also an Employer) remains unauthorized.
insert into public.candidate_profiles(id,display_name,onboarding_completed_at)
values ('a2780000-0000-4000-8000-000000000002','Other Candidate',now());
create temporary table n278_ids as select id from public.notifications where kind='application_accepted';
grant select on n278_ids to authenticated;

-- Unrelated user denied list, RLS, mark-one and mark-all.
set local role authenticated;
select set_config('request.jwt.claim.sub','a2780000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from public.list_current_candidate_notifications()),0,'unrelated user cannot list');
select is((select count(*)::int from public.notifications),0,'unrelated user cannot select');
select is(public.mark_current_candidate_notification_read((select id from n278_ids))->>'result','unavailable','unrelated Candidate cannot mark another recipient read');
select is(public.mark_all_current_candidate_notifications_read()->>'updated_count','0','unrelated Candidate mark-all touches no foreign rows');
reset role;
-- Employer mark-all must not touch Candidate-kind rows even for dual profiles.
insert into public.employer_profiles(id,employer_type,display_name,berlin_locality,lawful_hiring_declared,lawful_hiring_declared_at,onboarding_completed_at) values ('a2780000-0000-4000-8000-000000000003','private','Dual profile','Mitte',true,now(),now());
update public.notifications set read_at=null where kind like 'application_%';
set local role authenticated;
select set_config('request.jwt.claim.sub','a2780000-0000-4000-8000-000000000003',true);
select is(public.mark_all_current_employer_notifications_read()->>'updated_count','0','Employer mark-all excludes Candidate events on dual account');
select is(public.count_current_candidate_unread_notifications(),3,'dual account Candidate unread state preserved');
reset role;
set local role anon;
select throws_ok($$select public.list_current_candidate_notifications()$$,'42501',null,'anon cannot execute Candidate list');
select throws_ok($$select public.mark_all_current_candidate_notifications_read()$$,'42501',null,'anon cannot execute read operation');
reset role;
select * from finish();
rollback;
