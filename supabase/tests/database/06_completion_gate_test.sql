begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'f1111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'complete-a@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f2222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'complete-b@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into public.candidate_profiles (id, display_name)
values
  ('f1111111-1111-1111-1111-111111111111', 'Complete A'),
  ('f2222222-2222-2222-2222-222222222222', 'Complete B');

select ok(
  has_function_privilege(
    'authenticated',
    'public.complete_candidate_onboarding()',
    'execute'
  ),
  'authenticated can execute complete_candidate_onboarding'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.complete_candidate_onboarding()',
    'execute'
  ),
  'anon cannot execute complete_candidate_onboarding'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public._candidate_first_incomplete_group(uuid)',
    'execute'
  ),
  'authenticated cannot execute internal incomplete-group helper'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public._trg_candidate_profiles_essentials()',
    'execute'
  ),
  'authenticated cannot execute profile essentials trigger function'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public._trg_candidate_languages_reconcile()',
    'execute'
  ),
  'authenticated cannot execute language reconcile trigger function'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public._clear_completion_if_incomplete(uuid)',
    'execute'
  ),
  'authenticated cannot execute clear-completion helper'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public._clear_completion_for_two_candidates(uuid, uuid)',
    'execute'
  ),
  'authenticated cannot execute two-candidate clear helper'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'reconcile_onboarding_completion'
  ),
  'reconcile_onboarding_completion RPC is removed'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);

select is(
  public.complete_candidate_onboarding()->>'status',
  'unauthenticated',
  'complete fails without auth.uid()'
);

select set_config(
  'request.jwt.claim.sub',
  'f1111111-1111-1111-1111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f1111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.complete_candidate_onboarding()->>'status',
  'incomplete',
  'complete reports incomplete when essentials missing'
);

reset role;
update public.candidate_profiles
set
  german_comfort = 'basic',
  work_authorisation_declared = true,
  city = 'Berlin',
  travel_radius_minutes = 30,
  available_from = (timezone('Europe/Berlin', now()))::date,
  job_categories = array['cleaning']::text[],
  employment_types = array['full_time']::text[],
  shift_preferences = array['daytime']::text[],
  updated_at = now()
where id = 'f1111111-1111-1111-1111-111111111111';

insert into public.candidate_languages (
  candidate_id,
  language_code,
  proficiency
)
values (
  'f1111111-1111-1111-1111-111111111111',
  'de',
  'native'
);

select set_config(
  'request.jwt.claim.sub',
  'f1111111-1111-1111-1111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f1111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.complete_candidate_onboarding()->>'status',
  'completed',
  'complete succeeds when persisted essentials are valid'
);

select is(
  (
    select onboarding_completed_at is not null
      and work_authorisation_declared_at is not null
    from public.candidate_profiles
    where id = 'f1111111-1111-1111-1111-111111111111'
  ),
  true,
  'first completion sets both required timestamps'
);

create temporary table _completion_timestamps as
select onboarding_completed_at, work_authorisation_declared_at
from public.candidate_profiles
where id = 'f1111111-1111-1111-1111-111111111111';

select is(
  public.complete_candidate_onboarding()->>'already_complete',
  'true',
  'second complete is idempotent'
);

select results_eq(
  $$
    select onboarding_completed_at, work_authorisation_declared_at
    from public.candidate_profiles
    where id = 'f1111111-1111-1111-1111-111111111111'
  $$,
  $$
    select onboarding_completed_at, work_authorisation_declared_at
    from _completion_timestamps
  $$,
  'idempotent complete preserves both timestamps'
);

select set_config(
  'request.jwt.claim.sub',
  'f2222222-2222-2222-2222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f2222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);

select is(
  public.complete_candidate_onboarding()->>'status',
  'incomplete',
  'candidate B complete operates only on auth.uid() profile'
);

reset role;
select is(
  (
    select onboarding_completed_at
    from public.candidate_profiles
    where id = 'f1111111-1111-1111-1111-111111111111'
  ) is not null,
  true,
  'candidate B complete does not clear candidate A completion'
);

select set_config(
  'request.jwt.claim.sub',
  'f1111111-1111-1111-1111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f1111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    update public.candidate_profiles
    set onboarding_completed_at = now()
    where id = 'f1111111-1111-1111-1111-111111111111'
  $$,
  '42501',
  null,
  'authenticated still cannot directly update onboarding_completed_at'
);

select * from finish();
rollback;
