-- Slice 2 PR 2.1 — vacancy schema, constraints, and completed-candidate RLS
-- (D-026, D-029, D-031, D-033; docs/20-slice-2-schema-and-matching-proposal.md).
-- Schema only: no Production/Preview demo inventory inserts in this migration.
-- Local/CI fixtures load via supabase/seeds (D-031).

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_name_nonempty_chk
    check (char_length(btrim(name)) > 0),
  constraint companies_slug_nonempty_chk
    check (char_length(btrim(slug)) > 0),
  constraint companies_slug_trimmed_chk
    check (slug = btrim(slug)),
  constraint companies_slug_key unique (slug),
  -- Slice 2 ownership vocabulary (D-026). Extensible later via migration.
  constraint companies_source_seed_chk
    check (source = 'seed')
);

comment on table public.companies is
  'Fictional/demo seed companies for Slice 2; no employer Auth or verification.';

comment on column public.companies.source is
  'Slice 2 constrained to seed; later employer ownership uses additional sources.';

-- ---------------------------------------------------------------------------
-- vacancies
-- ---------------------------------------------------------------------------

create table public.vacancies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null
    references public.companies (id)
    on delete restrict,
  title text not null,
  slug text not null,
  summary text not null,
  city text not null,
  job_category text not null,
  employment_types text[] not null,
  shift_requirements text[] not null,
  german_requirement text not null,
  available_from date,
  publication_state text not null,
  source text not null,
  published_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vacancies_title_nonempty_chk
    check (char_length(btrim(title)) > 0),
  constraint vacancies_slug_nonempty_chk
    check (char_length(btrim(slug)) > 0),
  constraint vacancies_slug_trimmed_chk
    check (slug = btrim(slug)),
  constraint vacancies_slug_key unique (slug),
  constraint vacancies_summary_nonempty_chk
    check (char_length(btrim(summary)) > 0),
  constraint vacancies_city_berlin_chk
    check (city = 'Berlin'),
  constraint vacancies_job_category_chk
    check (
      job_category in (
        'cleaning',
        'hospitality',
        'logistics',
        'warehousing',
        'food_production',
        'moving',
        'retail'
      )
    ),
  constraint vacancies_employment_types_nonempty_chk
    check (cardinality(employment_types) > 0),
  constraint vacancies_employment_types_no_null_chk
    check (array_position(employment_types, null) is null),
  constraint vacancies_employment_types_unique_chk
    check (public.text_array_is_unique(employment_types)),
  constraint vacancies_employment_types_allow_list_chk
    check (
      employment_types <@ array[
        'full_time',
        'part_time',
        'mini_job',
        'temporary'
      ]::text[]
    ),
  constraint vacancies_shift_requirements_nonempty_chk
    check (cardinality(shift_requirements) > 0),
  constraint vacancies_shift_requirements_no_null_chk
    check (array_position(shift_requirements, null) is null),
  constraint vacancies_shift_requirements_unique_chk
    check (public.text_array_is_unique(shift_requirements)),
  -- Concrete shifts only; candidate flexible is a matcher rule, not a vacancy value (D-029/docs/20).
  constraint vacancies_shift_requirements_allow_list_chk
    check (
      shift_requirements <@ array[
        'morning',
        'daytime',
        'evening',
        'night',
        'weekend'
      ]::text[]
    ),
  constraint vacancies_german_requirement_chk
    check (
      german_requirement in ('none', 'basic', 'conversational', 'comfortable')
    ),
  constraint vacancies_publication_state_chk
    check (publication_state in ('published', 'withdrawn')),
  constraint vacancies_source_seed_chk
    check (source = 'seed'),
  constraint vacancies_published_requires_published_at_chk
    check (
      publication_state <> 'published'
      or published_at is not null
    ),
  constraint vacancies_published_at_before_expires_chk
    check (
      published_at is null
      or published_at <= expires_at
    )
);

comment on table public.vacancies is
  'Seed/demo Berlin vacancies for Slice 2 matching; no salary or experience fields.';

comment on column public.vacancies.job_category is
  'Single primary category (D-025 allow-list).';

comment on column public.vacancies.shift_requirements is
  'Concrete shifts only; flexible is never stored on vacancies.';

comment on column public.vacancies.publication_state is
  'published or withdrawn; visibility also requires published_at/expires_at window.';

comment on column public.vacancies.source is
  'Slice 2 constrained to seed.';

create index vacancies_company_id_idx
  on public.vacancies (company_id);

create index vacancies_active_lookup_idx
  on public.vacancies (publication_state, published_at, expires_at)
  where source = 'seed' and publication_state = 'published';

