begin;

create extension if not exists pgtap with schema extensions;

select plan(90);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

-- Test-only id cache. Not RLS-governed (this is a fixture helper, not
-- production data) — needed because looking an application id back up via a
-- raw `select id from public.applications where ...` inside an *employer*
-- session would itself be RLS-filtered to zero rows (only
-- applications_select_own exists on the base table); capturing the id once,
-- immediately after each submission (while the submitting candidate's own
-- RLS-safe visibility into their own row is active), avoids that entirely.
create temporary table app_ids (label text primary key, id uuid not null);
grant select, insert on app_ids to authenticated;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','c6100000-0000-4000-8000-000000000001','authenticated','authenticated','c28-employer-a@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c6100000-0000-4000-8000-000000000002','authenticated','authenticated','c28-employer-b@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c6100000-0000-4000-8000-000000000003','authenticated','authenticated','c28-employer-incomplete@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c6100000-0000-4000-8000-000000000011','authenticated','authenticated','c28-candidate-1@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c6100000-0000-4000-8000-000000000012','authenticated','authenticated','c28-candidate-2@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

-- Employer A: completed + verified. Owns every vacancy used in this file.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values (
  'c6100000-0000-4000-8000-000000000001','private','C28 Employer A','Mitte',true,
  now(),now(),'verified',now(),now(),'c6100000-0000-4000-8000-000000000001',now(),'v1'
);

-- Employer B: completed + verified, owns nothing used in this file — the
-- unrelated-employer denial fixture.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state,
  verification_requested_at, verification_reviewed_at, verification_reviewed_by,
  verification_attested_at, verification_attestation_version
) values (
  'c6100000-0000-4000-8000-000000000002','private','C28 Employer B','Mitte',true,
  now(),now(),'verified',now(),now(),'c6100000-0000-4000-8000-000000000002',now(),'v1'
);

-- Employer C: onboarding never completed — the incomplete-employer denial
-- fixture (owns nothing).
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, verification_state
) values (
  'c6100000-0000-4000-8000-000000000003','private','C28 Employer Incomplete','Mitte','unverified'
);

-- (No separate "revoked employer" fixture: revocation-mid-review is proven
-- below by revoking Employer A's own verification_state, directly via the
-- same session-config escape hatch the real revoke RPC uses, AFTER
-- Employer A already has a live application to review — a vacancy owned by
-- an already-revoked employer is never effectively public in the first
-- place, so a candidate could never have submitted to one to begin with.)

-- Candidate 1: completed, matches every vacancy in this file exactly
-- (cleaning / part_time / daytime / basic German / available today, no
-- vacancy in this file adds a language requirement).
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'c6100000-0000-4000-8000-000000000011','C28 Candidate One','basic',true,
  now(),'Berlin',30,(timezone('Europe/Berlin', now()))::date,
  array['cleaning'],array['part_time'],array['daytime'],now()
);

-- Candidate 2: completed, unrelated — never applies to anything in this
-- file. Used only to prove candidate-side history isolation.
insert into public.candidate_profiles (
  id,display_name,german_comfort,work_authorisation_declared,
  work_authorisation_declared_at,city,travel_radius_minutes,available_from,
  job_categories,employment_types,shift_preferences,onboarding_completed_at
) values (
  'c6100000-0000-4000-8000-000000000012','C28 Candidate Two','basic',true,
  now(),'Berlin',30,(timezone('Europe/Berlin', now()))::date,
  array['cleaning'],array['part_time'],array['daytime'],now()
);

