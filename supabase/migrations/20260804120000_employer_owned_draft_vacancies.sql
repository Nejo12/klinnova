-- PR 4.3 — Employer-owned private draft vacancies (D-050, D-051, D-048 type-lock extension).
-- Preserves seed vacancy semantics. No publication, UI, or verification approval.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.vacancies
  add column employer_profile_id uuid references public.employer_profiles (id),
  add column description text,
  add column public_locality text,
  add column workplace_type text,
  add column work_frequency text,
  add column salary_amount_cents integer,
  add column salary_currency text,
  add column salary_period text,
  add column salary_is_gross boolean,
  add column cv_required boolean,
  add column interview_english_ok boolean,
  add column experience_notes text;

alter table public.vacancies
  alter column company_id drop not null;

alter table public.vacancies
  alter column expires_at drop not null;

-- ---------------------------------------------------------------------------
-- Replace source / publication constraints (migration-safe)
-- ---------------------------------------------------------------------------

alter table public.vacancies
  drop constraint vacancies_source_seed_chk;

alter table public.vacancies
  drop constraint vacancies_publication_state_chk;

alter table public.vacancies
  drop constraint vacancies_summary_nonempty_chk;

alter table public.vacancies
  drop constraint vacancies_employment_types_nonempty_chk;

alter table public.vacancies
  drop constraint vacancies_shift_requirements_nonempty_chk;

alter table public.vacancies
  drop constraint vacancies_published_at_before_expires_chk;

alter table public.vacancies
  add constraint vacancies_source_chk
    check (source in ('seed', 'employer'));

alter table public.vacancies
  add constraint vacancies_publication_state_chk
    check (publication_state in ('draft', 'published', 'withdrawn'));

-- Ownership / source invariants (seed rows remain valid).
alter table public.vacancies
  add constraint vacancies_source_owner_chk
    check (
      (source = 'seed' and employer_profile_id is null and company_id is not null)
      or (source = 'employer' and employer_profile_id is not null)
    );

-- Draft lifecycle: unpublished timestamps stay null; published keeps expires_at.
alter table public.vacancies
  add constraint vacancies_draft_lifecycle_chk
    check (
      publication_state <> 'draft'
      or (published_at is null and expires_at is null)
    );

alter table public.vacancies
  add constraint vacancies_published_requires_expires_chk
    check (
      publication_state <> 'published'
      or expires_at is not null
    );

alter table public.vacancies
  add constraint vacancies_published_at_before_expires_chk
    check (
      published_at is null
      or expires_at is null
      or published_at <= expires_at
    );

-- Employer drafts are draft-only in Slice 4 (no employer publish path).
alter table public.vacancies
  add constraint vacancies_employer_draft_only_chk
    check (
      source <> 'employer'
      or publication_state = 'draft'
    );

-- Seed inventory never uses draft lifecycle.
alter table public.vacancies
  add constraint vacancies_seed_not_draft_chk
    check (
      source <> 'seed'
      or publication_state <> 'draft'
    );

-- Summary may be empty only while draft.
alter table public.vacancies
  add constraint vacancies_summary_nonempty_chk
    check (
      publication_state = 'draft'
      or char_length(btrim(summary)) > 0
    );

-- Employment / shift arrays may be empty only while draft.
alter table public.vacancies
  add constraint vacancies_employment_types_nonempty_chk
    check (
      publication_state = 'draft'
      or cardinality(employment_types) > 0
    );

alter table public.vacancies
  add constraint vacancies_shift_requirements_nonempty_chk
    check (
      publication_state = 'draft'
      or cardinality(shift_requirements) > 0
    );

-- Locality / description / notes nonempty when set.
alter table public.vacancies
  add constraint vacancies_public_locality_nonempty_chk
    check (
      public_locality is null
      or char_length(btrim(public_locality)) > 0
    );

alter table public.vacancies
  add constraint vacancies_description_nonempty_chk
    check (
      description is null
      or char_length(btrim(description)) > 0
    );

alter table public.vacancies
  add constraint vacancies_experience_notes_nonempty_chk
    check (
      experience_notes is null
      or char_length(btrim(experience_notes)) > 0
    );

alter table public.vacancies
  add constraint vacancies_workplace_type_chk
    check (
      workplace_type is null
      or workplace_type in (
        'private_home',
        'apartment',
        'shop',
        'office',
        'warehouse',
        'outdoor',
        'other'
      )
    );