-- ---------------------------------------------------------------------------
-- vacancy_language_requirements
-- ---------------------------------------------------------------------------

create table public.vacancy_language_requirements (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  language_code text not null,
  min_proficiency text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vacancy_language_requirements_vacancy_code_key
    unique (vacancy_id, language_code),
  constraint vacancy_language_requirements_language_code_chk
    check (
      language_code in (
        'de',
        'en',
        'ar',
        'tr',
        'uk',
        'ru',
        'pl',
        'fr',
        'es',
        'it',
        'pt',
        'ro',
        'bg',
        'sr',
        'hr',
        'bs',
        'sq',
        'el',
        'fa',
        'ku',
        'ur',
        'hi',
        'bn',
        'vi',
        'zh',
        'other'
      )
    ),
  constraint vacancy_language_requirements_min_proficiency_chk
    check (
      min_proficiency in ('basic', 'conversational', 'proficient', 'native')
    )
);

comment on table public.vacancy_language_requirements is
  'Normalized additional-language requirements; zero rows allowed; all rows mandatory when present.';

create index vacancy_language_requirements_vacancy_id_idx
  on public.vacancy_language_requirements (vacancy_id);

-- ---------------------------------------------------------------------------
-- RLS helpers (SECURITY DEFINER) — avoid companies ↔ vacancies policy recursion.
-- Set-returning visibility only (D-033). No UUID probe predicates.
-- Completion gate is inside the helpers so incomplete callers learn nothing.
-- ---------------------------------------------------------------------------

create or replace function public.visible_seed_vacancy_ids()
returns setof uuid
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select v.id
  from public.vacancies v
  inner join public.companies c on c.id = v.company_id
  where exists (
    select 1
    from public.candidate_profiles cp
    where cp.id = (select auth.uid())
      and cp.onboarding_completed_at is not null
  )
    and v.source = 'seed'
    and c.source = 'seed'
    and v.publication_state = 'published'
    and v.published_at is not null
    and v.published_at <= now()
    and v.expires_at > now();
$$;

create or replace function public.visible_seed_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select distinct v.company_id
  from public.vacancies v
  inner join public.companies c on c.id = v.company_id
  where exists (
    select 1
    from public.candidate_profiles cp
    where cp.id = (select auth.uid())
      and cp.onboarding_completed_at is not null
  )
    and v.source = 'seed'
    and c.source = 'seed'
    and v.publication_state = 'published'
    and v.published_at is not null
    and v.published_at <= now()
    and v.expires_at > now();
$$;

revoke all on function public.visible_seed_vacancy_ids() from public;
revoke all on function public.visible_seed_company_ids() from public;

-- Policy evaluation runs as the querying role, so authenticated needs EXECUTE.
-- Direct calls return only IDs already selectable under D-033 (empty if incomplete).
grant execute on function public.visible_seed_vacancy_ids()
  to authenticated, service_role;
grant execute on function public.visible_seed_company_ids()
  to authenticated, service_role;

comment on function public.visible_seed_vacancy_ids() is
  'RLS helper: vacancy IDs visible to the current completed candidate; empty otherwise.';

comment on function public.visible_seed_company_ids() is
  'RLS helper: seed company IDs with at least one currently visible vacancy; empty otherwise.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.companies enable row level security;
alter table public.vacancies enable row level security;
alter table public.vacancy_language_requirements enable row level security;

-- Contract B: only seed companies with currently visible active seed vacancies.
create policy companies_select_completed_seed
  on public.companies
  for select
  to authenticated
  using (
    id in (select public.visible_seed_company_ids())
  );

create policy vacancies_select_completed_seed_active
  on public.vacancies
  for select
  to authenticated
  using (
    id in (select public.visible_seed_vacancy_ids())
  );

create policy vacancy_language_requirements_select_completed_visible
  on public.vacancy_language_requirements
  for select
  to authenticated
  using (
    vacancy_id in (select public.visible_seed_vacancy_ids())
  );

-- ---------------------------------------------------------------------------
-- Privileges: revoke broadly, then SELECT-only for authenticated (D-033).
-- ---------------------------------------------------------------------------

revoke all on table public.companies from public, anon, authenticated;
revoke all on table public.vacancies from public, anon, authenticated;
revoke all on table public.vacancy_language_requirements from public, anon, authenticated;

grant select on table public.companies to authenticated;
grant select on table public.vacancies to authenticated;
grant select on table public.vacancy_language_requirements to authenticated;

grant all on table public.companies to service_role;
grant all on table public.vacancies to service_role;
grant all on table public.vacancy_language_requirements to service_role;
