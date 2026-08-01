begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

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
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'allowlist@example.test',
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
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Allow List');

-- Null / empty partial state remains valid
select lives_ok(
  $$
    update public.candidate_profiles
    set
      german_comfort = null,
      travel_radius_minutes = null,
      job_categories = '{}',
      employment_types = '{}',
      shift_preferences = '{}'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'null scalars and empty arrays remain valid'
);

-- Accepted scalars
select lives_ok(
  $$
    update public.candidate_profiles
    set german_comfort = 'comfortable', travel_radius_minutes = 30
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'accepted german_comfort and travel minutes succeed'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set german_comfort = 'fluent'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '23514',
  null,
  'rejected german_comfort fails'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set travel_radius_minutes = 20
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '23514',
  null,
  'rejected travel minutes fail'
);

-- Accepted arrays
select lives_ok(
  $$
    update public.candidate_profiles
    set
      job_categories = array['cleaning', 'retail'],
      employment_types = array['full_time', 'mini_job'],
      shift_preferences = array['morning', 'flexible']
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'accepted preference arrays succeed'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set job_categories = array['cleaning', 'other']
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '23514',
  null,
  'rejected job category element fails'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set employment_types = array['gig']
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '23514',
  null,
  'rejected employment type fails'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set shift_preferences = array['afternoon']
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '23514',
  null,
  'rejected shift preference fails'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set job_categories = array['cleaning', 'cleaning']
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '23514',
  null,
  'duplicate job categories fail'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set employment_types = array['full_time', 'full_time']
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '23514',
  null,
  'duplicate employment types fail'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set shift_preferences = array['night', 'night']
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '23514',
  null,
  'duplicate shift preferences fail'
);

-- Languages accepted / rejected
select lives_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'de', 'native')
  $$,
  'accepted language code and proficiency succeed'
);

select lives_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'other', 'basic')
  $$,
  'other language code is accepted without free text'
);

select throws_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'xx', 'basic')
  $$,
  '23514',
  null,
  'rejected language code fails'
);

select throws_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'en', 'fluent')
  $$,
  '23514',
  null,
  'rejected proficiency fails'
);

select throws_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'de', 'basic')
  $$,
  '23505',
  null,
  'duplicate language code for candidate fails'
);

-- Spot-check remaining allow-list members
select lives_ok(
  $$
    update public.candidate_profiles
    set german_comfort = 'none'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'german_comfort none accepted'
);

select lives_ok(
  $$
    update public.candidate_profiles
    set german_comfort = 'basic'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'german_comfort basic accepted'
);

select lives_ok(
  $$
    update public.candidate_profiles
    set german_comfort = 'conversational'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'german_comfort conversational accepted'
);

select lives_ok(
  $$
    update public.candidate_profiles
    set travel_radius_minutes = 15
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'travel 15 accepted'
);

select lives_ok(
  $$
    update public.candidate_profiles
    set travel_radius_minutes = 45
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'travel 45 accepted'
);

select lives_ok(
  $$
    update public.candidate_profiles
    set travel_radius_minutes = 60
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'travel 60 accepted'
);

select lives_ok(
  $$
    update public.candidate_profiles
    set job_categories = array[
      'cleaning',
      'hospitality',
      'logistics',
      'warehousing',
      'food_production',
      'moving',
      'retail'
    ]
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'full job category allow-list accepted'
);

select lives_ok(
  $$
    update public.candidate_profiles
    set
      employment_types = array['full_time', 'part_time', 'mini_job', 'temporary'],
      shift_preferences = array[
        'morning',
        'daytime',
        'evening',
        'night',
        'weekend',
        'flexible'
      ]
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'full employment and shift allow-lists accepted'
);

select lives_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'en', 'proficient'),
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ar', 'conversational'),
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tr', 'basic')
  $$,
  'additional accepted language codes succeed'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set city = 'Hamburg'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '23514',
  null,
  'non-Berlin city still rejected'
);

select finish();
rollback;
