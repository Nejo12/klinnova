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
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'apps-owner@example.com',
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
    'apps-other@example.com',
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
    'Owner Candidate',
    'basic',
    true,
    now(),
    'Berlin',
    30,
    current_date,
    array['hospitality']::text[],
    array['part_time']::text[],
    array['morning']::text[],
    now()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Other Candidate',
    'basic',
    true,
    now(),
    'Berlin',
    30,
    current_date,
    array['hospitality']::text[],
    array['part_time']::text[],
    array['morning']::text[],
    now()
  );

insert into public.applications (
  id,
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
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '22222222-2222-4222-8222-222222222201',
  'submitted',
  now(),
  1,
  '{"display_name":"Owner Candidate"}'::jsonb,
  '{"title":"Demo"}'::jsonb,
  now(),
  now()
);

select ok(
  has_table_privilege('authenticated', 'public.applications', 'select'),
  'authenticated has select on applications'
);

select ok(
  not has_table_privilege('authenticated', 'public.applications', 'insert'),
  'authenticated has no insert on applications'
);

select ok(
  not has_table_privilege('authenticated', 'public.applications', 'update'),
  'authenticated has no update on applications'
);

select ok(
  not has_table_privilege('authenticated', 'public.applications', 'delete'),
  'authenticated has no delete on applications'
);

select ok(
  not has_table_privilege('anon', 'public.applications', 'select'),
  'anon has no select on applications'
);

select ok(
  not has_table_privilege('anon', 'public.applications', 'insert'),
  'anon has no insert on applications'
);

select ok(
  not has_table_privilege('anon', 'public.applications', 'update'),
  'anon has no update on applications'
);

select ok(
  not has_table_privilege('anon', 'public.applications', 'delete'),
  'anon has no delete on applications'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.submit_candidate_application(uuid)',
    'execute'
  ),
  'authenticated can execute submit_candidate_application'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.submit_candidate_application(uuid)',
    'execute'
  ),
  'anon cannot execute submit_candidate_application'
);

select ok(
  not has_function_privilege(
    'public',
    'public.submit_candidate_application(uuid)',
    'execute'
  ),
  'PUBLIC cannot execute submit_candidate_application'
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
  (
    select count(*)::integer
    from public.applications
  ),
  1,
  'owner can select own application'
);

select is(
  (
    select id::text
    from public.applications
    limit 1
  ),
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'owner reads own application id'
);

reset role;

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
  (
    select count(*)::integer
    from public.applications
  ),
  0,
  'other candidate cannot read foreign application'
);

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
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      '22222222-2222-4222-8222-222222222201',
      'submitted',
      now(),
      1,
      '{}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    )
  $$,
  '42501',
  null,
  'authenticated direct insert denied'
);

select throws_ok(
  $$
    update public.applications
    set updated_at = now()
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  $$,
  '42501',
  null,
  'authenticated direct update denied'
);

select throws_ok(
  $$
    delete from public.applications
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  $$,
  '42501',
  null,
  'authenticated direct delete denied'
);

reset role;
set local role anon;

select throws_ok(
  $$
    select count(*)::integer from public.applications
  $$,
  '42501',
  null,
  'anon select on applications denied'
);

select throws_ok(
  $$
    select public.submit_candidate_application(
      '22222222-2222-4222-8222-222222222201'
    )
  $$,
  '42501',
  null,
  'anon execute of submit RPC denied'
);

reset role;

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

select throws_ok(
  $$
    update public.applications
    set candidate_snapshot = '{"hacked":true}'::jsonb
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  $$,
  '42501',
  null,
  'authenticated cannot mutate snapshots'
);

select throws_ok(
  $$
    delete from public.applications
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '42501',
  null,
  'owner authenticated delete still denied'
);

reset role;

select * from finish();
rollback;
