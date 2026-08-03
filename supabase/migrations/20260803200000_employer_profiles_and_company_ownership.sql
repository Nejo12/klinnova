-- PR 4.1 — Employer identity/profile schema, completion, company ownership (D-046–D-054).
-- No vacancy draft schema, no employer UI, no publication, no verification approval.

-- ---------------------------------------------------------------------------
-- employer_profiles
-- ---------------------------------------------------------------------------

create table public.employer_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  employer_type text not null,
  display_name text,
  berlin_locality text,
  phone text,
  website text,
  organisation_legal_name text,
  -- Client-writable declaration flag; timestamp is server-owned (candidate pattern).
  lawful_hiring_declared boolean,
  lawful_hiring_declared_at timestamptz,
  verification_state text not null default 'unverified',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employer_profiles_type_chk
    check (employer_type in ('private', 'organisation')),
  constraint employer_profiles_verification_unverified_chk
    check (verification_state = 'unverified'),
  constraint employer_profiles_display_name_nonempty_chk
    check (display_name is null or char_length(btrim(display_name)) > 0),
  constraint employer_profiles_berlin_locality_nonempty_chk
    check (berlin_locality is null or char_length(btrim(berlin_locality)) > 0),
  constraint employer_profiles_phone_nonempty_chk
    check (phone is null or char_length(btrim(phone)) > 0),
  constraint employer_profiles_website_nonempty_chk
    check (website is null or char_length(btrim(website)) > 0),
  constraint employer_profiles_organisation_legal_name_nonempty_chk
    check (
      organisation_legal_name is null
      or char_length(btrim(organisation_legal_name)) > 0
    ),
  constraint employer_profiles_private_no_legal_name_chk
    check (
      employer_type <> 'private'
      or organisation_legal_name is null
    )
);

comment on table public.employer_profiles is
  'PR 4.1 additive employer capability (D-047). 1:1 auth.users. Dual-capability with candidate_profiles is allowed.';

comment on column public.employer_profiles.verification_state is
  'Slice 4 placeholder only: unverified. Approval states deferred to Slice 5.';

comment on column public.employer_profiles.onboarding_completed_at is
  'Server-owned current employer completion gate (D-049). Null = incomplete.';

comment on column public.employer_profiles.lawful_hiring_declared_at is
  'Server-owned. Set when declaration is accepted; cleared when declaration is false.';

comment on column public.employer_profiles.employer_type is
  'Changeable only while incomplete and no employer-owned company (and later no employer draft vacancy — PR 4.3). Completion locks type (D-048).';

-- ---------------------------------------------------------------------------
-- companies ownership extension (preserve seed rows)
-- ---------------------------------------------------------------------------

alter table public.companies
  add column owner_employer_id uuid references public.employer_profiles (id);

alter table public.companies
  drop constraint companies_source_seed_chk;

alter table public.companies
  add constraint companies_source_chk
    check (source in ('seed', 'employer'));

alter table public.companies
  add constraint companies_source_owner_chk
    check (
      (source = 'seed' and owner_employer_id is null)
      or (source = 'employer' and owner_employer_id is not null)
    );

create unique index companies_owner_employer_id_key
  on public.companies (owner_employer_id)
  where owner_employer_id is not null;

comment on column public.companies.owner_employer_id is
  'Auth employer owner for source=employer rows. Null for Demo seed companies (D-048).';

comment on column public.companies.source is
  'seed = Demo/fixture inventory; employer = organisation employer-owned company.';

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public._employer_has_owned_company(p_employer_id uuid)
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select exists (
    select 1
    from public.companies c
    where c.owner_employer_id = p_employer_id
      and c.source = 'employer'
  );
$$;

revoke all on function public._employer_has_owned_company(uuid) from public, anon, authenticated;

