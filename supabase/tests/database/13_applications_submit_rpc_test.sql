begin;

create extension if not exists pgtap with schema extensions;

select plan(48);

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
    'apps-complete@example.com',
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
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'apps-incomplete@example.com',
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
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated',
    'authenticated',
    'apps-second@example.com',
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

insert into public.candidate_profiles (
  id,
  display_name,
  german_comfort,
  work_authorisation_declared,
  work_authorisation_declared_at,
  city,
  travel_radius_minutes,
  available_from,
  job_categories,
  employment_types,
  shift_preferences,
  onboarding_completed_at
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Complete Candidate',
    'basic',
    true,
    now(),
    'Berlin',
    30,
    date '2026-02-01',
    array['hospitality', 'cleaning', 'food_production']::text[],
    array['mini_job', 'part_time']::text[],
    array['daytime', 'morning']::text[],
    null
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Incomplete Candidate',
    null,
    null,
    null,
    null,
    null,
    null,
    '{}'::text[],
    '{}'::text[],
    '{}'::text[],
    null
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Second Candidate',
    'basic',
    true,
    now(),
    'Berlin',
    30,
    current_date,
    array['hospitality']::text[],
    array['part_time']::text[],
    array['morning']::text[],
    null
  );

insert into public.candidate_languages (
  candidate_id,
  language_code,
  proficiency
)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'en', 'conversational'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tr', 'basic'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ar', 'native');

-- Language triggers clear completion; set the gate after language rows exist.
update public.candidate_profiles
set onboarding_completed_at = now()
where id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- Unauthenticated call (no JWT) — SECURITY DEFINER still runs; auth.uid() null.
select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222201'
  ) ->> 'result',
  'unavailable',
  'unauthenticated submit returns unavailable'
);

select is(
  (
    select count(*)::integer
    from public.applications
  ),
  0,
  'unauthenticated submit creates no row'
);

select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222201'
  ) ->> 'result',
  'incomplete',
  'incomplete candidate returns incomplete'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.applications
  ),
  0,
  'incomplete candidate creates no row'
);

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.submit_candidate_application(
    '99999999-9999-4999-8999-999999999999'
  ) ->> 'result',
  'unavailable',
  'missing vacancy returns unavailable'
);

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222210'
  ) ->> 'result',
  'unavailable',
  'withdrawn vacancy returns unavailable'
);

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222211'
  ) ->> 'result',
  'unavailable',
  'expired vacancy returns unavailable'
);

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222212'
  ) ->> 'result',
  'unavailable',
  'future vacancy returns unavailable'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.applications
  ),
  0,
  'lifecycle denials create no rows'
);

-- Successful submit on food-production vacancy with EN requirement (…206 / …301).
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222206'
  ) ->> 'result',
  'submitted',
  'first submit on active seed vacancy returns submitted'
);

select ok(
  (
    public.submit_candidate_application(
      '22222222-2222-4222-8222-222222222206'
    ) ? 'application_id'
  ),
  'submitted result includes application_id'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  1,
  'exactly one application row after first submit'
);

