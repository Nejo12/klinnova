begin;

create extension if not exists pgtap with schema extensions;

select plan(42);

-- Columns
select has_column('public', 'vacancies', 'employer_profile_id', 'employer_profile_id');
select has_column('public', 'vacancies', 'description', 'description');
select has_column('public', 'vacancies', 'public_locality', 'public_locality');
select has_column('public', 'vacancies', 'workplace_type', 'workplace_type');
select has_column('public', 'vacancies', 'work_frequency', 'work_frequency');
select has_column('public', 'vacancies', 'salary_amount_cents', 'salary_amount_cents');
select has_column('public', 'vacancies', 'salary_currency', 'salary_currency');
select has_column('public', 'vacancies', 'salary_period', 'salary_period');
select has_column('public', 'vacancies', 'salary_is_gross', 'salary_is_gross');
select has_column('public', 'vacancies', 'cv_required', 'cv_required');
select has_column('public', 'vacancies', 'interview_english_ok', 'interview_english_ok');
select has_column('public', 'vacancies', 'experience_notes', 'experience_notes');

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'vacancies_employer_profile_id_fkey' and contype = 'f'
  ),
  'employer_profile_id FK exists'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'vacancies_source_chk' and contype = 'c'
  ),
  'source vocabulary check exists'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'vacancies_publication_state_chk' and contype = 'c'
  ),
  'publication_state includes draft vocabulary'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'vacancies_source_owner_chk' and contype = 'c'
  ),
  'source/owner invariant exists'
);

select ok(
  not exists (
    select 1 from pg_constraint
    where conname = 'vacancies_employer_draft_only_chk' and contype = 'c'
  ),
  'employer draft-only constraint is removed for Slice 5 lifecycle'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'vacancies_seed_not_draft_chk' and contype = 'c'
  ),
  'seed rows cannot be draft'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'vacancies_lifecycle_chk' and contype = 'c'
  ),
  'expanded lifecycle coherence check exists'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'vacancies_salary_group_chk' and contype = 'c'
  ),
  'salary coherent group check exists'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'vacancies_employer_profile_id_idx'
  ),
  'owner listing index exists'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'vacancies_employer_draft_lookup_idx'
  ),
  'employer draft lookup index exists'
);

-- Seed fixtures remain seed-owned and candidate-visible shape
select ok(
  (
    select bool_and(
      source = 'seed'
      and employer_profile_id is null
      and company_id is not null
      and publication_state in ('published', 'withdrawn')
    )
    from public.vacancies
  ),
  'all seed fixture vacancies keep seed ownership and lifecycle'
);

select is(
  (
    select count(*)::integer
    from public.vacancies
    where source = 'seed'
      and publication_state = 'published'
      and published_at is not null
      and published_at <= now()
      and expires_at > now()
  ),
  9,
  'active published seed vacancy count unchanged'
);

-- Seed cannot attach employer owner
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'd1717171-1717-4171-8171-171717171717',
  'authenticated', 'authenticated', 'schema-owner@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);

insert into public.employer_profiles (id, employer_type, display_name)
values ('d1717171-1717-4171-8171-171717171717', 'private', 'Schema Owner');

select throws_ok(
  $$
    update public.vacancies
    set employer_profile_id = 'd1717171-1717-4171-8171-171717171717'
    where id = '22222222-2222-4222-8222-222222222201'
  $$,
  '23514',
  null,
  'seed vacancy cannot gain employer_profile_id'
);

-- Salary group rejects incoherent partial salary
select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at,
      salary_amount_cents
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'Bad salary',
      'bad-salary-partial',
      'summary',
      'Berlin',
      'cleaning',
      array['part_time']::text[],
      array['daytime']::text[],
      'none',
      'published',
      'seed',
      now(),
      now() + interval '30 days',
      1000
    )
  $$,
  '23514',
  null,
  'partial salary group rejected'
);

-- Language uniqueness still enforced
select throws_ok(
  $$
    insert into public.vacancy_language_requirements (
      vacancy_id, language_code, min_proficiency
    ) values (
      '22222222-2222-4222-8222-222222222201',
      'en',
      'basic'
    ),
    (
      '22222222-2222-4222-8222-222222222201',
      'en',
      'native'
    )
  $$,
  '23505',
  null,
  'duplicate vacancy language requirements denied'
);

-- RPCs exist
select has_function(
  'public',
  'create_employer_vacancy_draft',
  'create draft RPC exists'
);
select has_function(
  'public',
  'update_employer_vacancy_draft',
  'update draft RPC exists'
);
select has_function(
  'public',
  'replace_employer_vacancy_languages',
  'replace languages RPC exists'
);
select has_function(
  'public',
  'delete_employer_vacancy_draft',
  'delete draft RPC exists'
);
select has_function(
  'public',
  'employer_vacancy_draft_readiness',
  'readiness RPC exists'
);

-- Grants: authenticated execute; anon denied
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_employer_vacancy_draft(text, text, text, text, text, text[], text[], text, text, text, integer, text, boolean, boolean, text, date)',
    'execute'
  ),
  'authenticated can execute create_employer_vacancy_draft'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_employer_vacancy_draft(text, text, text, text, text, text[], text[], text, text, text, integer, text, boolean, boolean, text, date)',
    'execute'
  ),
  'anon cannot execute create_employer_vacancy_draft'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.update_employer_vacancy_draft(uuid, text, text, text, text, text, text[], text[], text, text, text, integer, text, boolean, boolean, boolean, text, date, boolean)',
    'execute'
  ),
  'authenticated can execute update_employer_vacancy_draft'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.replace_employer_vacancy_languages(uuid, jsonb)',
    'execute'
  ),
  'authenticated can execute replace_employer_vacancy_languages'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.delete_employer_vacancy_draft(uuid)',
    'execute'
  ),
  'authenticated can execute delete_employer_vacancy_draft'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.employer_vacancy_draft_readiness(uuid)',
    'execute'
  ),
  'authenticated can execute employer_vacancy_draft_readiness'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public._employer_owned_draft_vacancy(uuid, uuid)',
    'execute'
  ),
  'helper _employer_owned_draft_vacancy not executable by authenticated'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public._employer_has_draft_vacancy(uuid)',
    'execute'
  ),
  'helper _employer_has_draft_vacancy not executable by authenticated'
);

select ok(
  not has_table_privilege('authenticated', 'public.vacancies', 'insert'),
  'authenticated has no direct insert on vacancies'
);

select ok(
  not has_table_privilege('authenticated', 'public.vacancies', 'delete'),
  'authenticated has no direct delete on vacancies'
);

select * from finish();
rollback;
