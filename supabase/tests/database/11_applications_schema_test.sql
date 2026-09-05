begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

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
values (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'authenticated',
  'authenticated',
  'apps-schema@example.com',
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
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Schema Candidate',
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

select has_column('public', 'applications', 'id', 'id exists');
select has_column('public', 'applications', 'candidate_id', 'candidate_id exists');
select has_column('public', 'applications', 'vacancy_id', 'vacancy_id exists');
select has_column('public', 'applications', 'status', 'status exists');
select has_column('public', 'applications', 'submitted_at', 'submitted_at exists');
select has_column(
  'public',
  'applications',
  'snapshot_version',
  'snapshot_version exists'
);
select has_column(
  'public',
  'applications',
  'candidate_snapshot',
  'candidate_snapshot exists'
);
select has_column(
  'public',
  'applications',
  'vacancy_snapshot',
  'vacancy_snapshot exists'
);
select has_column('public', 'applications', 'created_at', 'created_at exists');
select has_column('public', 'applications', 'updated_at', 'updated_at exists');
select has_column(
  'public',
  'applications',
  'introduction_text',
  'optional candidate introduction exists'
);
select col_is_null(
  'public',
  'applications',
  'introduction_text',
  'candidate introduction is nullable'
);

select col_not_null('public', 'applications', 'candidate_id', 'candidate_id not null');
select col_not_null('public', 'applications', 'vacancy_id', 'vacancy_id not null');
select col_not_null('public', 'applications', 'status', 'status not null');
select col_not_null('public', 'applications', 'submitted_at', 'submitted_at not null');
select col_not_null(
  'public',
  'applications',
  'snapshot_version',
  'snapshot_version not null'
);
select col_not_null(
  'public',
  'applications',
  'candidate_snapshot',
  'candidate_snapshot not null'
);
select col_not_null(
  'public',
  'applications',
  'vacancy_snapshot',
  'vacancy_snapshot not null'
);

select is(
  (
    select confdeltype
    from pg_constraint
    where conname = 'applications_candidate_id_fkey'
  ),
  'c',
  'candidate FK on delete cascade (Accepted D-038)'
);

select is(
  (
    select confdeltype
    from pg_constraint
    where conname = 'applications_vacancy_id_fkey'
  ),
  'r',
  'vacancy FK on delete restrict'
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
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '22222222-2222-4222-8222-222222222201',
      'viewed',
      now(),
      1,
      '{}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    )
  $$,
  '23514',
  null,
  'status rejects non-submitted values'
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
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '22222222-2222-4222-8222-222222222201',
      'submitted',
      now(),
      2,
      '{}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    )
  $$,
  '23514',
  null,
  'snapshot_version rejects values other than 1'
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
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '22222222-2222-4222-8222-222222222201',
      'submitted',
      now(),
      1,
      '[]'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    )
  $$,
  '23514',
  null,
  'candidate_snapshot must be a JSON object'
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
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '22222222-2222-4222-8222-222222222201',
      'submitted',
      now(),
      1,
      '{}'::jsonb,
      '"x"'::jsonb,
      now(),
      now()
    )
  $$,
  '23514',
  null,
  'vacancy_snapshot must be a JSON object'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'applications'
      and indexname = 'applications_vacancy_id_idx'
  ),
  'vacancy_id index exists'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'applications_candidate_vacancy_key'
      and contype = 'u'
  ),
  'unique (candidate_id, vacancy_id) constraint exists'
);

select has_function(
  'public',
  'submit_candidate_application',
  array['uuid', 'text'],
  'submit_candidate_application(uuid, text) exists'
);

select * from finish();
rollback;
