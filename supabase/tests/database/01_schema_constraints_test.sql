begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

-- Auth users for FK tests (rolled back with the transaction)
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
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'constraints-a@example.test',
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

-- Partial onboarding row is valid
select lives_ok(
  $$
    insert into public.candidate_profiles (id, display_name)
    values ('11111111-1111-1111-1111-111111111111', 'Ada')
  $$,
  'partial onboarding profile insert succeeds'
);

select results_eq(
  $$
    select job_categories, employment_types, shift_preferences, onboarding_completed_at
    from public.candidate_profiles
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$
    values (
      '{}'::text[],
      '{}'::text[],
      '{}'::text[],
      null::timestamptz
    )
  $$,
  'empty arrays and null completion are valid before completion'
);

-- Profile ID must reference auth.users
select throws_ok(
  $$
    insert into public.candidate_profiles (id, display_name)
    values ('99999999-9999-9999-9999-999999999999', 'Ghost')
  $$,
  '23503',
  null,
  'profile id must correspond to an auth user'
);

-- Duplicate profile id fails
select throws_ok(
  $$
    insert into public.candidate_profiles (id, display_name)
    values ('11111111-1111-1111-1111-111111111111', 'Dup')
  $$,
  '23505',
  null,
  'duplicate candidate profile id fails'
);

-- Empty / whitespace display name fails
select throws_ok(
  $$
    update public.candidate_profiles
    set display_name = '   '
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '23514',
  null,
  'empty display name fails'
);

-- Non-Berlin city fails when present
select throws_ok(
  $$
    update public.candidate_profiles
    set city = 'Munich'
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '23514',
  null,
  'non-Berlin city fails'
);

select lives_ok(
  $$
    update public.candidate_profiles
    set city = 'Berlin'
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  'Berlin city is accepted'
);

-- Non-positive travel radius fails when present
select throws_ok(
  $$
    update public.candidate_profiles
    set travel_radius_minutes = 0
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '23514',
  null,
  'non-positive travel radius fails'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set job_categories = array[null]::text[]
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '23514',
  null,
  'null array elements are rejected'
);

select lives_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('11111111-1111-1111-1111-111111111111', 'en', 'conversational')
  $$,
  'language row insert succeeds'
);

select throws_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('11111111-1111-1111-1111-111111111111', 'en', 'fluent')
  $$,
  '23505',
  null,
  'duplicate candidate/language pair fails'
);

select throws_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('11111111-1111-1111-1111-111111111111', '  ', 'fluent')
  $$,
  '23514',
  null,
  'blank language code fails'
);

select throws_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('11111111-1111-1111-1111-111111111111', 'de', '   ')
  $$,
  '23514',
  null,
  'blank proficiency fails'
);

-- FK cascade configuration
select is(
  (
    select confdeltype
    from pg_constraint
    where conname = 'candidate_profiles_id_fkey'
  ),
  'c',
  'candidate_profiles id FK cascades on delete'
);

select is(
  (
    select confdeltype
    from pg_constraint
    where conname = 'candidate_languages_candidate_id_fkey'
  ),
  'c',
  'candidate_languages candidate_id FK cascades on delete'
);

select * from finish();
rollback;
