begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

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
    'a7111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'atomic@example.test',
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
values ('a7111111-1111-1111-1111-111111111111', 'Atomic');

-- Seed valid essentials as table owner, then complete as authenticated.
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
where id = 'a7111111-1111-1111-1111-111111111111';

insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('a7111111-1111-1111-1111-111111111111', 'de', 'native');

select set_config(
  'request.jwt.claim.sub',
  'a7111111-1111-1111-1111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a7111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.complete_candidate_onboarding()->>'status',
  'completed',
  'fixture completes successfully'
);

-- Declaration true with existing timestamp preserved across valid edit
create temporary table _decl_ts as
select work_authorisation_declared_at, onboarding_completed_at
from public.candidate_profiles
where id = 'a7111111-1111-1111-1111-111111111111';

update public.candidate_profiles
set travel_radius_minutes = 45, updated_at = now()
where id = 'a7111111-1111-1111-1111-111111111111';

select results_eq(
  $$
    select work_authorisation_declared_at, onboarding_completed_at
    from public.candidate_profiles
    where id = 'a7111111-1111-1111-1111-111111111111'
  $$,
  $$ select work_authorisation_declared_at, onboarding_completed_at from _decl_ts $$,
  'valid essential edit preserves completion and declaration timestamps'
);

-- Invalid essential edit clears completion in same statement; keeps WA stamp
update public.candidate_profiles
set job_categories = '{}'::text[], updated_at = now()
where id = 'a7111111-1111-1111-1111-111111111111';

select is(
  (
    select onboarding_completed_at is null
      and work_authorisation_declared_at is not null
      and work_authorisation_declared is true
    from public.candidate_profiles
    where id = 'a7111111-1111-1111-1111-111111111111'
  ),
  true,
  'invalid categories clear completion atomically and keep affirmative declaration stamp'
);

-- Restore categories and re-complete: new completion ts; preserve continuous WA stamp
update public.candidate_profiles
set job_categories = array['cleaning']::text[], updated_at = now()
where id = 'a7111111-1111-1111-1111-111111111111';

create temporary table _wa_before_recomplete as
select work_authorisation_declared_at
from public.candidate_profiles
where id = 'a7111111-1111-1111-1111-111111111111';

select is(
  public.complete_candidate_onboarding()->>'already_complete',
  'false',
  're-completion after invalidation is a fresh completion'
);

select is(
  (
    select onboarding_completed_at is not null
    from public.candidate_profiles
    where id = 'a7111111-1111-1111-1111-111111111111'
  ),
  true,
  're-completion writes a new onboarding_completed_at'
);

select is(
  (
    select p.work_authorisation_declared_at = w.work_authorisation_declared_at
    from public.candidate_profiles p
    cross join _wa_before_recomplete w
    where p.id = 'a7111111-1111-1111-1111-111111111111'
  ),
  true,
  're-completion preserves declaration timestamp when continuously true'
);

-- Declaration false clears both declaration stamp and completion
update public.candidate_profiles
set work_authorisation_declared = false, updated_at = now()
where id = 'a7111111-1111-1111-1111-111111111111';

select is(
  (
    select onboarding_completed_at is null
      and work_authorisation_declared_at is null
      and work_authorisation_declared is false
    from public.candidate_profiles
    where id = 'a7111111-1111-1111-1111-111111111111'
  ),
  true,
  'declaration false clears declaration timestamp and completion atomically'
);

-- Declaration true sets stamp when null
update public.candidate_profiles
set work_authorisation_declared = true, updated_at = now()
where id = 'a7111111-1111-1111-1111-111111111111';

select is(
  (
    select work_authorisation_declared_at is not null
      and onboarding_completed_at is null
    from public.candidate_profiles
    where id = 'a7111111-1111-1111-1111-111111111111'
  ),
  true,
  'declaration true sets stamp when null and does not auto-complete'
);