create or replace function public._employer_first_incomplete_reason(
  p_id uuid,
  p_employer_type text,
  p_display_name text,
  p_berlin_locality text,
  p_organisation_legal_name text,
  p_lawful_hiring_declared boolean
)
returns text
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
begin
  if p_employer_type is distinct from 'private'
     and p_employer_type is distinct from 'organisation'
  then
    return 'employer_type';
  end if;

  if p_display_name is null or char_length(btrim(p_display_name)) = 0 then
    return 'display_name';
  end if;

  if p_berlin_locality is null or char_length(btrim(p_berlin_locality)) = 0 then
    return 'berlin_locality';
  end if;

  if p_lawful_hiring_declared is distinct from true then
    return 'lawful_hiring';
  end if;

  if p_employer_type = 'private' then
    if p_organisation_legal_name is not null then
      return 'organisation_legal_name';
    end if;
    return null;
  end if;

  -- organisation
  if p_organisation_legal_name is null
     or char_length(btrim(p_organisation_legal_name)) = 0
  then
    return 'organisation_legal_name';
  end if;

  if not public._employer_has_owned_company(p_id) then
    return 'company';
  end if;

  return null;
end;
$$;

revoke all on function public._employer_first_incomplete_reason(
  uuid, text, text, text, text, boolean
) from public, anon, authenticated;

create or replace function public._clear_employer_completion_if_incomplete(p_uid uuid)
returns void
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  profile public.employer_profiles%rowtype;
  reason text;
begin
  select * into profile
  from public.employer_profiles
  where id = p_uid
  for update;

  if not found then
    return;
  end if;

  reason := public._employer_first_incomplete_reason(
    profile.id,
    profile.employer_type,
    profile.display_name,
    profile.berlin_locality,
    profile.organisation_legal_name,
    profile.lawful_hiring_declared
  );

  if reason is not null and profile.onboarding_completed_at is not null then
    update public.employer_profiles
    set
      onboarding_completed_at = null,
      updated_at = now()
    where id = p_uid;
  end if;
end;
$$;