alter table public.vacancies
  add constraint vacancies_work_frequency_chk
    check (
      work_frequency is null
      or work_frequency in ('one_off', 'recurring')
    );

-- Salary coherent nullable group (EUR gross integer cents).
alter table public.vacancies
  add constraint vacancies_salary_group_chk
    check (
      (
        salary_amount_cents is null
        and salary_currency is null
        and salary_period is null
        and salary_is_gross is null
      )
      or (
        salary_amount_cents is not null
        and salary_amount_cents > 0
        and salary_currency = 'EUR'
        and salary_period in ('hourly', 'monthly', 'fixed_job')
        and salary_is_gross is true
      )
    );

comment on column public.vacancies.employer_profile_id is
  'Authoritative owner for source=employer drafts (D-050). Null for seed.';

comment on column public.vacancies.source is
  'seed = Demo inventory; employer = employer-created draft (Slice 4).';

comment on column public.vacancies.publication_state is
  'draft | published | withdrawn. Employer-created rows are draft-only in Slice 4.';

comment on column public.vacancies.public_locality is
  'Privacy-safe Berlin locality/district. No exact address (D-051).';

comment on column public.vacancies.salary_amount_cents is
  'EUR minor units; coherent with salary_period/currency/gross when set.';

create index vacancies_employer_profile_id_idx
  on public.vacancies (employer_profile_id)
  where employer_profile_id is not null;

create index vacancies_employer_draft_lookup_idx
  on public.vacancies (employer_profile_id, updated_at desc)
  where source = 'employer' and publication_state = 'draft';

-- ---------------------------------------------------------------------------
-- Company ownership invariant for employer vacancies (trigger)
-- ---------------------------------------------------------------------------

create or replace function public._trg_vacancies_employer_ownership()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  employer_type text;
  owned_company_id uuid;
begin
  if new.source = 'employer' then
    if new.employer_profile_id is null then
      raise exception 'employer_vacancy_owner_required'
        using errcode = 'check_violation';
    end if;

    select ep.employer_type into employer_type
    from public.employer_profiles ep
    where ep.id = new.employer_profile_id;

    if employer_type is null then
      raise exception 'employer_vacancy_owner_missing'
        using errcode = 'foreign_key_violation';
    end if;

    if employer_type = 'private' then
      if new.company_id is not null then
        raise exception 'private_employer_vacancy_no_company'
          using errcode = 'check_violation';
      end if;
    elsif employer_type = 'organisation' then
      select c.id into owned_company_id
      from public.companies c
      where c.owner_employer_id = new.employer_profile_id
        and c.source = 'employer';

      if owned_company_id is null then
        raise exception 'organisation_employer_company_required'
          using errcode = 'check_violation';
      end if;

      if new.company_id is distinct from owned_company_id then
        raise exception 'organisation_employer_company_mismatch'
          using errcode = 'check_violation';
      end if;
    else
      raise exception 'employer_vacancy_type_invalid'
        using errcode = 'check_violation';
    end if;

    -- Never allow employer drafts to reference seed companies.
    if new.company_id is not null
       and exists (
         select 1
         from public.companies c
         where c.id = new.company_id
           and c.source <> 'employer'
       )
    then
      raise exception 'employer_vacancy_seed_company_forbidden'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public._trg_vacancies_employer_ownership()
  from public, anon, authenticated;

drop trigger if exists trg_vacancies_employer_ownership on public.vacancies;

create trigger trg_vacancies_employer_ownership
before insert or update of source, employer_profile_id, company_id
on public.vacancies
for each row
execute function public._trg_vacancies_employer_ownership();

-- ---------------------------------------------------------------------------
-- Type-lock extension: block type change when employer draft exists (D-048)
-- ---------------------------------------------------------------------------

create or replace function public._employer_has_draft_vacancy(p_employer_id uuid)
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select exists (
    select 1
    from public.vacancies v
    where v.employer_profile_id = p_employer_id
      and v.source = 'employer'
  );
$$;

revoke all on function public._employer_has_draft_vacancy(uuid)
  from public, anon, authenticated;