-- Four employer-A-owned, published, exact-match vacancies (V1..V4), one
-- per distinct scenario below so each application's status/history is
-- independent and unambiguous.
insert into public.vacancies (
  id,employer_profile_id,title,slug,summary,description,city,public_locality,
  job_category,employment_types,shift_requirements,german_requirement,
  workplace_type,work_frequency,salary_amount_cents,salary_currency,salary_period,
  salary_is_gross,cv_required,interview_english_ok,publication_state,source,
  published_at,expires_at
) values
('c6100000-0000-4000-8000-000000000021','c6100000-0000-4000-8000-000000000001','C28 Vacancy One','c28-vacancy-one','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'basic','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('c6100000-0000-4000-8000-000000000022','c6100000-0000-4000-8000-000000000001','C28 Vacancy Two','c28-vacancy-two','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'basic','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('c6100000-0000-4000-8000-000000000023','c6100000-0000-4000-8000-000000000001','C28 Vacancy Three','c28-vacancy-three','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'basic','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days'),
('c6100000-0000-4000-8000-000000000024','c6100000-0000-4000-8000-000000000001','C28 Vacancy Four','c28-vacancy-four','summary','description','Berlin','Mitte','cleaning',array['part_time'],array['daytime'],'basic','private_home','recurring',1800,'EUR','hourly',true,true,true,'published','employer',now()-interval '1 minute',now()+interval '30 days');

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.applications (candidate_id, vacancy_id, status, snapshot_version, candidate_snapshot, vacancy_snapshot) values ('c6100000-0000-4000-8000-000000000011','c6100000-0000-4000-8000-000000000021','viewed',1,'{}','{}') $$,
  '23514', null, 'status rejects a value outside the five accepted statuses'
);
select is(
  (select count(*)::integer from public.applications),
  0,
  'no application row exists before any submission'
);

-- ---------------------------------------------------------------------------
-- Submission atomicity (app_one: candidate one x vacancy one)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000011',true);
select is(
  public.submit_candidate_application('c6100000-0000-4000-8000-000000000021')->>'result',
  'submitted',
  'candidate one submits to vacancy one'
);
insert into app_ids (label, id)
select 'app_one', id from public.applications
where candidate_id = 'c6100000-0000-4000-8000-000000000011' and vacancy_id = 'c6100000-0000-4000-8000-000000000021';
select is(
  public.submit_candidate_application('c6100000-0000-4000-8000-000000000021')->>'result',
  'already_applied',
  'duplicate submit is idempotent'
);
reset role;

select is(
  (select count(*)::integer from public.applications where id = (select id from app_ids where label = 'app_one')),
  1,
  'exactly one application row for app_one'
);
select is(
  (select count(*)::integer from public.application_status_history where application_id = (select id from app_ids where label = 'app_one')),
  1,
  'duplicate submit created no second history row'
);
select is(
  (select from_status from public.application_status_history where application_id = (select id from app_ids where label = 'app_one')),
  null,
  'initial event has null from_status'
);
select is(
  (select to_status from public.application_status_history where application_id = (select id from app_ids where label = 'app_one')),
  'submitted',
  'initial event to_status is submitted'
);
select is(
  (select actor_user_id from public.application_status_history where application_id = (select id from app_ids where label = 'app_one'))::text,
  'c6100000-0000-4000-8000-000000000011',
  'initial event actor is the submitting candidate'
);
select is(
  (select actor_role from public.application_status_history where application_id = (select id from app_ids where label = 'app_one')),
  'candidate',
  'initial event actor_role is candidate'
);
select is(
  (select (h.occurred_at = a.submitted_at)
   from public.application_status_history h
   join public.applications a on a.id = h.application_id
   where a.id = (select id from app_ids where label = 'app_one')),
  true,
  'initial event occurred_at matches the application submitted_at exactly'
);

select throws_ok(
  format(
    $$ insert into public.application_status_history (application_id, from_status, to_status, actor_user_id, actor_role) values ('%s', null, 'submitted', 'c6100000-0000-4000-8000-000000000011', 'candidate') $$,
    (select id from app_ids where label = 'app_one')
  ),
  '23505', null, 'a second initial (null from_status) event for the same application violates the one-initial-event unique index'
);

-- ---------------------------------------------------------------------------
-- Backfill correctness: simulate a pre-PR-6.1 application (inserted
-- directly, bypassing submit_candidate_application, so it starts with no
-- history row) and prove the exact backfill statement from the migration
-- produces one correct, idempotent initial event. Deleted at the end of
-- this block (cascades to its history row) so it does not skew the
-- employer list/count assertions later in this file.
-- ---------------------------------------------------------------------------

insert into public.applications (
  id, candidate_id, vacancy_id, status, submitted_at, snapshot_version,
  candidate_snapshot, vacancy_snapshot, created_at, updated_at
) values (
  'c6100000-0000-4000-8000-0000000000f1',
  'c6100000-0000-4000-8000-000000000012',
  'c6100000-0000-4000-8000-000000000021',
  'submitted',
  '2026-08-01T09:00:00+00',
  1,
  '{}'::jsonb,
  '{}'::jsonb,
  '2026-08-01T09:00:00+00',
  '2026-08-01T09:00:00+00'
);
select is(
  (select count(*)::integer from public.application_status_history where application_id = 'c6100000-0000-4000-8000-0000000000f1'),
  0,
  'a directly-inserted (pre-6.1-style) application has no history row yet'
);

insert into public.application_status_history (
  application_id, from_status, to_status, actor_user_id, actor_role, reason, occurred_at
)
select a.id, null, 'submitted', a.candidate_id, 'candidate', null, a.submitted_at
from public.applications a
where not exists (
  select 1
  from public.application_status_history h
  where h.application_id = a.id
    and h.from_status is null
);

select is(
  (select count(*)::integer from public.application_status_history where application_id = 'c6100000-0000-4000-8000-0000000000f1'),
  1,
  'backfill creates exactly one initial event for the pre-existing application'
);
select is(
  (select occurred_at from public.application_status_history where application_id = 'c6100000-0000-4000-8000-0000000000f1'),
  '2026-08-01T09:00:00+00'::timestamptz,
  'backfilled event occurred_at matches the application''s own submitted_at, not a fabricated timestamp'
);
select is(
  (select actor_user_id from public.application_status_history where application_id = 'c6100000-0000-4000-8000-0000000000f1')::text,
  'c6100000-0000-4000-8000-000000000012',
  'backfilled event actor_user_id matches the application''s own candidate_id'
);

-- Rerunning the same backfill statement is idempotent (the WHERE NOT
-- EXISTS guard, reinforced by the partial unique index).
insert into public.application_status_history (
  application_id, from_status, to_status, actor_user_id, actor_role, reason, occurred_at
)
select a.id, null, 'submitted', a.candidate_id, 'candidate', null, a.submitted_at
from public.applications a
where not exists (
  select 1
  from public.application_status_history h
  where h.application_id = a.id
    and h.from_status is null
);
select is(
  (select count(*)::integer from public.application_status_history where application_id = 'c6100000-0000-4000-8000-0000000000f1'),
  1,
  'rerunning the backfill statement is idempotent -- still exactly one initial event'
);

delete from public.applications where id = 'c6100000-0000-4000-8000-0000000000f1';

-- ---------------------------------------------------------------------------
-- Privileges on application_status_history
-- ---------------------------------------------------------------------------

set local role anon;
select throws_ok($$ select * from public.application_status_history $$, '42501', null, 'anon cannot select history');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000011',true);
select throws_ok($$ select * from public.application_status_history $$, '42501', null, 'authenticated candidate cannot directly select history');
select throws_ok($$ insert into public.application_status_history (application_id, to_status, actor_user_id, actor_role) values ('c6100000-0000-4000-8000-000000000021','submitted','c6100000-0000-4000-8000-000000000011','candidate') $$, '42501', null, 'authenticated cannot directly insert history');
select throws_ok($$ update public.application_status_history set reason = 'x' $$, '42501', null, 'authenticated cannot directly update history');
select throws_ok($$ delete from public.application_status_history $$, '42501', null, 'authenticated cannot directly delete history');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000012',true);
select is(
  (select count(*)::integer from public.applications where candidate_id = 'c6100000-0000-4000-8000-000000000011'),
  0,
  'unrelated candidate still cannot select another candidate''s applications (regression, applications_select_own unchanged)'
);
reset role;

-- ---------------------------------------------------------------------------
-- Employer applicant list
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);
select is(
  (select count(*)::integer from public.list_current_employer_applications()),
  1,
  'employer A sees exactly one application across owned vacancies'
);
select is(
  (select candidate_display_name from public.list_current_employer_applications() limit 1),
  'C28 Candidate One',
  'list projects candidate display name from the snapshot'
);
select is(
  (select current_status from public.list_current_employer_applications() limit 1),
  'submitted',
  'list projects current status'
);
select is(
  (select count(*)::integer from public.list_current_employer_applications(p_vacancy_id => 'c6100000-0000-4000-8000-000000000021')),
  1,
  'list narrows correctly to an owned vacancy filter'
);
select is(
  (select count(*)::integer from public.list_current_employer_applications(p_vacancy_id => 'c6100000-0000-4000-8000-000000000022')),
  0,
  'list returns zero rows for an owned vacancy with no applications yet'
);
select is(
  (select count(*)::integer from public.list_current_employer_applications(p_status => 'submitted')),
  1,
  'list narrows correctly to a matching status filter'
);
select is(
  (select count(*)::integer from public.list_current_employer_applications(p_status => 'accepted')),
  0,
  'list returns zero rows for a non-matching status filter'
);
select is(
  (select count(*)::integer from public.list_current_employer_applications(p_status => 'not-a-real-status')),
  0,
  'list returns zero rows (not an error) for an unrecognised status filter'
);
select throws_ok(
  $$ select candidate_id from public.list_current_employer_applications() $$,
  '42703', null, 'employer list RPC return shape has no candidate_id column at all'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000002',true);
select is(
  (select count(*)::integer from public.list_current_employer_applications()),
  0,
  'unrelated employer B sees zero applications'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000003',true);
select is(
  (select count(*)::integer from public.list_current_employer_applications()),
  0,
  'incomplete employer C sees zero applications'
);
reset role;

set local role anon;
select throws_ok($$ select * from public.list_current_employer_applications() $$, '42501', null, 'anon cannot call the employer list RPC');
reset role;

-- ---------------------------------------------------------------------------
-- Employer applicant detail
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);
select is(
  (public.get_current_employer_application((select id from app_ids where label = 'app_one'))->>'status'),
  'ready',
  'owning employer A gets a ready detail projection'
);
select is(
  (public.get_current_employer_application((select id from app_ids where label = 'app_one'))->>'candidate_display_name'),
  'C28 Candidate One',
  'detail projects candidate display name from the snapshot'
);
select is(
  (public.get_current_employer_application((select id from app_ids where label = 'app_one'))->'allowed_transitions'),
  '["reviewing", "shortlisted", "accepted", "rejected"]'::jsonb,
  'detail exposes the full forward set of allowed transitions from submitted'
);
select is(
  jsonb_array_length(public.get_current_employer_application((select id from app_ids where label = 'app_one'))->'status_history'),
  1,
  'detail history has exactly one entry before any transition'
);
select ok(
  not (public.get_current_employer_application((select id from app_ids where label = 'app_one')) ? 'candidate_id'),
  'detail projection never includes candidate_id'
);
select is(
  (public.get_current_employer_application('00000000-0000-4000-8000-000000000000')->>'status'),
  'unavailable',
  'unknown application id is unavailable'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000002',true);
select is(
  (public.get_current_employer_application((select id from app_ids where label = 'app_one'))->>'status'),
  'unavailable',
  'unrelated employer B gets unavailable for employer A''s application'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000003',true);
select is(
  (public.get_current_employer_application((select id from app_ids where label = 'app_one'))->>'status'),
  'unavailable',
  'incomplete employer C gets unavailable'
);
reset role;

set local role anon;
select throws_ok($$ select public.get_current_employer_application('00000000-0000-4000-8000-000000000000') $$, '42501', null, 'anon cannot call the employer detail RPC');
reset role;

-- ---------------------------------------------------------------------------
-- Transition matrix (app_one: vacancy one, candidate one)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000002',true);
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'reviewing')->>'result',
  'unavailable',
  'unrelated employer B cannot transition employer A''s application'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000003',true);
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'reviewing')->>'result',
  'employer_unavailable',
  'incomplete employer C cannot transition'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);

select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'not-a-real-status')->>'result',
  'invalid_transition',
  'unrecognised target status is invalid_transition'
);