revoke all on function public._clear_employer_completion_if_incomplete(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Type locking + essentials / declaration sync (BEFORE UPDATE)
-- ---------------------------------------------------------------------------

create or replace function public._trg_employer_profiles_guard()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  reason text;
begin
  -- D-048 type lock: changeable only while incomplete and no employer company.
  -- PR 4.3 must also block changes when an employer-created draft vacancy exists.
  if new.employer_type is distinct from old.employer_type then
    if old.onboarding_completed_at is not null then
      raise exception 'employer_type_locked_completed'
        using errcode = 'check_violation';
    end if;

    if public._employer_has_owned_company(old.id) then
      raise exception 'employer_type_locked_company'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Sync lawful declaration timestamp (candidate work_authorisation pattern).
  if new.lawful_hiring_declared is distinct from true then
    new.lawful_hiring_declared_at := null;
  elsif new.lawful_hiring_declared_at is null then
    new.lawful_hiring_declared_at := now();
  end if;

  -- Never allow client/path to set verification beyond unverified in Slice 4.
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

revoke all on function public._trg_employer_profiles_guard() from public, anon, authenticated;

drop trigger if exists trg_employer_profiles_guard on public.employer_profiles;

create trigger trg_employer_profiles_guard
before update of
  employer_type,
  display_name,
  berlin_locality,
  organisation_legal_name,
  lawful_hiring_declared,
  verification_state,
  onboarding_completed_at
on public.employer_profiles
for each row
execute function public._trg_employer_profiles_guard();

-- ---------------------------------------------------------------------------
-- Company ownership guards
-- ---------------------------------------------------------------------------

create or replace function public._trg_companies_employer_ownership()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  employer_type text;
begin
  if new.source = 'employer' then
    if new.owner_employer_id is null then
      raise exception 'employer_company_requires_owner'
        using errcode = 'check_violation';
    end if;

    select ep.employer_type into employer_type
    from public.employer_profiles ep
    where ep.id = new.owner_employer_id;

    if employer_type is null then
      raise exception 'employer_company_owner_missing'
        using errcode = 'foreign_key_violation';
    end if;

    if employer_type is distinct from 'organisation' then
      raise exception 'private_employer_cannot_own_company'
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and old.owner_employer_id is not null
     and new.owner_employer_id is distinct from old.owner_employer_id
  then
    -- Ownership transfer not supported in Slice 4.
    raise exception 'employer_company_owner_immutable'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public._trg_companies_employer_ownership()
  from public, anon, authenticated;

drop trigger if exists trg_companies_employer_ownership on public.companies;

create trigger trg_companies_employer_ownership
before insert or update of source, owner_employer_id
on public.companies
for each row
execute function public._trg_companies_employer_ownership();

-- Clear organisation completion when their only employer company is removed.
create or replace function public._trg_companies_employer_delete_reconcile()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
begin
  if old.source = 'employer' and old.owner_employer_id is not null then
    perform public._clear_employer_completion_if_incomplete(old.owner_employer_id);
  end if;
  return old;
end;
$$;

revoke all on function public._trg_companies_employer_delete_reconcile()
  from public, anon, authenticated;

drop trigger if exists trg_companies_employer_delete_reconcile on public.companies;

create trigger trg_companies_employer_delete_reconcile
after delete on public.companies
for each row
execute function public._trg_companies_employer_delete_reconcile();

-- ---------------------------------------------------------------------------
-- complete_employer_onboarding()
-- ---------------------------------------------------------------------------

create or replace function public.complete_employer_onboarding()
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  profile public.employer_profiles%rowtype;
  reason text;
  prior_completed_at timestamptz;
begin
  if uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  select * into profile
  from public.employer_profiles
  where id = uid
  for update;

  if not found then
    return jsonb_build_object('status', 'missing_profile');
  end if;

  prior_completed_at := profile.onboarding_completed_at;

  reason := public._employer_first_incomplete_reason(
    profile.id,
    profile.employer_type,
    profile.display_name,
    profile.berlin_locality,
    profile.organisation_legal_name,
    profile.lawful_hiring_declared
  );

  if reason is not null then
    if profile.onboarding_completed_at is not null then
      update public.employer_profiles
      set
        onboarding_completed_at = null,
        updated_at = now()
      where id = uid;
    end if;

    return jsonb_build_object(
      'status', 'incomplete',
      'first_incomplete_reason', reason
    );
  end if;

  if prior_completed_at is not null then
    if profile.lawful_hiring_declared_at is null
       and profile.lawful_hiring_declared is true
    then
      update public.employer_profiles
      set
        lawful_hiring_declared_at = now(),
        updated_at = now()
      where id = uid;
    end if;

    return jsonb_build_object(
      'status', 'completed',
      'already_complete', true
    );
  end if;

  update public.employer_profiles
  set
    lawful_hiring_declared_at = coalesce(
      lawful_hiring_declared_at,
      case
        when lawful_hiring_declared is true then now()
        else null
      end
    ),
    onboarding_completed_at = now(),
    updated_at = now()
  where id = uid;

  return jsonb_build_object(
    'status', 'completed',
    'already_complete', false
  );
end;
$$;

comment on function public.complete_employer_onboarding() is
  'PR 4.1 controlled employer completion (D-049): locks employer_profiles for auth.uid(), validates type-specific essentials + owned company for organisation, sets onboarding_completed_at. Never accepts employer UUID / timestamps / verification / payload.';

revoke all on function public.complete_employer_onboarding() from public, anon;
grant execute on function public.complete_employer_onboarding() to authenticated;

-- ---------------------------------------------------------------------------
-- bootstrap_organisation_employer(...)
-- ---------------------------------------------------------------------------

create or replace function public.bootstrap_organisation_employer(
  p_display_name text,
  p_organisation_legal_name text,
  p_berlin_locality text,
  p_company_name text,
  p_company_slug text,
  p_website text default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  profile public.employer_profiles%rowtype;
  company public.companies%rowtype;
  v_display_name text := nullif(btrim(p_display_name), '');
  v_legal_name text := nullif(btrim(p_organisation_legal_name), '');
  v_locality text := nullif(btrim(p_berlin_locality), '');
  v_company_name text := nullif(btrim(p_company_name), '');
  v_company_slug text := nullif(btrim(p_company_slug), '');
  v_website text := nullif(btrim(p_website), '');
  v_phone text := nullif(btrim(p_phone), '');
begin
  if uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  if v_display_name is null
     or v_legal_name is null
     or v_locality is null
     or v_company_name is null
     or v_company_slug is null
  then
    return jsonb_build_object('status', 'validation_error');
  end if;

  select * into profile
  from public.employer_profiles
  where id = uid
  for update;

  if found then
    if profile.employer_type = 'private'
       and profile.onboarding_completed_at is not null
    then
      return jsonb_build_object('status', 'conflict_private_completed');
    end if;

    if profile.employer_type = 'private'
       and public._employer_has_owned_company(uid)
    then
      return jsonb_build_object('status', 'conflict_private_with_company');
    end if;

    if profile.employer_type = 'private' then
      -- Allowed only while incomplete and without company (D-048).
      update public.employer_profiles
      set
        employer_type = 'organisation',
        display_name = v_display_name,
        organisation_legal_name = v_legal_name,
        berlin_locality = v_locality,
        website = v_website,
        phone = v_phone,
        updated_at = now()
      where id = uid;
    else
      update public.employer_profiles
      set
        display_name = v_display_name,
        organisation_legal_name = v_legal_name,
        berlin_locality = v_locality,
        website = v_website,
        phone = v_phone,
        updated_at = now()
      where id = uid;
    end if;
  else
    insert into public.employer_profiles (
      id,
      employer_type,
      display_name,
      organisation_legal_name,
      berlin_locality,
      website,
      phone
    )
    values (
      uid,
      'organisation',
      v_display_name,
      v_legal_name,
      v_locality,
      v_website,
      v_phone
    );
  end if;

  select * into company
  from public.companies
  where owner_employer_id = uid
    and source = 'employer'
  for update;

  if found then
    update public.companies
    set
      name = v_company_name,
      slug = v_company_slug,
      updated_at = now()
    where id = company.id
    returning * into company;
  else
    insert into public.companies (
      name,
      slug,
      source,
      owner_employer_id
    )
    values (
      v_company_name,
      v_company_slug,
      'employer',
      uid
    )
    returning * into company;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'employer_id', uid,
    'company_id', company.id
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'conflict_unique');
  when check_violation then
    return jsonb_build_object('status', 'conflict_check');
end;
$$;

comment on function public.bootstrap_organisation_employer(
  text, text, text, text, text, text, text
) is
  'PR 4.1 atomic organisation employer + single owned company bootstrap. Ownership from auth.uid() only. Does not set completion or verification.';

revoke all on function public.bootstrap_organisation_employer(
  text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.bootstrap_organisation_employer(
  text, text, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS — employer_profiles
-- ---------------------------------------------------------------------------

alter table public.employer_profiles enable row level security;

create policy employer_profiles_select_own
  on public.employer_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy employer_profiles_insert_own
  on public.employer_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy employer_profiles_update_own
  on public.employer_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on table public.employer_profiles from public, anon, authenticated;

grant select on table public.employer_profiles to authenticated;

grant insert (
  id,
  employer_type,
  display_name,
  berlin_locality,
  phone,
  website,
  organisation_legal_name,
  lawful_hiring_declared,
  created_at,
  updated_at
) on table public.employer_profiles to authenticated;

grant update (
  employer_type,
  display_name,
  berlin_locality,
  phone,
  website,
  organisation_legal_name,
  lawful_hiring_declared,
  updated_at
) on table public.employer_profiles to authenticated;

grant all on table public.employer_profiles to service_role;

-- ---------------------------------------------------------------------------
-- RLS — companies (preserve seed SELECT; add owner SELECT/UPDATE)
-- ---------------------------------------------------------------------------

create policy companies_select_own_employer
  on public.companies
  for select
  to authenticated
  using (
    source = 'employer'
    and owner_employer_id = (select auth.uid())
  );

create policy companies_update_own_employer
  on public.companies
  for update
  to authenticated
  using (
    source = 'employer'
    and owner_employer_id = (select auth.uid())
  )
  with check (
    source = 'employer'
    and owner_employer_id = (select auth.uid())
  );

-- Authenticated still has table SELECT from prior migration; RLS filters rows.
-- Column-level UPDATE for employer-owned company profile fields only.
grant update (name, updated_at) on table public.companies to authenticated;
