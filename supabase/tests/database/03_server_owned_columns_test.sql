begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

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
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated',
    'authenticated',
    'owned-cols@example.test',
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

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}',
  true
);
set local role authenticated;

-- Normal profile creation omitting protected columns
select lives_ok(
  $$
    insert into public.candidate_profiles (id, display_name, work_authorisation_declared)
    values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'Owned Cols',
      true
    )
  $$,
  'authenticated candidate can insert allowed profile fields'
);

select results_eq(
  $$
    select onboarding_completed_at, work_authorisation_declared_at
    from public.candidate_profiles
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  $$,
  $$ values (null::timestamptz, null::timestamptz) $$,
  'protected timestamps remain null after normal insert'
);

-- Candidate-owned progressive fields remain writable under column grants.
select lives_ok(
  $$
    update public.candidate_profiles
    set
      german_comfort = 'getting_by',
      work_authorisation_declared = true,
      city = 'Berlin',
      travel_radius_minutes = 30,
      available_from = current_date,
      job_categories = '{}'::text[],
      employment_types = '{}'::text[],
      shift_preferences = '{}'::text[],
      updated_at = now()
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  $$,
  'authenticated candidate can update candidate-owned onboarding fields'
);

select throws_ok(
  $$
    insert into public.candidate_profiles (
      id,
      display_name,
      onboarding_completed_at
    )
    values (
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'Bad',
      now()
    )
  $$,
  '42501',
  null,
  'authenticated candidate cannot insert onboarding_completed_at'
);

select throws_ok(
  $$
    insert into public.candidate_profiles (
      id,
      display_name,
      work_authorisation_declared_at
    )
    values (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'Bad',
      now()
    )
  $$,
  '42501',
  null,
  'authenticated candidate cannot insert work_authorisation_declared_at'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set onboarding_completed_at = now()
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  $$,
  '42501',
  null,
  'authenticated candidate cannot set onboarding_completed_at'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set work_authorisation_declared_at = now()
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  $$,
  '42501',
  null,
  'authenticated candidate cannot set work_authorisation_declared_at'
);

-- Privileged path can still set timestamps (future server operations)
reset role;
update public.candidate_profiles
set
  onboarding_completed_at = now(),
  work_authorisation_declared_at = now()
where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    update public.candidate_profiles
    set onboarding_completed_at = null
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  $$,
  '42501',
  null,
  'authenticated candidate cannot clear onboarding_completed_at'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set work_authorisation_declared_at = null
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  $$,
  '42501',
  null,
  'authenticated candidate cannot clear work_authorisation_declared_at'
);

select * from finish();
rollback;