select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'submitted')->>'result',
  'already_in_state',
  'requesting the current status is already_in_state'
);

-- A nonblank reason supplied for a non-rejected target is a caller error:
-- invalid_transition, no state change, no history row -- never silently
-- discarded.
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'reviewing', 'looks promising')->>'result',
  'invalid_transition',
  'submitted -> reviewing with a nonblank reason is invalid_transition, not silently accepted'
);
reset role;
select is(
  (select status from public.applications where id = (select id from app_ids where label = 'app_one')),
  'submitted',
  'a rejected (invalid_transition) reason-misuse attempt leaves the application status unchanged'
);
select is(
  (select count(*)::integer from public.application_status_history where application_id = (select id from app_ids where label = 'app_one')),
  1,
  'a rejected (invalid_transition) reason-misuse attempt adds no history row'
);
set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);

-- A whitespace-only reason on an otherwise-valid non-rejected transition
-- normalizes to null and does not invalidate the transition.
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'reviewing', '   ')->>'result',
  'updated',
  'submitted -> reviewing with a whitespace-only reason succeeds (normalizes to null)'
);
reset role;
select is(
  (select reason from public.application_status_history where application_id = (select id from app_ids where label = 'app_one') and to_status = 'reviewing'),
  null,
  'a whitespace-only reason on a non-rejected transition is stored as null'
);
set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);

