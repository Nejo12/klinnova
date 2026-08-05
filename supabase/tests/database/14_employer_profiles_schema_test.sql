begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

select has_table('public', 'employer_profiles', 'employer_profiles exists');
select has_pk('public', 'employer_profiles', 'employer_profiles pk');

select has_column('public', 'employer_profiles', 'id', 'id');
select has_column('public', 'employer_profiles', 'employer_type', 'employer_type');
select has_column('public', 'employer_profiles', 'display_name', 'display_name');
select has_column('public', 'employer_profiles', 'berlin_locality', 'berlin_locality');
select has_column('public', 'employer_profiles', 'phone', 'phone');
select has_column('public', 'employer_profiles', 'website', 'website');
select has_column(
  'public',
  'employer_profiles',
  'organisation_legal_name',
  'organisation_legal_name'
);
select has_column(
  'public',
  'employer_profiles',
  'lawful_hiring_declared',
  'lawful_hiring_declared'
);
select has_column(
  'public',
  'employer_profiles',
  'lawful_hiring_declared_at',
  'lawful_hiring_declared_at'
);
select has_column(
  'public',
  'employer_profiles',
  'verification_state',
  'verification_state'
);
select has_column(
  'public',
  'employer_profiles',
  'onboarding_completed_at',
  'onboarding_completed_at'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'employer_profiles_type_chk' and contype = 'c'
  ),
  'employer_type check exists'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'employer_profiles_verification_state_chk'
      and contype = 'c'
  ),
  'verification_state uses Slice 5 vocabulary constraint'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'employer_profiles_private_no_legal_name_chk'
      and contype = 'c'
  ),
  'private employers cannot store organisation_legal_name'
);

select has_column('public', 'companies', 'owner_employer_id', 'owner_employer_id');

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'companies_source_chk' and contype = 'c'
  ),
  'companies source allows seed|employer'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'companies_source_owner_chk' and contype = 'c'
  ),
  'companies source/owner invariant'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'companies_owner_employer_id_key'
  ),
  'one employer company per employer unique index'
);

select has_function('public', 'complete_employer_onboarding', 'completion RPC exists');
select has_function(
  'public',
  'bootstrap_organisation_employer',
  array['text', 'text', 'text', 'text', 'text', 'text', 'text'],
  'bootstrap RPC exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.complete_employer_onboarding()',
    'execute'
  ),
  'authenticated can execute complete_employer_onboarding'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.complete_employer_onboarding()',
    'execute'
  ),
  'anon cannot execute complete_employer_onboarding'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.bootstrap_organisation_employer(text,text,text,text,text,text,text)',
    'execute'
  ),
  'authenticated can execute bootstrap'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.bootstrap_organisation_employer(text,text,text,text,text,text,text)',
    'execute'
  ),
  'anon cannot execute bootstrap'
);

-- Seed fixtures remain valid after ownership extension
select ok(
  (
    select count(*)::integer
    from public.companies
    where source = 'seed' and owner_employer_id is null
  ) >= 2,
  'seed companies remain ownerless after reset'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employer_profiles'
      and column_name in ('role', 'default_role')
  ),
  'no role or default_role columns on employer_profiles'
);

select * from finish();
rollback;
