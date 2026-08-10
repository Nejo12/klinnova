begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

-- D-M5-19 (M5.1 Unit A1) — publication readiness / publish gate alignment,
-- restored employment_types/shift_requirements constraint, and the closed
-- loop this restores: an employer completing every readiness-tracked field
-- (including employment_types/shift_requirements) can actually publish,
-- and a candidate with compatible requirements can actually match. The
-- matcher's own semantics (empty array excludes every candidate) are
-- proven unchanged, not loosened.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000','a3300000-0000-4000-8000-000000000001','authenticated','authenticated','a1-employer@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a3300000-0000-4000-8000-000000000002','authenticated','authenticated','a1-candidate-match@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a3300000-0000-4000-8000-000000000003','authenticated','authenticated','a1-candidate-nomatch@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a3300000-0000-4000-8000-000000000009','authenticated','authenticated','a1-operator@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.verification_operators (user_id, created_by)
values ('a3300000-0000-4000-8000-000000000009','a3300000-0000-4000-8000-000000000009');

-- Employer: onboarded, initially unverified — deliberately, to prove
-- verification is tracked by readiness independently of every vacancy
-- field being complete.
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at, verification_state
) values (
  'a3300000-0000-4000-8000-000000000001','private','A1 Employer','Mitte',true,now(),now(),'unverified'
);

-- Matching candidate: full_time + morning, cleaning, Berlin, work-authorised.
insert into public.candidate_profiles (
  id, display_name, german_comfort, work_authorisation_declared,
  work_authorisation_declared_at, city, travel_radius_minutes, available_from,
  job_categories, employment_types, shift_preferences, onboarding_completed_at
) values (
  'a3300000-0000-4000-8000-000000000002','A1 Match Candidate','basic',true,now(),
  'Berlin',30,(timezone('Europe/Berlin', now()))::date,array['cleaning'],array['full_time'],array['morning'],now()
);

-- Satisfies the vacancy's one required language (en/basic, added below).
insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('a3300000-0000-4000-8000-000000000002','en','basic');