create or replace function public._trg_employer_profiles_guard()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  reason text;
begin
  -- D-048: changeable only while incomplete, no company, and no employer vacancy.
  if new.employer_type is distinct from old.employer_type then
    if old.onboarding_completed_at is not null then
      raise exception 'employer_type_locked_completed'
        using errcode = 'check_violation';
    end if;

    if public._employer_has_owned_company(old.id) then
      raise exception 'employer_type_locked_company'
        using errcode = 'check_violation';
    end if;

    if public._employer_has_draft_vacancy(old.id) then
      raise exception 'employer_type_locked_draft_vacancy'
        using errcode = 'check_violation';
    end if;
  end if;

  if new.lawful_hiring_declared is distinct from true then
    new.lawful_hiring_declared_at := null;
  elsif new.lawful_hiring_declared_at is null then
    new.lawful_hiring_declared_at := now();
  end if;

  new.verification_state := 'unverified';

  reason := public._employer_first_incomplete_reason(
    new.id,
    new.employer_type,
    new.display_name,
    new.berlin_locality,
    new.organisation_legal_name,
    new.lawful_hiring_declared
  );

  if reason is not null then
    new.onboarding_completed_at := null;
  end if;

  return new;
end;
$$;

comment on column public.employer_profiles.employer_type is
  'Changeable only while incomplete and no employer-owned company and no employer-created vacancy. Completion locks type (D-048).';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public._slugify_vacancy_title(p_title text)
returns text
language plpgsql
immutable
set search_path to pg_catalog, public
as $$
declare
  slug text;
begin
  slug := lower(btrim(coalesce(p_title, '')));
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  slug := regexp_replace(slug, '^-+|-+$', '', 'g');
  if slug is null or char_length(slug) = 0 then
    slug := 'draft';
  end if;
  return left(slug, 60);
end;
$$;

revoke all on function public._slugify_vacancy_title(text)
  from public, anon, authenticated;

create or replace function public._unique_employer_vacancy_slug(p_title text)
returns text
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  base text := public._slugify_vacancy_title(p_title);
  candidate text;
  suffix text;
begin
  candidate := base;
  if not exists (select 1 from public.vacancies v where v.slug = candidate) then
    return candidate;
  end if;

  for i in 1..20 loop
    suffix := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    candidate := left(base, 50) || '-' || suffix;
    if not exists (select 1 from public.vacancies v where v.slug = candidate) then
      return candidate;
    end if;
  end loop;

  raise exception 'vacancy_slug_conflict'
    using errcode = 'unique_violation';
end;
$$;

revoke all on function public._unique_employer_vacancy_slug(text)
  from public, anon, authenticated;

create or replace function public._employer_owned_draft_vacancy(
  p_uid uuid,
  p_vacancy_id uuid
)
returns public.vacancies
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  vacancy public.vacancies%rowtype;
begin
  select * into vacancy
  from public.vacancies v
  where v.id = p_vacancy_id
  for update;

  if not found
     or vacancy.source is distinct from 'employer'
     or vacancy.employer_profile_id is distinct from p_uid
     or vacancy.publication_state is distinct from 'draft'
  then
    return null;
  end if;

  return vacancy;
end;
$$;

