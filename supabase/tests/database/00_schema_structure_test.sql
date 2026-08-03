begin;

create extension if not exists pgtap with schema extensions;

select plan(35);

-- Tables exist
select has_table('public', 'candidate_profiles', 'candidate_profiles exists');
select has_table('public', 'candidate_languages', 'candidate_languages exists');
select has_table('public', 'companies', 'companies exists');
select has_table('public', 'vacancies', 'vacancies exists');
select has_table(
  'public',
  'vacancy_language_requirements',
  'vacancy_language_requirements exists'
);
select has_table('public', 'applications', 'applications exists');

-- Forbidden application tables must not exist
select hasnt_table('public', 'profiles', 'no shared profiles table');
select hasnt_table('public', 'candidate_preferences', 'no candidate_preferences table');
select hasnt_table('public', 'employer_profiles', 'no employer_profiles table');
select hasnt_table('public', 'jobs', 'no jobs table');

-- Keys and RLS
select has_pk('public', 'candidate_profiles', 'candidate_profiles has primary key');
select has_pk('public', 'candidate_languages', 'candidate_languages has primary key');
select has_pk('public', 'companies', 'companies has primary key');
select has_pk('public', 'vacancies', 'vacancies has primary key');
select has_pk(
  'public',
  'vacancy_language_requirements',
  'vacancy_language_requirements has primary key'
);
select has_pk('public', 'applications', 'applications has primary key');

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'candidate_profiles_id_fkey'
      and contype = 'f'
  ),
  'candidate_profiles references auth.users'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'candidate_languages_candidate_id_fkey'
      and contype = 'f'
  ),
  'candidate_languages references candidate_profiles'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'vacancies_company_id_fkey'
      and contype = 'f'
  ),
  'vacancies references companies'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'vacancy_language_requirements_vacancy_id_fkey'
      and contype = 'f'
  ),
  'vacancy_language_requirements references vacancies'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'candidate_languages_candidate_code_key'
      and contype = 'u'
  ),
  'unique (candidate_id, language_code)'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'vacancy_language_requirements_vacancy_code_key'
      and contype = 'u'
  ),
  'unique (vacancy_id, language_code)'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'candidate_languages'
      and indexname = 'candidate_languages_candidate_id_idx'
  ),
  'owner listing index on candidate_id'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.candidate_profiles'::regclass
  ),
  true,
  'RLS enabled on candidate_profiles'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.candidate_languages'::regclass
  ),
  true,
  'RLS enabled on candidate_languages'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.companies'::regclass
  ),
  true,
  'RLS enabled on companies'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.vacancies'::regclass
  ),
  true,
  'RLS enabled on vacancies'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.vacancy_language_requirements'::regclass
  ),
  true,
  'RLS enabled on vacancy_language_requirements'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.applications'::regclass
  ),
  true,
  'RLS enabled on applications'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'applications_candidate_id_fkey'
      and contype = 'f'
  ),
  'applications references candidate_profiles'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'applications_vacancy_id_fkey'
      and contype = 'f'
  ),
  'applications references vacancies'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'applications_candidate_vacancy_key'
      and contype = 'u'
  ),
  'unique (candidate_id, vacancy_id)'
);

-- No auth.users insert triggers (D-024)
select is(
  (
    select count(*)::integer
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth'
      and c.relname = 'users'
      and not t.tgisinternal
  ),
  0,
  'no non-internal triggers on auth.users'
);

-- Expected columns
select has_column('public', 'candidate_profiles', 'onboarding_completed_at', 'completion column exists');
select has_column(
  'public',
  'candidate_profiles',
  'work_authorisation_declared_at',
  'declaration timestamp column exists'
);

select * from finish();
rollback;