select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'reviewing')->>'result',
  'already_in_state',
  'reviewing -> reviewing is already_in_state (idempotent duplicate/stale retry)'
);

select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'submitted')->>'result',
  'invalid_transition',
  'reviewing -> submitted (backward) is invalid_transition'
);

select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'shortlisted')->>'result',
  'updated',
  'reviewing -> shortlisted succeeds'
);

select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'reviewing')->>'result',
  'invalid_transition',
  'shortlisted -> reviewing (backward) is invalid_transition'
);

-- Overlong reason (>1000 chars) on a rejected target: rejected, no state
-- change, no new history row.
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'rejected', repeat('x', 1001))->>'result',
  'invalid_transition',
  'an overlong (>1000 char) rejection reason is invalid_transition'
);
reset role;
select is(
  (select status from public.applications where id = (select id from app_ids where label = 'app_one')),
  'shortlisted',
  'an overlong-reason attempt leaves the application status unchanged'
);
select is(
  (select count(*)::integer from public.application_status_history where application_id = (select id from app_ids where label = 'app_one')),
  3,
  'an overlong-reason attempt adds no history row'
);
set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);

-- Blank/whitespace-only reason normalizes to null, transition still succeeds.
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'rejected', '   ')->>'result',
  'updated',
  'shortlisted -> rejected with a whitespace-only reason succeeds'
);
reset role;
select is(
  (select reason from public.application_status_history where application_id = (select id from app_ids where label = 'app_one') and to_status = 'rejected'),
  null,
  'a whitespace-only reason is normalized to null, not stored verbatim'
);
set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);

