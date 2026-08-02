begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select ok(
  has_table_privilege('authenticated', 'public.companies', 'select'),
  'authenticated has select on companies'
);

select ok(
  has_table_privilege('authenticated', 'public.vacancies', 'select'),
  'authenticated has select on vacancies'
);

select ok(
  has_table_privilege(
    'authenticated',
    'public.vacancy_language_requirements',
    'select'
  ),
  'authenticated has select on vacancy_language_requirements'
);

select ok(
  not has_table_privilege('authenticated', 'public.companies', 'insert'),
  'authenticated has no insert on companies'
);

select ok(
  not has_table_privilege('authenticated', 'public.vacancies', 'update'),
  'authenticated has no update on vacancies'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.vacancy_language_requirements',
    'delete'
  ),
  'authenticated has no delete on vacancy_language_requirements'
);

select ok(
  not has_table_privilege('anon', 'public.companies', 'select'),
  'anon has no select on companies'
);

select ok(
  not has_table_privilege('anon', 'public.vacancies', 'select'),
  'anon has no select on vacancies'
);

select ok(
  not has_table_privilege(
    'anon',
    'public.vacancy_language_requirements',
    'select'
  ),
  'anon has no select on vacancy_language_requirements'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.visible_seed_vacancy_ids()',
    'execute'
  ),
  'authenticated can execute visible_seed_vacancy_ids for policy evaluation'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.visible_seed_company_ids()',
    'execute'
  ),
  'authenticated can execute visible_seed_company_ids for policy evaluation'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.visible_seed_vacancy_ids()',
    'execute'
  ),
  'anon cannot execute visible_seed_vacancy_ids'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.visible_seed_company_ids()',
    'execute'
  ),
  'anon cannot execute visible_seed_company_ids'
);

select ok(
  not has_function_privilege(
    'public',
    'public.visible_seed_vacancy_ids()',
    'execute'
  ),
  'PUBLIC cannot execute visible_seed_vacancy_ids'
);

select ok(
  not has_function_privilege(
    'public',
    'public.visible_seed_company_ids()',
    'execute'
  ),
  'PUBLIC cannot execute visible_seed_company_ids'
);

select is(
  (
    select prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'visible_seed_vacancy_ids'
  ),
  true,
  'visible_seed_vacancy_ids is SECURITY DEFINER'
);

select ok(
  (
    select p.proconfig @> array['search_path=pg_catalog, public']
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'visible_seed_vacancy_ids'
  ),
  'visible_seed_vacancy_ids has fixed search_path'
);

select ok(
  (
    select p.proconfig @> array['search_path=pg_catalog, public']
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'visible_seed_company_ids'
  ),
  'visible_seed_company_ids has fixed search_path'
);

select * from finish();
rollback;
