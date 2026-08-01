-- Slice 1 PR 1.1 — candidate schema and owner-only RLS (D-019, D-020, D-023, D-024).
-- Intentionally no shared public.profiles table while only candidates exist.
-- Product allow-lists for comfort/languages/categories/etc. are deferred until PR 1.3.

create table public.candidate_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  german_comfort text,
  work_authorisation_declared boolean,
  -- Server-owned: set only via privileged/server path when declaration is accepted.
  work_authorisation_declared_at timestamptz,
  city text,
  travel_radius_minutes integer,
  available_from date,
  job_categories text[] not null default '{}'::text[],
  employment_types text[] not null default '{}'::text[],
  shift_preferences text[] not null default '{}'::text[],
  -- Server-owned completion marker (null = incomplete). Not client-writable.
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_profiles_display_name_nonempty_chk
    check (char_length(btrim(display_name)) > 0),
  constraint candidate_profiles_city_berlin_chk
    check (city is null or city = 'Berlin'),
  constraint candidate_profiles_travel_radius_positive_chk
    check (travel_radius_minutes is null or travel_radius_minutes > 0),
  constraint candidate_profiles_job_categories_no_null_chk
    check (array_position(job_categories, null) is null),
  constraint candidate_profiles_employment_types_no_null_chk
    check (array_position(employment_types, null) is null),
  constraint candidate_profiles_shift_preferences_no_null_chk
    check (array_position(shift_preferences, null) is null)
);

comment on table public.candidate_profiles is
  '1:1 candidate row keyed to auth.users; shared profiles deferred until a second role needs it.';

comment on column public.candidate_profiles.onboarding_completed_at is
  'Server-owned completion timestamp; null means incomplete.';

comment on column public.candidate_profiles.work_authorisation_declared_at is
  'Server-owned timestamp set when work_authorisation_declared becomes true.';

create table public.candidate_languages (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_profiles (id) on delete cascade,
  language_code text not null,
  proficiency text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_languages_candidate_code_key unique (candidate_id, language_code),
  constraint candidate_languages_language_code_nonempty_chk
    check (char_length(btrim(language_code)) > 0),
  constraint candidate_languages_proficiency_nonempty_chk
    check (char_length(btrim(proficiency)) > 0)
);

comment on table public.candidate_languages is
  '1:N spoken languages per candidate; allow-listed codes deferred to PR 1.3.';

create index candidate_languages_candidate_id_idx
  on public.candidate_languages (candidate_id);

-- Row Level Security
alter table public.candidate_profiles enable row level security;
alter table public.candidate_languages enable row level security;

create policy candidate_profiles_select_own
  on public.candidate_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy candidate_profiles_insert_own
  on public.candidate_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy candidate_profiles_update_own
  on public.candidate_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy candidate_languages_select_own
  on public.candidate_languages
  for select
  to authenticated
  using ((select auth.uid()) = candidate_id);

create policy candidate_languages_insert_own
  on public.candidate_languages
  for insert
  to authenticated
  with check ((select auth.uid()) = candidate_id);

create policy candidate_languages_update_own
  on public.candidate_languages
  for update
  to authenticated
  using ((select auth.uid()) = candidate_id)
  with check ((select auth.uid()) = candidate_id);

create policy candidate_languages_delete_own
  on public.candidate_languages
  for delete
  to authenticated
  using ((select auth.uid()) = candidate_id);

-- Privileges: revoke broadly, then grant least privilege.
-- anon: no table privileges (RLS alone would also deny; privileges are deliberate).
revoke all on table public.candidate_profiles from public, anon, authenticated;
revoke all on table public.candidate_languages from public, anon, authenticated;

grant select on table public.candidate_profiles to authenticated;

-- Server-owned timestamps excluded from authenticated insert/update (column privileges).
grant insert (
  id,
  display_name,
  german_comfort,
  work_authorisation_declared,
  city,
  travel_radius_minutes,
  available_from,
  job_categories,
  employment_types,
  shift_preferences,
  created_at,
  updated_at
) on table public.candidate_profiles to authenticated;

grant update (
  display_name,
  german_comfort,
  work_authorisation_declared,
  city,
  travel_radius_minutes,
  available_from,
  job_categories,
  employment_types,
  shift_preferences,
  updated_at
) on table public.candidate_profiles to authenticated;

-- Languages: owner CRUD under RLS. candidate_id is insert-only (immutable ownership).
grant select, insert, delete on table public.candidate_languages to authenticated;
grant update (language_code, proficiency, updated_at)
  on table public.candidate_languages to authenticated;

-- service_role: Supabase trusted backend role for future controlled server operations only.
-- Not for browser/SSR session paths; PR 1.2+ candidate flows use authenticated + RLS.
grant all on table public.candidate_profiles to service_role;
grant all on table public.candidate_languages to service_role;