create temporary table _wa_after_true as
select work_authorisation_declared_at
from public.candidate_profiles
where id = 'a7111111-1111-1111-1111-111111111111';

update public.candidate_profiles
set work_authorisation_declared = true, german_comfort = 'comfortable', updated_at = now()
where id = 'a7111111-1111-1111-1111-111111111111';

select is(
  (
    select p.work_authorisation_declared_at = w.work_authorisation_declared_at
    from public.candidate_profiles p
    cross join _wa_after_true w
    where p.id = 'a7111111-1111-1111-1111-111111111111'
  ),
  true,
  'declaration true with existing timestamp preserves it'
);

select is(
  public.complete_candidate_onboarding()->>'status',
  'completed',
  'complete after false→true sets completion'
);

select is(
  (
    select p.work_authorisation_declared_at = w.work_authorisation_declared_at
    from public.candidate_profiles p
    cross join _wa_after_true w
    where p.id = 'a7111111-1111-1111-1111-111111111111'
  ),
  true,
  'completion after false→true does not overwrite declaration timestamp'
);

-- Language: valid proficiency change preserves completion
update public.candidate_languages
set proficiency = 'proficient', updated_at = now()
where candidate_id = 'a7111111-1111-1111-1111-111111111111';

select is(
  (
    select onboarding_completed_at is not null
    from public.candidate_profiles
    where id = 'a7111111-1111-1111-1111-111111111111'
  ),
  true,
  'valid language proficiency change preserves completion'
);

insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('a7111111-1111-1111-1111-111111111111', 'en', 'basic');

select is(
  (
    select onboarding_completed_at is not null
    from public.candidate_profiles
    where id = 'a7111111-1111-1111-1111-111111111111'
  ),
  true,
  'inserting another valid language preserves completion'
);

-- Deleting languages until none remain clears completion
delete from public.candidate_languages
where candidate_id = 'a7111111-1111-1111-1111-111111111111';

select is(
  (
    select onboarding_completed_at is null
      and work_authorisation_declared is true
      and work_authorisation_declared_at is not null
    from public.candidate_profiles
    where id = 'a7111111-1111-1111-1111-111111111111'
  ),
  true,
  'deleting all languages clears completion and keeps affirmative declaration stamp'
);

-- Language mutation cannot auto-complete
insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('a7111111-1111-1111-1111-111111111111', 'de', 'native');

select is(
  (
    select onboarding_completed_at
    from public.candidate_profiles
    where id = 'a7111111-1111-1111-1111-111111111111'
  ),
  null,
  'restoring languages does not auto-complete'
);

-- Failed language mutation rolls back without altering completion
select is(
  public.complete_candidate_onboarding()->>'status',
  'completed',
  're-complete before failed mutation fixture'
);

select throws_ok(
  $$
    insert into public.candidate_languages (
      candidate_id,
      language_code,
      proficiency
    )
    values (
      'a7111111-1111-1111-1111-111111111111',
      'de',
      'native'
    )
  $$,
  '23505',
  null,
  'duplicate language insert fails'
);

select is(
  (
    select onboarding_completed_at is not null
    from public.candidate_profiles
    where id = 'a7111111-1111-1111-1111-111111111111'
  ),
  true,
  'failed language mutation does not clear completion'
);

-- Trigger functions: fixed search_path
select is(
  (
    select p.proconfig::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'complete_candidate_onboarding'
  ),
  '{"search_path=pg_catalog, public"}',
  'complete_candidate_onboarding locks search_path'
);

select is(
  (
    select p.proconfig::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = '_trg_candidate_profiles_essentials'
  ),
  '{"search_path=pg_catalog, public"}',
  'profile essentials trigger locks search_path'
);

select ok(
  not has_function_privilege(
    'anon',
    'public._clear_completion_if_incomplete(uuid)',
    'execute'
  ),
  'anon cannot execute clear-completion helper'
);

select * from finish();
rollback;