select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'accepted')->>'result',
  'invalid_transition',
  'rejected -> accepted (terminal reversal) is invalid_transition'
);
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_one'), 'rejected')->>'result',
  'already_in_state',
  'rejected -> rejected is already_in_state'
);
reset role;

-- ---------------------------------------------------------------------------
-- Skip transitions (app_two: vacancy two, candidate one)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000011',true);
select is(
  public.submit_candidate_application('c6100000-0000-4000-8000-000000000022')->>'result',
  'submitted',
  'candidate one submits to vacancy two'
);
insert into app_ids (label, id)
select 'app_two', id from public.applications
where candidate_id = 'c6100000-0000-4000-8000-000000000011' and vacancy_id = 'c6100000-0000-4000-8000-000000000022';
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_two'), 'accepted')->>'result',
  'updated',
  'submitted -> accepted (skipping reviewing/shortlisted) succeeds'
);
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_two'), 'accepted')->>'result',
  'already_in_state',
  'accepted -> accepted is already_in_state'
);
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_two'), 'rejected')->>'result',
  'invalid_transition',
  'accepted -> rejected (terminal reversal) is invalid_transition'
);
reset role;

-- ---------------------------------------------------------------------------
-- Valid stored reason and candidate-safe history (app_three: vacancy
-- three, candidate one) — direct submitted -> rejected with a genuinely
-- valid reason, to prove the reason IS stored and IS returned to the
-- employer, but never to the candidate.
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000011',true);
select is(
  public.submit_candidate_application('c6100000-0000-4000-8000-000000000023')->>'result',
  'submitted',
  'candidate one submits to vacancy three'
);
insert into app_ids (label, id)
select 'app_three', id from public.applications
where candidate_id = 'c6100000-0000-4000-8000-000000000011' and vacancy_id = 'c6100000-0000-4000-8000-000000000023';
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_three'), 'rejected', 'Not a fit for this role right now')->>'result',
  'updated',
  'submitted -> rejected (skip) with a valid reason succeeds'
);
select is(
  (public.get_current_employer_application((select id from app_ids where label = 'app_three'))->'status_history'->1->>'reason'),
  'Not a fit for this role right now',
  'employer detail projection includes the employer''s own stored rejection reason'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000011',true);
select is(
  (select count(*)::integer from public.list_current_candidate_application_status_history((select id from app_ids where label = 'app_three'))),
  2,
  'candidate sees both history entries for app_three (submitted, rejected)'
);
select is(
  (select array_agg(to_status order by occurred_at, to_status) from public.list_current_candidate_application_status_history((select id from app_ids where label = 'app_three'))),
  array['submitted','rejected'],
  'candidate history is in chronological order'
);
select throws_ok(
  $$ select reason from public.list_current_candidate_application_status_history('00000000-0000-4000-8000-000000000000') $$,
  '42703', null, 'candidate history RPC return shape has no reason column at all'
);
select throws_ok(
  $$ select actor_user_id from public.list_current_candidate_application_status_history('00000000-0000-4000-8000-000000000000') $$,
  '42703', null, 'candidate history RPC return shape has no actor_user_id column at all'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000012',true);
select is(
  (select count(*)::integer from public.list_current_candidate_application_status_history((select id from app_ids where label = 'app_three'))),
  0,
  'unrelated candidate two sees zero rows for candidate one''s application history'
);
reset role;

select is(
  (select count(*)::integer from public.list_current_candidate_application_status_history('00000000-0000-4000-8000-000000000000')),
  0,
  'unknown application id yields zero rows, not an error, for the candidate history RPC (called with no session)'
);

set local role anon;
select throws_ok($$ select * from public.list_current_candidate_application_status_history('00000000-0000-4000-8000-000000000000') $$, '42501', null, 'anon cannot call the candidate history RPC');
reset role;

-- ---------------------------------------------------------------------------
-- Verification-revocation and vacancy-lifecycle decoupling (app_four:
-- vacancy four, candidate one, owned by the revoked-but-completed Employer D)
-- ---------------------------------------------------------------------------

-- Candidate submits to vacancy four while Employer A is still verified (a
-- vacancy owned by an already-revoked employer is never effectively
-- public, so this ordering is required for the submission to succeed).
set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000011',true);
select is(
  public.submit_candidate_application('c6100000-0000-4000-8000-000000000024')->>'result',
  'submitted',
  'candidate one submits to vacancy four'
);
insert into app_ids (label, id)
select 'app_four', id from public.applications
where candidate_id = 'c6100000-0000-4000-8000-000000000011' and vacancy_id = 'c6100000-0000-4000-8000-000000000024';
reset role;

-- Revoke Employer A's own verification directly, via the same
-- session-config escape hatch revoke_employer_verification() uses, so the
-- revocation applies to an employer who already owns a live application.
select set_config('stint.allow_verification_write', '1', true);
update public.employer_profiles
set verification_state = 'revoked',
    verification_reviewed_at = now(),
    verification_review_reason = 'Trust concern (fixture)'
where id = 'c6100000-0000-4000-8000-000000000001';
select is(
  (select verification_state from public.employer_profiles where id = 'c6100000-0000-4000-8000-000000000001'),
  'revoked',
  'employer A is now revoked'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);
select is(
  (select count(*)::integer from public.list_current_employer_applications(p_vacancy_id => 'c6100000-0000-4000-8000-000000000024')),
  1,
  'revoked-but-completed employer A can still list this application'
);
select is(
  (public.get_current_employer_application((select id from app_ids where label = 'app_four'))->>'status'),
  'ready',
  'revoked-but-completed employer A can still view applicant detail'
);
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_four'), 'reviewing')->>'result',
  'updated',
  'revoked-but-completed employer A can still transition status'
);
reset role;

-- Withdraw vacancy four mid-review; the (still non-terminal) application
-- must remain reviewable and its own status must be unaffected by the
-- vacancy-lifecycle change. Vacancy lifecycle RPCs check ownership only,
-- not verification, so this succeeds for the now-revoked employer too.
set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);
select public.withdraw_employer_vacancy('c6100000-0000-4000-8000-000000000024');
reset role;

