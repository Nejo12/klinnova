begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

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
    'completed-vacancy@example.com',
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
    'incomplete-vacancy@example.com',
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
    'Completed Candidate',
    'basic',
    true,
    now(),
    'Berlin',
    30,
    current_date,
    array['cleaning', 'hospitality']::text[],
    array['part_time', 'mini_job']::text[],
    array['daytime', 'flexible']::text[],
    now()
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
  );

-- Exact expiry boundary fixture (transactional).
insert into public.vacancies (
  id,
  company_id,
  title,
  slug,
  summary,
  city,
  job_category,
  employment_types,
  shift_requirements,
  german_requirement,
  publication_state,
  source,
  published_at,
  expires_at
)
values (
  'e1e1e1e1-e1e1-41e1-81e1-e1e1e1e1e199',
  '11111111-1111-4111-8111-111111111111',
  'Exact expiry boundary vacancy',
  'exact-expiry-boundary-vacancy',
  'expires_at equals now(); must be hidden',
  'Berlin',
  'cleaning',
  array['part_time']::text[],
  array['daytime']::text[],
  'none',
  'published',
  'seed',
  now() - interval '1 day',
  now()
);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

select ok(
  exists (
    select 1
    from public.vacancies
    where id = '22222222-2222-4222-8222-222222222201'
  ),
  'completed candidate can select active seed vacancy'
);

select is(
  (select count(*)::integer from public.vacancies),
  9,
  'completed candidate sees exactly nine active seed vacancies'
);

select ok(
  exists (
    select 1
    from public.companies
    where id = '11111111-1111-4111-8111-111111111111'
  ),
  'completed candidate can select company with active vacancies (contract B)'
);

select is(
  (
    select count(*)::integer
    from public.companies
    where id = '44444444-4444-4444-8444-444444444444'
  ),
  0,
  'company with only withdrawn/future/expired vacancies is hidden (contract B)'
);

select is(
  (
    select count(*)::integer
    from public.vacancies
    where id in (
      '22222222-2222-4222-8222-222222222210',
      '22222222-2222-4222-8222-222222222211',
      '22222222-2222-4222-8222-222222222212',
      '22222222-2222-4222-8222-222222222213',
      'e1e1e1e1-e1e1-41e1-81e1-e1e1e1e1e199'
    )
  ),
  0,
  'withdrawn, expired, future, boundary-expired, and exact-now expiry are hidden'
);

select ok(
  exists (
    select 1
    from public.vacancy_language_requirements
    where id = '33333333-3333-4333-8333-333333333301'
  ),
  'language rows for visible vacancy are selectable'
);

select is(
  (
    select count(*)::integer
    from public.vacancy_language_requirements
    where id = '33333333-3333-4333-8333-333333333305'
  ),
  0,
  'language rows for withdrawn vacancy are hidden'
);

-- Visibility helpers match SELECT (no hidden inventory).
select is(
  (
    select count(*)::integer
    from public.visible_seed_vacancy_ids()
  ),
  (select count(*)::integer from public.vacancies),
  'visible_seed_vacancy_ids matches selectable vacancy count'
);

select is(
  (
    select count(*)::integer
    from public.visible_seed_company_ids()
  ),
  (select count(*)::integer from public.companies),
  'visible_seed_company_ids matches selectable company count'
);

select ok(
  not exists (
    select 1
    from public.visible_seed_vacancy_ids() ids
    where ids in (
      '22222222-2222-4222-8222-222222222210',
      '22222222-2222-4222-8222-222222222211',
      '22222222-2222-4222-8222-222222222212',
      '22222222-2222-4222-8222-222222222213',
      'e1e1e1e1-e1e1-41e1-81e1-e1e1e1e1e199'
    )
  ),
  'visibility helper does not return hidden lifecycle vacancy ids'
);

select ok(
  not exists (
    select 1
    from public.visible_seed_company_ids() ids
    where ids = '44444444-4444-4444-8444-444444444444'
  ),
  'visibility helper does not return lifecycle-only company id'
);

-- Authenticated cannot mutate.
select throws_ok(
  $$
    insert into public.companies (name, slug, source)
    values ('Hack Co', 'hack-co', 'seed')
  $$,
  '42501',
  null,
  'authenticated cannot insert companies'
);

select throws_ok(
  $$
    update public.vacancies
    set title = 'Hacked'
    where id = '22222222-2222-4222-8222-222222222201'
  $$,
  '42501',
  null,
  'authenticated cannot update vacancies'
);

select throws_ok(
  $$
    delete from public.vacancies
    where id = '22222222-2222-4222-8222-222222222201'
  $$,
  '42501',
  null,
  'authenticated cannot delete vacancies'
);

-- Incomplete candidate sees nothing, including via helpers.
reset role;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.vacancies),
  0,
  'incomplete candidate cannot select vacancies'
);

select is(
  (select count(*)::integer from public.companies),
  0,
  'incomplete candidate cannot select companies'
);

select is(
  (select count(*)::integer from public.vacancy_language_requirements),
  0,
  'incomplete candidate cannot select language requirements'
);

select is(
  (select count(*)::integer from public.visible_seed_vacancy_ids()),
  0,
  'incomplete helper call returns no vacancy ids'
);

select is(
  (select count(*)::integer from public.visible_seed_company_ids()),
  0,
  'incomplete helper call returns no company ids'
);

-- Anonymous denied by privilege.
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '', true);

select throws_ok(
  $$ select 1 from public.companies $$,
  '42501',
  null,
  'anonymous cannot select companies'
);

select throws_ok(
  $$ select 1 from public.vacancies $$,
  '42501',
  null,
  'anonymous cannot select vacancies'
);

select throws_ok(
  $$ select 1 from public.vacancy_language_requirements $$,
  '42501',
  null,
  'anonymous cannot select vacancy language requirements'
);

select throws_ok(
  $$ select public.visible_seed_vacancy_ids() $$,
  '42501',
  null,
  'anonymous cannot execute visible_seed_vacancy_ids'
);

select throws_ok(
  $$ select public.visible_seed_company_ids() $$,
  '42501',
  null,
  'anonymous cannot execute visible_seed_company_ids'
);

-- Removed UUID-probe helpers must not exist.
reset role;
select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'candidate_onboarding_is_complete',
        'company_is_seed',
        'company_has_active_seed_vacancy',
        'vacancy_is_active_seed'
      )
  ),
  'UUID-probe helper functions are not present'
);

select * from finish();
rollback;
