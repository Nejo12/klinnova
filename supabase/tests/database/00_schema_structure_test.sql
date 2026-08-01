begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

-- Tables exist
select has_table('public', 'candidate_profiles', 'candidate_profiles exists');
select has_table('public', 'candidate_languages', 'candidate_languages exists');

-- Forbidden application tables must not exist
select hasnt_table('public', 'profiles', 'no shared profiles table');
select hasnt_table('public', 'candidate_preferences', 'no candidate_preferences table');
select hasnt_table('public', 'employer_profiles', 'no employer_profiles table');
select hasnt_table('public', 'companies', 'no companies table');
select hasnt_table('public', 'jobs', 'no jobs table');
select hasnt_table('public', 'vacancies', 'no vacancies table');
select hasnt_table('public', 'applications', 'no applications table');

-- Keys and RLS
select has_pk('public', 'candidate_profiles', 'candidate_profiles has primary key');
select has_pk('public', 'candidate_languages', 'candidate_languages has primary key');

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
    where conname = 'candidate_languages_candidate_code_key'
      and contype = 'u'
  ),
  'unique (candidate_id, language_code)'
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