revoke all on function public._employer_owned_draft_vacancy(uuid, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Readiness
-- ---------------------------------------------------------------------------

create or replace function public.employer_vacancy_draft_readiness(p_vacancy_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  vacancy public.vacancies%rowtype;
  profile public.employer_profiles%rowtype;
  missing text[] := array[]::text[];
  lang_count integer := 0;
begin
  if uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  select * into vacancy
  from public.vacancies v
  where v.id = p_vacancy_id;

  if not found
     or vacancy.source is distinct from 'employer'
     or vacancy.employer_profile_id is distinct from uid
  then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select * into profile
  from public.employer_profiles ep
  where ep.id = uid;

  if not found or profile.onboarding_completed_at is null then
    missing := array_append(missing, 'employer_completion');
  end if;

  if vacancy.publication_state is distinct from 'draft' then
    missing := array_append(missing, 'publication_state');
  end if;

  if vacancy.title is null or char_length(btrim(vacancy.title)) = 0 then
    missing := array_append(missing, 'title');
  end if;

  if vacancy.job_category is null then
    missing := array_append(missing, 'job_category');
  end if;

  if vacancy.public_locality is null
     or char_length(btrim(vacancy.public_locality)) = 0
  then
    missing := array_append(missing, 'public_locality');
  end if;

  if vacancy.description is null
     or char_length(btrim(vacancy.description)) = 0
  then
    missing := array_append(missing, 'description');
  end if;

  if vacancy.salary_amount_cents is null
     or vacancy.salary_period is null
     or vacancy.salary_is_gross is distinct from true
     or vacancy.salary_currency is distinct from 'EUR'
  then
    missing := array_append(missing, 'salary');
  end if;

  select count(*)::integer into lang_count
  from public.vacancy_language_requirements vlr
  where vlr.vacancy_id = vacancy.id;

  if lang_count < 1 then
    missing := array_append(missing, 'languages');
  end if;

  if profile.employer_type = 'organisation' and vacancy.company_id is null then
    missing := array_append(missing, 'company');
  end if;

  if profile.employer_type = 'private' and vacancy.company_id is not null then
    missing := array_append(missing, 'company');
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'ready', coalesce(cardinality(missing), 0) = 0,
    'missing', to_jsonb(missing)
  );
end;
$$;

comment on function public.employer_vacancy_draft_readiness(uuid) is
  'PR 4.3 publication-readiness evaluation for owned employer drafts. Does not publish.';

revoke all on function public.employer_vacancy_draft_readiness(uuid) from public, anon;
grant execute on function public.employer_vacancy_draft_readiness(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Create draft RPC
-- ---------------------------------------------------------------------------

create or replace function public.create_employer_vacancy_draft(
  p_title text,
  p_job_category text,
  p_public_locality text,
  p_summary text default null,
  p_description text default null,
  p_employment_types text[] default '{}'::text[],
  p_shift_requirements text[] default '{}'::text[],
  p_german_requirement text default 'none',
  p_workplace_type text default null,
  p_work_frequency text default null,
  p_salary_amount_cents integer default null,
  p_salary_period text default null,
  p_cv_required boolean default null,
  p_interview_english_ok boolean default null,
  p_experience_notes text default null,
  p_available_from date default null
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  profile public.employer_profiles%rowtype;
  company_id uuid := null;
  title text := nullif(btrim(p_title), '');
  locality text := nullif(btrim(p_public_locality), '');
  summary text := coalesce(nullif(btrim(p_summary), ''), title, 'Draft');
  description text := nullif(btrim(p_description), '');
  experience_notes text := nullif(btrim(p_experience_notes), '');
  employment_types text[] := coalesce(p_employment_types, '{}'::text[]);
  shift_requirements text[] := coalesce(p_shift_requirements, '{}'::text[]);
  german_requirement text := coalesce(nullif(btrim(p_german_requirement), ''), 'none');
  workplace_type text := nullif(btrim(p_workplace_type), '');
  work_frequency text := nullif(btrim(p_work_frequency), '');
  vacancy_id uuid;
  slug text;
begin
  if uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  if title is null or locality is null or nullif(btrim(p_job_category), '') is null then
    return jsonb_build_object('status', 'validation_error');
  end if;

  select * into profile
  from public.employer_profiles ep
  where ep.id = uid
  for update;

  if not found then
    return jsonb_build_object('status', 'missing_profile');
  end if;

  if profile.onboarding_completed_at is null then
    return jsonb_build_object('status', 'incomplete_employer');
  end if;

  if profile.employer_type = 'organisation' then
    select c.id into company_id
    from public.companies c
    where c.owner_employer_id = uid
      and c.source = 'employer';

    if company_id is null then
      return jsonb_build_object('status', 'missing_company');
    end if;
  end if;

  slug := public._unique_employer_vacancy_slug(title);

  begin
    insert into public.vacancies (
      company_id,
      employer_profile_id,
      title,
      slug,
      summary,
      description,
      city,
      public_locality,
      job_category,
      employment_types,
      shift_requirements,
      german_requirement,
      workplace_type,
      work_frequency,
      salary_amount_cents,
      salary_currency,
      salary_period,
      salary_is_gross,
      cv_required,
      interview_english_ok,
      experience_notes,
      available_from,
      publication_state,
      source,
      published_at,
      expires_at
    )
    values (
      company_id,
      uid,
      title,
      slug,
      summary,
      description,
      'Berlin',
      locality,
      btrim(p_job_category),
      employment_types,
      shift_requirements,
      german_requirement,
      workplace_type,
      work_frequency,
      case
        when p_salary_amount_cents is null then null
        else p_salary_amount_cents
      end,
      case
        when p_salary_amount_cents is null then null
        else 'EUR'
      end,
      case
        when p_salary_amount_cents is null then null
        else p_salary_period
      end,
      case
        when p_salary_amount_cents is null then null
        else true
      end,
      p_cv_required,
      p_interview_english_ok,
      experience_notes,
      p_available_from,
      'draft',
      'employer',
      null,
      null
    )
    returning id into vacancy_id;
  exception
    when check_violation then
      return jsonb_build_object('status', 'conflict_check');
    when unique_violation then
      return jsonb_build_object('status', 'conflict_unique');
  end;

  return jsonb_build_object(
    'status', 'ok',
    'vacancy_id', vacancy_id
  );
end;
$$;

comment on function public.create_employer_vacancy_draft(
  text, text, text, text, text, text[], text[], text, text, text,
  integer, text, boolean, boolean, text, date
) is
  'PR 4.3 create owned employer draft. Ownership/source/publication derived from auth.uid().';

revoke all on function public.create_employer_vacancy_draft(
  text, text, text, text, text, text[], text[], text, text, text,
  integer, text, boolean, boolean, text, date
) from public, anon;
grant execute on function public.create_employer_vacancy_draft(
  text, text, text, text, text, text[], text[], text, text, text,
  integer, text, boolean, boolean, text, date
) to authenticated;

-- ---------------------------------------------------------------------------
-- Update draft RPC
-- ---------------------------------------------------------------------------

create or replace function public.update_employer_vacancy_draft(
  p_vacancy_id uuid,
  p_title text default null,
  p_job_category text default null,
  p_public_locality text default null,
  p_summary text default null,
  p_description text default null,
  p_employment_types text[] default null,
  p_shift_requirements text[] default null,
  p_german_requirement text default null,
  p_workplace_type text default null,
  p_work_frequency text default null,
  p_salary_amount_cents integer default null,
  p_salary_period text default null,
  p_clear_salary boolean default false,
  p_cv_required boolean default null,
  p_interview_english_ok boolean default null,
  p_experience_notes text default null,
  p_available_from date default null,
  p_clear_available_from boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  vacancy public.vacancies%rowtype;
begin
  if uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  if p_vacancy_id is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  vacancy := public._employer_owned_draft_vacancy(uid, p_vacancy_id);
  if vacancy is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  begin
    update public.vacancies v
    set
      title = coalesce(nullif(btrim(p_title), ''), v.title),
      job_category = coalesce(nullif(btrim(p_job_category), ''), v.job_category),
      public_locality = coalesce(nullif(btrim(p_public_locality), ''), v.public_locality),
      summary = case
        when p_summary is null then v.summary
        else coalesce(nullif(btrim(p_summary), ''), v.summary)
      end,
      description = case
        when p_description is null then v.description
        else nullif(btrim(p_description), '')
      end,
      employment_types = coalesce(p_employment_types, v.employment_types),
      shift_requirements = coalesce(p_shift_requirements, v.shift_requirements),
      german_requirement = coalesce(
        nullif(btrim(p_german_requirement), ''),
        v.german_requirement
      ),
      workplace_type = case
        when p_workplace_type is null then v.workplace_type
        else nullif(btrim(p_workplace_type), '')
      end,
      work_frequency = case
        when p_work_frequency is null then v.work_frequency
        else nullif(btrim(p_work_frequency), '')
      end,
      salary_amount_cents = case
        when p_clear_salary then null
        when p_salary_amount_cents is null then v.salary_amount_cents
        else p_salary_amount_cents
      end,
      salary_currency = case
        when p_clear_salary then null
        when p_salary_amount_cents is null and not p_clear_salary then v.salary_currency
        else 'EUR'
      end,
      salary_period = case
        when p_clear_salary then null
        when p_salary_period is null and p_salary_amount_cents is null then v.salary_period
        else p_salary_period
      end,
      salary_is_gross = case
        when p_clear_salary then null
        when p_salary_amount_cents is null and not p_clear_salary then v.salary_is_gross
        else true
      end,
      cv_required = coalesce(p_cv_required, v.cv_required),
      interview_english_ok = coalesce(p_interview_english_ok, v.interview_english_ok),
      experience_notes = case
        when p_experience_notes is null then v.experience_notes
        else nullif(btrim(p_experience_notes), '')
      end,
      available_from = case
        when p_clear_available_from then null
        when p_available_from is null then v.available_from
        else p_available_from
      end,
      published_at = null,
      expires_at = null,
      publication_state = 'draft',
      source = 'employer',
      employer_profile_id = uid,
      company_id = v.company_id,
      updated_at = now()
    where v.id = vacancy.id;
  exception
    when check_violation then
      return jsonb_build_object('status', 'conflict_check');
  end;

  return jsonb_build_object('status', 'ok', 'vacancy_id', vacancy.id);
end;
$$;

revoke all on function public.update_employer_vacancy_draft(
  uuid, text, text, text, text, text, text[], text[], text, text, text,
  integer, text, boolean, boolean, boolean, text, date, boolean
) from public, anon;
grant execute on function public.update_employer_vacancy_draft(
  uuid, text, text, text, text, text, text[], text[], text, text, text,
  integer, text, boolean, boolean, boolean, text, date, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- Language replacement RPC
-- ---------------------------------------------------------------------------

create or replace function public.replace_employer_vacancy_languages(
  p_vacancy_id uuid,
  p_languages jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  vacancy public.vacancies%rowtype;
  item jsonb;
  language_code text;
  min_proficiency text;
  seen text[] := array[]::text[];
begin
  if uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  if p_vacancy_id is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  vacancy := public._employer_owned_draft_vacancy(uid, p_vacancy_id);
  if vacancy is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if p_languages is null or jsonb_typeof(p_languages) is distinct from 'array' then
    return jsonb_build_object('status', 'validation_error');
  end if;

  begin
    delete from public.vacancy_language_requirements vlr
    where vlr.vacancy_id = vacancy.id;

    for item in
      select value
      from jsonb_array_elements(p_languages)
    loop
      language_code := nullif(btrim(item ->> 'language_code'), '');
      min_proficiency := nullif(btrim(item ->> 'min_proficiency'), '');

      if language_code is null or min_proficiency is null then
        raise exception 'language_validation'
          using errcode = 'check_violation';
      end if;

      if language_code = any (seen) then
        raise exception 'language_duplicate'
          using errcode = 'unique_violation';
      end if;

      seen := array_append(seen, language_code);

      insert into public.vacancy_language_requirements (
        vacancy_id,
        language_code,
        min_proficiency
      )
      values (
        vacancy.id,
        language_code,
        min_proficiency
      );
    end loop;
  exception
    when check_violation then
      return jsonb_build_object('status', 'conflict_check');
    when unique_violation then
      return jsonb_build_object('status', 'conflict_unique');
  end;

  return jsonb_build_object(
    'status', 'ok',
    'vacancy_id', vacancy.id,
    'language_count', coalesce(cardinality(seen), 0)
  );
end;
$$;

revoke all on function public.replace_employer_vacancy_languages(uuid, jsonb)
  from public, anon;
grant execute on function public.replace_employer_vacancy_languages(uuid, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Delete draft RPC
-- ---------------------------------------------------------------------------

create or replace function public.delete_employer_vacancy_draft(p_vacancy_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  vacancy public.vacancies%rowtype;
  deleted_id uuid;
begin
  if uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  if p_vacancy_id is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  vacancy := public._employer_owned_draft_vacancy(uid, p_vacancy_id);
  if vacancy is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  -- Never published history in current schema: draft + null published_at.
  if vacancy.published_at is not null
     or vacancy.publication_state is distinct from 'draft'
  then
    return jsonb_build_object('status', 'not_deletable');
  end if;

  if exists (
    select 1
    from public.applications a
    where a.vacancy_id = vacancy.id
  ) then
    return jsonb_build_object('status', 'not_deletable');
  end if;

  -- Language rows cascade via vacancy_language_requirements FK.
  with deleted as (
    delete from public.vacancies v
    where v.id = vacancy.id
      and v.employer_profile_id = uid
      and v.source = 'employer'
      and v.publication_state = 'draft'
    returning v.id
  )
  select id into deleted_id
  from deleted;

  if deleted_id is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  return jsonb_build_object('status', 'ok', 'vacancy_id', deleted_id);
end;
$$;

comment on function public.delete_employer_vacancy_draft(uuid) is
  'PR 4.3 scoped draft delete (D-050). Future publication-history tables must extend not_deletable guards.';

revoke all on function public.delete_employer_vacancy_draft(uuid) from public, anon;
grant execute on function public.delete_employer_vacancy_draft(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS — employer draft SELECT only (mutations via RPCs)
-- ---------------------------------------------------------------------------

create policy vacancies_select_own_employer_draft
  on public.vacancies
  for select
  to authenticated
  using (
    source = 'employer'
    and publication_state = 'draft'
    and employer_profile_id = (select auth.uid())
  );

create policy vacancy_language_requirements_select_own_employer_draft
  on public.vacancy_language_requirements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vacancies v
      where v.id = vacancy_id
        and v.source = 'employer'
        and v.publication_state = 'draft'
        and v.employer_profile_id = (select auth.uid())
    )
  );

-- Candidate/seed policies and visible_seed_* helpers remain unchanged and
-- seed-only, so employer drafts stay excluded from matcher/detail/submit paths.