select is(
  (
    select status
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  'submitted',
  'stored status is submitted'
);

select is(
  (
    select snapshot_version
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  1,
  'snapshot_version is 1'
);

select is(
  (
    select candidate_snapshot ?& array[
      'display_name',
      'job_category',
      'german_comfort',
      'languages',
      'work_authorisation_declared',
      'available_from',
      'employment_types',
      'shift_preferences'
    ]
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  true,
  'candidate snapshot contains approved keys'
);

select is(
  (
    select (
      select count(*)::integer
      from jsonb_object_keys(candidate_snapshot) as k (key)
    )
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  8,
  'candidate snapshot has exactly eight keys'
);

select is(
  (
    select vacancy_snapshot ?& array[
      'vacancy_id',
      'title',
      'employer_display_name',
      'source',
      'demo_label',
      'city',
      'job_category',
      'employment_types',
      'shift_requirements',
      'german_requirement',
      'language_requirements',
      'available_from'
    ]
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  true,
  'vacancy snapshot contains approved keys'
);

select is(
  (
    select (
      select count(*)::integer
      from jsonb_object_keys(vacancy_snapshot) as k (key)
    )
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  12,
  'vacancy snapshot has exactly twelve keys'
);

select ok(
  (
    select not (
      candidate_snapshot ? 'email'
      or candidate_snapshot ? 'phone'
      or candidate_snapshot ? 'cv'
      or candidate_snapshot ? 'exact_address'
      or candidate_snapshot ? 'auth_user_id'
      or vacancy_snapshot ? 'email'
      or vacancy_snapshot ? 'salary'
    )
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  'snapshots exclude sensitive and unsupported keys'
);

select is(
  (
    select candidate_snapshot ->> 'job_category'
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  'food_production',
  'candidate snapshot job_category is vacancy category present in candidate preferences'
);

select ok(
  (
    select exists (
      select 1
      from public.applications a
      join public.candidate_profiles p
        on p.id = a.candidate_id
      where a.candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
        and a.vacancy_id = '22222222-2222-4222-8222-222222222206'
        and a.candidate_snapshot ->> 'job_category' = any (p.job_categories)
    )
  ),
  'candidate snapshot job_category membership is backed by candidate preferences'
);

select is(
  (
    select candidate_snapshot ->> 'available_from'
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  '2026-02-01',
  'candidate available_from is ISO date text'
);

select is(
  (
    select candidate_snapshot -> 'languages'
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  '[{"language_code":"en","proficiency":"conversational"}]'::jsonb,
  'candidate languages include only vacancy-relevant declarations, ordered'
);

select is(
  (
    select candidate_snapshot -> 'employment_types'
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  '["mini_job", "part_time"]'::jsonb,
  'employment_types are deterministically ordered'
);

select is(
  (
    select vacancy_snapshot ->> 'demo_label'
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  'Demo vacancy',
  'vacancy snapshot includes Demo vacancy label'
);

select is(
  (
    select vacancy_snapshot ->> 'employer_display_name'
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  'Demo Berlin Work Co',
  'vacancy snapshot employer_display_name from companies.name'
);

select is(
  (
    select vacancy_snapshot -> 'language_requirements'
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  '[{"language_code":"en","min_proficiency":"conversational"}]'::jsonb,
  'vacancy language_requirements ordered'
);

select ok(
  (
    select submitted_at = created_at
      and created_at = updated_at
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  'submitted_at, created_at, and updated_at share one transaction timestamp'
);

-- Capture snapshot and id before retry / edits (table-owner temp table).
create temporary table _app_before as
select
  id,
  candidate_snapshot,
  vacancy_snapshot,
  submitted_at
from public.applications
where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  and vacancy_id = '22222222-2222-4222-8222-222222222206';

grant select on table _app_before to authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222206'
  ) ->> 'result',
  'already_applied',
  'second submit returns already_applied'
);

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222206'
  ) ->> 'application_id',
  (
    select id::text
    from _app_before
  ),
  'already_applied returns the same application id'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  1,
  'duplicate submit does not create a second row'
);

-- Source-row edits clear completion; incomplete must win over already_applied.
update public.candidate_profiles
set
  display_name = 'Renamed After Apply',
  german_comfort = 'comfortable',
  updated_at = now()
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

update public.vacancies
set
  title = 'Demo vacancy — Renamed After Apply',
  updated_at = now()
where id = '22222222-2222-4222-8222-222222222206';

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222206'
  ) ->> 'result',
  'incomplete',
  'incomplete after existing application returns incomplete'
);

select ok(
  (
    select (
      public.submit_candidate_application(
        '22222222-2222-4222-8222-222222222206'
      ) ? 'application_id'
    ) = false
  ),
  'incomplete after existing application does not return application_id'
);

select is(
  (
    select count(*)::integer
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222206'
  ),
  1,
  'incomplete retry leaves the historical application row untouched'
);

select is(
  (
    select count(*)::integer
    from public.applications
    where id = (select id from _app_before)
  ),
  1,
  'historical application remains readable via candidate-own SELECT'
);

reset role;

select is(
  (
    select candidate_snapshot
    from public.applications
    where id = (select id from _app_before)
  ),
  (
    select candidate_snapshot
    from _app_before
  ),
  'candidate snapshot unchanged after incomplete retry'
);

select is(
  (
    select vacancy_snapshot
    from public.applications
    where id = (select id from _app_before)
  ),
  (
    select vacancy_snapshot
    from _app_before
  ),
  'vacancy snapshot unchanged after vacancy edit + incomplete retry'
);

select is(
  (
    select candidate_snapshot ->> 'display_name'
    from public.applications
    where id = (select id from _app_before)
  ),
  'Complete Candidate',
  'historical display_name preserved in snapshot'
);

-- Completed retry still returns already_applied + existing id.
update public.candidate_profiles
set onboarding_completed_at = now()
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222206'
  ) ->> 'result',
  'already_applied',
  'completed candidate retry returns already_applied'
);

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222206'
  ) ->> 'application_id',
  (
    select id::text
    from _app_before
  ),
  'completed retry returns the existing application id'
);

reset role;

-- Direct unique violation cannot create a second row (table-owner path).
select throws_ok(
  $$
    insert into public.applications (
      candidate_id,
      vacancy_id,
      status,
      submitted_at,
      snapshot_version,
      candidate_snapshot,
      vacancy_snapshot,
      created_at,
      updated_at
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '22222222-2222-4222-8222-222222222206',
      'submitted',
      now(),
      1,
      '{"display_name":"x"}'::jsonb,
      '{"title":"y"}'::jsonb,
      now(),
      now()
    )
  $$,
  '23505',
  null,
  'direct duplicate insert hits unique constraint'
);

-- Second candidate can apply to a different vacancy; cannot use first candidate id.
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222201'
  ) ->> 'result',
  'submitted',
  'second candidate can submit a different vacancy'
);

select is(
  (
    select candidate_id::text
    from public.applications
    where vacancy_id = '22222222-2222-4222-8222-222222222201'
  ),
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'RPC derives candidate_id from auth.uid(), not caller args'
);

reset role;

-- Morning kitchen has zero language requirements → empty languages array.
-- Vacancy 201 was already taken by candidate C; A uses cleaning vacancy 204.
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222204'
  ) ->> 'result',
  'submitted',
  'submit succeeds for vacancy with zero language requirements'
);

reset role;

select is(
  (
    select candidate_snapshot -> 'languages'
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222204'
  ),
  '[]'::jsonb,
  'empty languages array when vacancy has no additional language requirements'
);

-- Narrow category membership only — not a full matcher; miss → unavailable.
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222202'
  ) ->> 'result',
  'unavailable',
  'missing preferred category returns unavailable (not not_matching)'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and vacancy_id = '22222222-2222-4222-8222-222222222202'
  ),
  0,
  'missing preferred category creates no application row'
);

select ok(
  (
    select p.prosrc not ilike '%not_matching%'
      and p.prosrc not ilike '%match_candidate_to_vacancy%'
      and p.prosrc not ilike '%concrete_shifts%'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'submit_candidate_application'
      and pg_get_function_identity_arguments(p.oid) = 'p_vacancy_id uuid'
  ),
  'submit RPC does not implement the full TypeScript matcher in SQL'
);

select * from finish();
rollback;
