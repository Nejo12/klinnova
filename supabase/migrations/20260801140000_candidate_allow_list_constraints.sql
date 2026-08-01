-- Slice 1 PR 1.3 — D-025 allow-list check constraints.
-- Progressive null/empty states remain valid; non-empty values must be allow-listed.

-- Helper: CHECK cannot contain subqueries, so uniqueness is wrapped in an
-- immutable SQL function. Constraint-only: no table access, no dynamic SQL,
-- no SECURITY DEFINER. EXECUTE is granted so authenticated CHECK evaluation
-- can run the function; it is not an application RPC.
create or replace function public.text_array_is_unique(input text[])
returns boolean
language sql
immutable
strict
parallel safe
set search_path to pg_catalog
as $$
  select
    coalesce(cardinality(input), 0)
    = coalesce(
      cardinality(array(select distinct unnest(input))),
      0
    );
$$;

revoke all on function public.text_array_is_unique(text[]) from public;
grant execute on function public.text_array_is_unique(text[]) to authenticated, service_role;

-- Drop the broad positive-only travel check in favour of the approved minute set.
alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_travel_radius_positive_chk;

alter table public.candidate_profiles
  add constraint candidate_profiles_german_comfort_chk
    check (
      german_comfort is null
      or german_comfort in ('none', 'basic', 'conversational', 'comfortable')
    );

alter table public.candidate_profiles
  add constraint candidate_profiles_travel_radius_minutes_chk
    check (
      travel_radius_minutes is null
      or travel_radius_minutes in (15, 30, 45, 60)
    );

alter table public.candidate_profiles
  add constraint candidate_profiles_job_categories_allow_list_chk
    check (
      job_categories <@ array[
        'cleaning',
        'hospitality',
        'logistics',
        'warehousing',
        'food_production',
        'moving',
        'retail'
      ]::text[]
    );

alter table public.candidate_profiles
  add constraint candidate_profiles_job_categories_unique_chk
    check (public.text_array_is_unique(job_categories));

alter table public.candidate_profiles
  add constraint candidate_profiles_employment_types_allow_list_chk
    check (
      employment_types <@ array[
        'full_time',
        'part_time',
        'mini_job',
        'temporary'
      ]::text[]
    );

alter table public.candidate_profiles
  add constraint candidate_profiles_employment_types_unique_chk
    check (public.text_array_is_unique(employment_types));

alter table public.candidate_profiles
  add constraint candidate_profiles_shift_preferences_allow_list_chk
    check (
      shift_preferences <@ array[
        'morning',
        'daytime',
        'evening',
        'night',
        'weekend',
        'flexible'
      ]::text[]
    );

alter table public.candidate_profiles
  add constraint candidate_profiles_shift_preferences_unique_chk
    check (public.text_array_is_unique(shift_preferences));

alter table public.candidate_languages
  add constraint candidate_languages_language_code_chk
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
    );

alter table public.candidate_languages
  add constraint candidate_languages_proficiency_chk
    check (
      proficiency in ('basic', 'conversational', 'proficient', 'native')
    );

comment on function public.text_array_is_unique(text[]) is
  'D-025 constraint helper: true when a text array has no duplicates. IMMUTABLE STRICT, search_path=pg_catalog, not SECURITY DEFINER, no table access.';

comment on constraint candidate_profiles_german_comfort_chk on public.candidate_profiles is
  'D-025 German comfort allow-list; null allowed during partial onboarding.';

comment on constraint candidate_profiles_travel_radius_minutes_chk on public.candidate_profiles is
  'D-025 maximum one-way travel time in minutes.';