select is(
  (select publication_state from public.vacancies where id = 'c6100000-0000-4000-8000-000000000024'),
  'withdrawn',
  'vacancy four is now withdrawn'
);
select is(
  (select status from public.applications where id = (select id from app_ids where label = 'app_four')),
  'reviewing',
  'withdrawing the vacancy does not change the application''s own status'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);
select is(
  public.transition_current_employer_application_status((select id from app_ids where label = 'app_four'), 'shortlisted')->>'result',
  'updated',
  'review/transition remains available after the owned vacancy is withdrawn'
);
select public.transition_current_employer_application_status((select id from app_ids where label = 'app_four'), 'accepted');
reset role;

-- Accepting does not auto-fill the vacancy — it stays withdrawn (proves the
-- two state machines are decoupled in both directions already exercised:
-- accept never touches vacancy state, and vacancy withdrawal never touched
-- application state above).
select is(
  (select publication_state from public.vacancies where id = 'c6100000-0000-4000-8000-000000000024'),
  'withdrawn',
  'accepting an application does not change the vacancy''s publication_state'
);

-- ---------------------------------------------------------------------------
-- No-leakage: employer projections never expose actor identity fields.
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c6100000-0000-4000-8000-000000000001',true);
select ok(
  not (public.get_current_employer_application((select id from app_ids where label = 'app_one')) ? 'actor_user_id'),
  'detail projection top level never includes actor_user_id'
);
select ok(
  not (public.get_current_employer_application((select id from app_ids where label = 'app_one'))->'status_history'->0 ? 'actor_user_id'),
  'detail status_history entries never include actor_user_id'
);
select ok(
  not (public.get_current_employer_application((select id from app_ids where label = 'app_one'))->'status_history'->0 ? 'actor_role'),
  'detail status_history entries never include actor_role'
);
reset role;

select * from finish();
rollback;