-- Non-matching candidate: part_time + evening only — cannot satisfy the
-- vacancy's full_time/morning requirement.
insert into public.candidate_profiles (
  id, display_name, german_comfort, work_authorisation_declared,
  work_authorisation_declared_at, city, travel_radius_minutes, available_from,
  job_categories, employment_types, shift_preferences, onboarding_completed_at
) values (
  'a3300000-0000-4000-8000-000000000003','A1 No-Match Candidate','basic',true,now(),
  'Berlin',30,(timezone('Europe/Berlin', now()))::date,array['cleaning'],array['part_time'],array['evening'],now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3300000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a3300000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select is(
  public.create_employer_vacancy_draft('A1 Cleaning Role','cleaning','Mitte')->>'status',
  'ok', 'employer creates a minimal draft'
);

select set_config(
  'test.a1_draft_id',
  (
    select id::text from public.vacancies
    where employer_profile_id = 'a3300000-0000-4000-8000-000000000001'
    order by created_at desc limit 1
  ),
  true
);

select is(
  public.replace_employer_vacancy_languages(
    current_setting('test.a1_draft_id')::uuid,
    '[{"language_code":"en","min_proficiency":"basic"}]'::jsonb
  )->>'status',
  'ok', 'owner adds the one required language'
);

-- ---------------------------------------------------------------------------
-- Readiness: alignment with the publish gate
-- ---------------------------------------------------------------------------

select ok(
  public.employer_vacancy_draft_readiness(
    current_setting('test.a1_draft_id')::uuid
  )->'missing' ? 'workplace_type',
  'readiness flags missing workplace_type'
);
select ok(
  public.employer_vacancy_draft_readiness(
    current_setting('test.a1_draft_id')::uuid
  )->'missing' ? 'work_frequency',
  'readiness flags missing work_frequency'
);
select ok(
  public.employer_vacancy_draft_readiness(
    current_setting('test.a1_draft_id')::uuid
  )->'missing' ? 'cv_required',
  'readiness flags missing cv_required'
);
select ok(
  public.employer_vacancy_draft_readiness(
    current_setting('test.a1_draft_id')::uuid
  )->'missing' ? 'interview_english_ok',
  'readiness flags missing interview_english_ok'
);
select ok(
  public.employer_vacancy_draft_readiness(
    current_setting('test.a1_draft_id')::uuid
  )->'missing' ? 'employment_types',
  'readiness flags missing employment_types'
);
select ok(
  public.employer_vacancy_draft_readiness(
    current_setting('test.a1_draft_id')::uuid
  )->'missing' ? 'shift_requirements',
  'readiness flags missing shift_requirements'
);
select ok(
  public.employer_vacancy_draft_readiness(
    current_setting('test.a1_draft_id')::uuid
  )->'missing' ? 'verification',
  'readiness flags missing verification while employer is unverified'
);
select ok(
  not (
    public.employer_vacancy_draft_readiness(
      current_setting('test.a1_draft_id')::uuid
    )->'missing' ? 'expiry'
  ),
  'readiness never flags expiry — publish always defaults it, so it is never a real pre-publish blocker'
);

-- Publish is correctly refused while incomplete, and cites the same fields.
select is(
  public.publish_employer_vacancy(current_setting('test.a1_draft_id')::uuid)->>'status',
  'incomplete', 'publish refuses an incomplete vacancy'
);
select ok(
  public.publish_employer_vacancy(current_setting('test.a1_draft_id')::uuid)->'missing' ? 'employment_types',
  'publish gate cites the same missing employment_types as readiness'
);

-- Complete every remaining vacancy-level field.
select is(
  public.update_employer_vacancy_draft(
    current_setting('test.a1_draft_id')::uuid,
    p_description := 'Cleaning role for a small office.',
    p_workplace_type := 'office',
    p_work_frequency := 'recurring',
    p_cv_required := false,
    p_interview_english_ok := true,
    p_employment_types := array['full_time'],
    p_shift_requirements := array['morning'],
    p_salary_amount_cents := 1600,
    p_salary_period := 'hourly'
  )->>'status',
  'ok', 'owner completes every remaining vacancy-level field'
);

-- Vacancy-complete, but still not ready: employer remains unverified.
select is(
  (
    select public.employer_vacancy_draft_readiness(
      current_setting('test.a1_draft_id')::uuid
    )->'missing'
  ),
  to_jsonb(array['verification']),
  'once every vacancy field is complete, verification is the only remaining gap'
);
select is(
  public.publish_employer_vacancy(current_setting('test.a1_draft_id')::uuid)->>'status',
  'incomplete', 'publish still refuses while employer is unverified'
);

-- Verify the employer through the real request/approve RPC flow, then
-- publish succeeds.
select is(
  public.request_employer_verification()->>'status',
  'ok', 'employer requests verification'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a3300000-0000-4000-8000-000000000009',true);
select set_config('request.jwt.claims','{"sub":"a3300000-0000-4000-8000-000000000009","role":"authenticated"}',true);
select is(
  public.approve_employer_verification('a3300000-0000-4000-8000-000000000001')->>'status',
  'ok', 'operator approves the employer'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a3300000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a3300000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select is(
  public.employer_vacancy_draft_readiness(
    current_setting('test.a1_draft_id')::uuid
  )->>'ready',
  'true', 'readiness reports fully ready once verified'
);
select is(
  public.publish_employer_vacancy(current_setting('test.a1_draft_id')::uuid)->>'status',
  'ok', 'publish succeeds once every readiness-tracked field is complete'
);

-- publish_employer_vacancy stamps published_at from clock_timestamp(),
-- which keeps advancing through this long single-transaction test file,
-- while is_vacancy_effectively_public (via the matcher, below) compares
-- against now() — frozen at this transaction's start. Backdate published_at
-- so the matcher proof below reflects real request-per-transaction timing
-- rather than this test-harness artifact; expires_at (30 days out) has
-- ample margin regardless.
reset role;
update public.vacancies
set published_at = now() - interval '1 minute'
where id = current_setting('test.a1_draft_id')::uuid;

-- ---------------------------------------------------------------------------
-- Restored constraint: a non-draft row can never carry an empty
-- employment_types/shift_requirements array again, at the database level,
-- independent of any RPC.
-- ---------------------------------------------------------------------------

reset role;
select throws_ok(
  $$
    update public.vacancies
    set employment_types = '{}'::text[]
    where id = current_setting('test.a1_draft_id')::uuid
  $$,
  '23514', null,
  'a published vacancy can never be forced to an empty employment_types array'
);

select throws_ok(
  $$
    insert into public.vacancies (
      employer_profile_id, title, slug, summary, description, city,
      public_locality, job_category, employment_types, shift_requirements,
      german_requirement, publication_state, source
    ) values (
      'a3300000-0000-4000-8000-000000000001', 'Published Empty', 'a1-published-empty',
      'x', 'x', 'Berlin', 'Mitte', 'cleaning', '{}', '{}', 'none', 'published', 'employer'
    )
  $$,
  '23514', null,
  'a directly-inserted published employer vacancy still cannot have empty match-critical arrays'
);

-- A draft may still legitimately carry empty arrays — the restored
-- constraint's exemption is preserved, not tightened further than PR 4.3
-- originally intended.
select lives_ok(
  $$ select public.create_employer_vacancy_draft('A1 Second Draft','cleaning','Mitte') $$,
  'a brand-new draft may still have empty employment_types/shift_requirements'
);

-- ---------------------------------------------------------------------------
-- Matcher semantics unchanged: compatible candidate matches, incompatible
-- candidate is excluded citing the exact requirement, exactly as before
-- this migration — this migration does not touch matcher SQL at all.
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a3300000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"a3300000-0000-4000-8000-000000000002","role":"authenticated"}',true);

select is(
  (select status from public.resolve_current_candidate_vacancy_match(current_setting('test.a1_draft_id')::uuid)),
  'eligible', 'a candidate with compatible employment_type/shift now genuinely matches the published vacancy'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a3300000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"a3300000-0000-4000-8000-000000000003","role":"authenticated"}',true);

select is(
  (select status from public.resolve_current_candidate_vacancy_match(current_setting('test.a1_draft_id')::uuid)),
  'ineligible', 'a candidate with incompatible employment_type/shift is correctly excluded — matcher semantics unchanged'
);

reset role;
select * from finish();
rollback;
