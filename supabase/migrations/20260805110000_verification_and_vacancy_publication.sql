-- PR 5.2 — Verification and employer vacancy publication foundation (D-055–D-067).
-- Database-only: no public table SELECT for anonymous callers and no hosted effects.

-- ---------------------------------------------------------------------------
-- Verification operators and employer verification evidence
-- ---------------------------------------------------------------------------

create table public.verification_operators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  active boolean not null default true
);

alter table public.verification_operators enable row level security;
revoke all on table public.verification_operators from public, anon, authenticated;
grant all on table public.verification_operators to service_role;

alter table public.employer_profiles
  drop constraint employer_profiles_verification_unverified_chk,
  add column verification_requested_at timestamptz,
  add column verification_reviewed_at timestamptz,
  add column verification_reviewed_by uuid references auth.users (id),
  add column verification_review_reason text,
  add column verification_attested_at timestamptz,
  add column verification_attestation_version text;

alter table public.employer_profiles
  add constraint employer_profiles_verification_state_chk
    check (verification_state in ('unverified', 'pending', 'verified', 'rejected', 'revoked')),
  add constraint employer_profiles_verification_attestation_version_chk
    check (
      verification_attestation_version is null
      or verification_attestation_version = 'v1'
    ),
  add constraint employer_profiles_verification_reason_chk
    check (
      verification_review_reason is null
      or (
        verification_review_reason = btrim(verification_review_reason)
        and char_length(verification_review_reason) between 1 and 500
      )
    ),
  add constraint employer_profiles_verification_metadata_chk
    check (
      (
        verification_state = 'unverified'
        and verification_requested_at is null
        and verification_reviewed_at is null
        and verification_reviewed_by is null
        and verification_review_reason is null
        and verification_attested_at is null
        and verification_attestation_version is null
      )
      or (
        verification_state = 'pending'
        and verification_requested_at is not null
        and verification_attested_at is not null
        and verification_attestation_version = 'v1'
        and verification_reviewed_at is null
        and verification_reviewed_by is null
        and verification_review_reason is null
      )
      or (
        verification_state = 'verified'
        and verification_requested_at is not null
        and verification_attested_at is not null
        and verification_attestation_version = 'v1'
        and verification_reviewed_at is not null
        and verification_reviewed_by is not null
        and verification_review_reason is null
      )
      or (
        verification_state in ('rejected', 'revoked')
        and verification_requested_at is not null
        and verification_attested_at is not null
        and verification_attestation_version = 'v1'
        and verification_reviewed_at is not null
        and verification_reviewed_by is not null
        and verification_review_reason is not null
      )
    );

revoke update (
  verification_state,
  verification_requested_at,
  verification_reviewed_at,
  verification_reviewed_by,
  verification_review_reason,
  verification_attested_at,
  verification_attestation_version
) on table public.employer_profiles from authenticated;

create or replace function public._is_active_verification_operator(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select exists (
    select 1
    from public.verification_operators vo
    where vo.user_id = p_uid
      and vo.active
  );
$$;

revoke all on function public._is_active_verification_operator(uuid)
  from public, anon, authenticated;

create or replace function public._employer_has_employer_vacancy(p_employer_id uuid)
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

revoke all on function public._employer_has_employer_vacancy(uuid)
  from public, anon, authenticated;

create or replace function public._employer_has_draft_vacancy(p_employer_id uuid)
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select public._employer_has_employer_vacancy(p_employer_id);
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
  verification_changed boolean;
begin
  if new.employer_type is distinct from old.employer_type then
    if old.onboarding_completed_at is not null then
      raise exception 'employer_type_locked_completed'
        using errcode = 'check_violation';
    end if;
    if public._employer_has_owned_company(old.id) then
      raise exception 'employer_type_locked_company'
        using errcode = 'check_violation';
    end if;
    if public._employer_has_employer_vacancy(old.id) then
      raise exception 'employer_type_locked_employer_vacancy'
        using errcode = 'check_violation';
    end if;
  end if;

  verification_changed :=
    new.verification_state is distinct from old.verification_state
    or new.verification_requested_at is distinct from old.verification_requested_at
    or new.verification_reviewed_at is distinct from old.verification_reviewed_at
    or new.verification_reviewed_by is distinct from old.verification_reviewed_by
    or new.verification_review_reason is distinct from old.verification_review_reason
    or new.verification_attested_at is distinct from old.verification_attested_at
    or new.verification_attestation_version is distinct from old.verification_attestation_version;

  if verification_changed
     and coalesce(current_setting('stint.allow_verification_write', true), '') <> '1'
  then
    raise exception 'verification_fields_rpc_only'
      using errcode = 'insufficient_privilege';
  end if;

  if new.lawful_hiring_declared is distinct from true then
    new.lawful_hiring_declared_at := null;
  elsif new.lawful_hiring_declared_at is null then
    new.lawful_hiring_declared_at := now();
  end if;

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

revoke all on function public._trg_employer_profiles_guard()
  from public, anon, authenticated;

drop trigger if exists trg_employer_profiles_guard on public.employer_profiles;
create trigger trg_employer_profiles_guard
before update on public.employer_profiles
for each row execute function public._trg_employer_profiles_guard();

create or replace function public.request_employer_verification()
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  profile public.employer_profiles%rowtype;
  ts timestamptz := clock_timestamp();
begin
  if uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  select * into profile
  from public.employer_profiles
  where id = uid
  for update;

  if not found then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if profile.onboarding_completed_at is null then
    return jsonb_build_object('status', 'incomplete');
  end if;
  if profile.verification_state not in ('unverified', 'rejected') then
    return jsonb_build_object('status', 'invalid_state');
  end if;

  perform set_config('stint.allow_verification_write', '1', true);
  update public.employer_profiles
  set verification_state = 'pending',
      verification_requested_at = ts,
      verification_reviewed_at = null,
      verification_reviewed_by = null,
      verification_review_reason = null,
      verification_attested_at = ts,
      verification_attestation_version = 'v1',
      updated_at = ts
  where id = uid;

  return jsonb_build_object('status', 'ok', 'employer_profile_id', uid);
end;
$$;

revoke all on function public.request_employer_verification() from public, anon;
grant execute on function public.request_employer_verification() to authenticated;

create or replace function public.approve_employer_verification(p_employer_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  profile public.employer_profiles%rowtype;
begin
  if uid is null then return jsonb_build_object('status', 'unauthenticated'); end if;
  if not public._is_active_verification_operator(uid) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into profile from public.employer_profiles
  where id = p_employer_profile_id for update;
  if not found then return jsonb_build_object('status', 'unavailable'); end if;
  if profile.verification_state <> 'pending' then
    return jsonb_build_object('status', 'invalid_state');
  end if;
  if profile.onboarding_completed_at is null then
    return jsonb_build_object('status', 'incomplete');
  end if;
  perform set_config('stint.allow_verification_write', '1', true);
  update public.employer_profiles
  set verification_state = 'verified',
      verification_reviewed_at = clock_timestamp(),
      verification_reviewed_by = uid,
      verification_review_reason = null,
      updated_at = clock_timestamp()
  where id = profile.id;
  return jsonb_build_object('status', 'ok', 'employer_profile_id', profile.id);
end;
$$;

create or replace function public.reject_employer_verification(
  p_employer_profile_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  profile public.employer_profiles%rowtype;
  reason text := nullif(btrim(p_reason), '');
begin
  if uid is null then return jsonb_build_object('status', 'unauthenticated'); end if;
  if not public._is_active_verification_operator(uid) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if reason is null or char_length(reason) > 500 then
    return jsonb_build_object('status', 'validation_error');
  end if;
  select * into profile from public.employer_profiles
  where id = p_employer_profile_id for update;
  if not found then return jsonb_build_object('status', 'unavailable'); end if;
  if profile.verification_state <> 'pending' then
    return jsonb_build_object('status', 'invalid_state');
  end if;
  perform set_config('stint.allow_verification_write', '1', true);
  update public.employer_profiles
  set verification_state = 'rejected',
      verification_reviewed_at = clock_timestamp(),
      verification_reviewed_by = uid,
      verification_review_reason = reason,
      updated_at = clock_timestamp()
  where id = profile.id;
  return jsonb_build_object('status', 'ok', 'employer_profile_id', profile.id);
end;
$$;

revoke all on function public.approve_employer_verification(uuid) from public, anon;
revoke all on function public.reject_employer_verification(uuid, text) from public, anon;
grant execute on function public.approve_employer_verification(uuid) to authenticated;
grant execute on function public.reject_employer_verification(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Vacancy lifecycle schema and immutable transition evidence
-- ---------------------------------------------------------------------------

alter table public.vacancies
  drop constraint vacancies_employer_draft_only_chk,
  drop constraint vacancies_publication_state_chk,
  drop constraint vacancies_draft_lifecycle_chk,
  drop constraint vacancies_published_requires_expires_chk,
  drop constraint vacancies_published_requires_published_at_chk,
  drop constraint vacancies_published_at_before_expires_chk,
  drop constraint vacancies_summary_nonempty_chk,
  drop constraint vacancies_employment_types_nonempty_chk,
  drop constraint vacancies_shift_requirements_nonempty_chk,
  add column paused_at timestamptz,
  add column filled_at timestamptz,
  add column withdrawn_at timestamptz,
  add column expired_at timestamptz;

alter table public.vacancies
  add constraint vacancies_publication_state_chk
    check (publication_state in ('draft', 'published', 'paused', 'filled', 'expired', 'withdrawn')),
  add constraint vacancies_lifecycle_chk
    check (
      (
        publication_state = 'draft'
        and published_at is null
        and paused_at is null
        and filled_at is null
        and withdrawn_at is null
        and expired_at is null
        and expires_at is null
      )
      or (
        publication_state = 'published'
        and published_at is not null
        and expires_at is not null
        and filled_at is null
        and withdrawn_at is null
        and expired_at is null
      )
      or (
        publication_state = 'paused'
        and published_at is not null
        and expires_at is not null
        and paused_at is not null
        and filled_at is null
        and withdrawn_at is null
        and expired_at is null
      )
      or (
        publication_state = 'filled'
        and published_at is not null
        and filled_at is not null
        and withdrawn_at is null
        and expired_at is null
      )
      or (
        publication_state = 'withdrawn'
        and (source = 'seed' or withdrawn_at is not null)
        and filled_at is null
        and expired_at is null
      )
      or (
        publication_state = 'expired'
        and published_at is not null
        and expires_at is not null
        and expired_at is not null
        and filled_at is null
        and withdrawn_at is null
      )
    ),
  add constraint vacancies_published_at_before_expires_chk
    check (
      published_at is null
      or expires_at is null
      or published_at <= expires_at
    ),
  add constraint vacancies_summary_nonempty_chk
    check (source <> 'seed' or char_length(btrim(summary)) > 0),
  add constraint vacancies_employment_types_nonempty_chk
    check (source <> 'seed' or cardinality(employment_types) > 0),
  add constraint vacancies_shift_requirements_nonempty_chk
    check (source <> 'seed' or cardinality(shift_requirements) > 0);

comment on column public.vacancies.publication_state is
  'draft | published | paused | filled | expired | withdrawn (D-058).';

create table public.vacancy_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete restrict,
  event_type text not null,
  actor_user_id uuid references auth.users (id),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint vacancy_lifecycle_events_type_chk
    check (event_type in (
      'published',
      'paused',
      'resumed',
      'filled',
      'expired',
      'withdrawn',
      'renewed_to_draft'
    )),
  constraint vacancy_lifecycle_events_metadata_object_chk
    check (jsonb_typeof(metadata) = 'object')
);

create index vacancy_lifecycle_events_vacancy_occurred_idx
  on public.vacancy_lifecycle_events (vacancy_id, occurred_at, id);

alter table public.vacancy_lifecycle_events enable row level security;

create policy vacancy_lifecycle_events_select_owner
  on public.vacancy_lifecycle_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vacancies v
      where v.id = vacancy_id
        and v.source = 'employer'
        and v.employer_profile_id = (select auth.uid())
    )
  );

revoke all on table public.vacancy_lifecycle_events from public, anon, authenticated;
grant select on table public.vacancy_lifecycle_events to authenticated;
grant all on table public.vacancy_lifecycle_events to service_role;

create or replace function public._append_vacancy_lifecycle_event(
  p_vacancy_id uuid,
  p_event_type text,
  p_actor_user_id uuid,
  p_occurred_at timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  event_id uuid;
begin
  insert into public.vacancy_lifecycle_events (
    vacancy_id,
    event_type,
    actor_user_id,
    occurred_at,
    metadata
  )
  values (
    p_vacancy_id,
    p_event_type,
    p_actor_user_id,
    coalesce(p_occurred_at, clock_timestamp()),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into event_id;
  return event_id;
end;
$$;

revoke all on function public._append_vacancy_lifecycle_event(
  uuid, text, uuid, timestamptz, jsonb
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Canonical effective-public contract
-- ---------------------------------------------------------------------------

create or replace function public.is_vacancy_effectively_public(
  p_vacancy_id uuid,
  p_at timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select coalesce((
    select
      v.publication_state = 'published'
      and v.published_at is not null
      and v.published_at <= p_at
      and v.expires_at is not null
      and v.expires_at > p_at
      and (
        (
          v.source = 'seed'
          and v.employer_profile_id is null
          and c.source = 'seed'
        )
        or (
          v.source = 'employer'
          and ep.id = v.employer_profile_id
          and ep.onboarding_completed_at is not null
          and ep.verification_state = 'verified'
          and (
            (
              ep.employer_type = 'private'
              and v.company_id is null
            )
            or (
              ep.employer_type = 'organisation'
              and c.id = v.company_id
              and c.source = 'employer'
              and c.owner_employer_id = ep.id
            )
          )
        )
      )
    from public.vacancies v
    left join public.employer_profiles ep on ep.id = v.employer_profile_id
    left join public.companies c on c.id = v.company_id
    where v.id = p_vacancy_id
  ), false);
$$;

create or replace function public.visible_public_vacancy_ids(
  p_at timestamptz default now()
)
returns setof uuid
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select v.id
  from public.vacancies v
  where public.is_vacancy_effectively_public(v.id, p_at);
$$;

revoke all on function public.is_vacancy_effectively_public(uuid, timestamptz) from public;
revoke all on function public.visible_public_vacancy_ids(timestamptz) from public;
grant execute on function public.is_vacancy_effectively_public(uuid, timestamptz)
  to anon, authenticated, service_role;
grant execute on function public.visible_public_vacancy_ids(timestamptz)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Transactional publication readiness
-- ---------------------------------------------------------------------------

create or replace function public._employer_vacancy_publish_missing(
  p_vacancy public.vacancies,
  p_employer public.employer_profiles,
  p_at timestamptz
)
returns text[]
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  missing text[] := '{}'::text[];
begin
  if p_employer.onboarding_completed_at is null then
    missing := array_append(missing, 'employer_completion');
  end if;
  if p_employer.verification_state <> 'verified' then
    missing := array_append(missing, 'verification');
  end if;
  if (
    p_employer.employer_type = 'private'
    and p_vacancy.company_id is not null
  ) or (
    p_employer.employer_type = 'organisation'
    and not exists (
      select 1 from public.companies c
      where c.id = p_vacancy.company_id
        and c.source = 'employer'
        and c.owner_employer_id = p_employer.id
    )
  ) then
    missing := array_append(missing, 'company');
  end if;
  if nullif(btrim(p_vacancy.title), '') is null then missing := array_append(missing, 'title'); end if;
  if nullif(btrim(p_vacancy.job_category), '') is null then missing := array_append(missing, 'job_category'); end if;
  if nullif(btrim(p_vacancy.description), '') is null then missing := array_append(missing, 'description'); end if;
  if p_vacancy.city <> 'Berlin' or nullif(btrim(p_vacancy.public_locality), '') is null then
    missing := array_append(missing, 'public_locality');
  end if;
  if p_vacancy.workplace_type is null then missing := array_append(missing, 'workplace_type'); end if;
  if p_vacancy.work_frequency is null then missing := array_append(missing, 'work_frequency'); end if;
  if p_vacancy.salary_amount_cents is null
     or p_vacancy.salary_amount_cents <= 0
     or p_vacancy.salary_currency <> 'EUR'
     or p_vacancy.salary_period is null
     or p_vacancy.salary_is_gross is distinct from true
  then
    missing := array_append(missing, 'salary');
  end if;
  if not exists (
    select 1 from public.vacancy_language_requirements vlr
    where vlr.vacancy_id = p_vacancy.id
  ) then
    missing := array_append(missing, 'languages');
  end if;
  if p_vacancy.cv_required is null then missing := array_append(missing, 'cv_required'); end if;
  if p_vacancy.interview_english_ok is null then missing := array_append(missing, 'interview_english_ok'); end if;
  if p_vacancy.expires_at is null
     or p_vacancy.expires_at <= p_at
     or p_vacancy.expires_at > p_at + interval '90 days'
  then
    missing := array_append(missing, 'expiry');
  end if;
  return missing;
end;
$$;

revoke all on function public._employer_vacancy_publish_missing(
  public.vacancies, public.employer_profiles, timestamptz
) from public, anon, authenticated;

create or replace function public.publish_employer_vacancy(
  p_vacancy_id uuid,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  vacancy public.vacancies%rowtype;
  profile public.employer_profiles%rowtype;
  ts timestamptz := clock_timestamp();
  expiry timestamptz;
  missing text[];
begin
  if uid is null then return jsonb_build_object('status', 'unauthenticated'); end if;
  select * into vacancy from public.vacancies where id = p_vacancy_id for update;
  if not found or vacancy.source <> 'employer' or vacancy.employer_profile_id <> uid then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if public.is_vacancy_effectively_public(vacancy.id, ts) then
    return jsonb_build_object('status', 'ok', 'vacancy_id', vacancy.id);
  end if;
  if vacancy.publication_state <> 'draft' then
    return jsonb_build_object('status', 'invalid_state');
  end if;
  select * into profile from public.employer_profiles where id = uid for update;
  if not found then return jsonb_build_object('status', 'unavailable'); end if;
  expiry := coalesce(p_expires_at, ts + interval '30 days');
  vacancy.expires_at := expiry;
  missing := public._employer_vacancy_publish_missing(vacancy, profile, ts);
  if coalesce(cardinality(missing), 0) > 0 then
    return jsonb_build_object('status', 'incomplete', 'missing', to_jsonb(missing));
  end if;
  update public.vacancies
  set publication_state = 'published',
      published_at = ts,
      paused_at = null,
      filled_at = null,
      withdrawn_at = null,
      expired_at = null,
      expires_at = expiry,
      updated_at = ts
  where id = vacancy.id;
  perform public._append_vacancy_lifecycle_event(
    vacancy.id, 'published', uid, ts, jsonb_build_object('expires_at', expiry)
  );
  return jsonb_build_object('status', 'ok', 'vacancy_id', vacancy.id);
end;
$$;

create or replace function public._transition_employer_vacancy(
  p_vacancy_id uuid,
  p_action text,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  vacancy public.vacancies%rowtype;
  profile public.employer_profiles%rowtype;
  ts timestamptz := clock_timestamp();
  expiry timestamptz;
  missing text[];
begin
  if uid is null then return jsonb_build_object('status', 'unauthenticated'); end if;
  select * into vacancy from public.vacancies where id = p_vacancy_id for update;
  if not found or vacancy.source <> 'employer' or vacancy.employer_profile_id <> uid then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if p_action = 'pause' then
    if vacancy.publication_state = 'paused' then
      return jsonb_build_object('status', 'ok', 'vacancy_id', vacancy.id);
    end if;
    if vacancy.publication_state <> 'published' then
      return jsonb_build_object('status', 'invalid_state');
    end if;
    update public.vacancies
    set publication_state = 'paused', paused_at = ts, updated_at = ts
    where id = vacancy.id;
    perform public._append_vacancy_lifecycle_event(vacancy.id, 'paused', uid, ts);

  elsif p_action = 'resume' then
    if vacancy.publication_state <> 'paused' then
      return jsonb_build_object('status', 'invalid_state');
    end if;
    expiry := case
      when vacancy.expires_at > ts then vacancy.expires_at
      else p_expires_at
    end;
    vacancy.expires_at := expiry;
    select * into profile from public.employer_profiles where id = uid for update;
    missing := public._employer_vacancy_publish_missing(vacancy, profile, ts);
    if coalesce(cardinality(missing), 0) > 0 then
      return jsonb_build_object('status', 'incomplete', 'missing', to_jsonb(missing));
    end if;
    update public.vacancies
    set publication_state = 'published',
        paused_at = null,
        expires_at = expiry,
        updated_at = ts
    where id = vacancy.id;
    perform public._append_vacancy_lifecycle_event(
      vacancy.id, 'resumed', uid, ts, jsonb_build_object('expires_at', expiry)
    );

  elsif p_action = 'fill' then
    if vacancy.publication_state not in ('published', 'paused') then
      return jsonb_build_object('status', 'invalid_state');
    end if;
    update public.vacancies
    set publication_state = 'filled', filled_at = ts, updated_at = ts
    where id = vacancy.id;
    perform public._append_vacancy_lifecycle_event(vacancy.id, 'filled', uid, ts);

  elsif p_action = 'withdraw' then
    if vacancy.publication_state not in ('published', 'paused') then
      return jsonb_build_object('status', 'invalid_state');
    end if;
    update public.vacancies
    set publication_state = 'withdrawn', withdrawn_at = ts, updated_at = ts
    where id = vacancy.id;
    perform public._append_vacancy_lifecycle_event(vacancy.id, 'withdrawn', uid, ts);

  elsif p_action = 'materialize_expiry' then
    if vacancy.publication_state = 'expired' then
      return jsonb_build_object('status', 'ok', 'vacancy_id', vacancy.id);
    end if;
    if vacancy.publication_state not in ('published', 'paused')
       or vacancy.expires_at is null
       or vacancy.expires_at > ts
    then
      return jsonb_build_object('status', 'ok', 'vacancy_id', vacancy.id);
    end if;
    update public.vacancies
    set publication_state = 'expired', expired_at = ts, updated_at = ts
    where id = vacancy.id;
    perform public._append_vacancy_lifecycle_event(vacancy.id, 'expired', uid, ts);

  elsif p_action = 'renew_to_draft' then
    if vacancy.publication_state <> 'expired' then
      return jsonb_build_object('status', 'invalid_state');
    end if;
    update public.vacancies
    set publication_state = 'draft',
        published_at = null,
        paused_at = null,
        filled_at = null,
        withdrawn_at = null,
        expired_at = null,
        expires_at = null,
        updated_at = ts
    where id = vacancy.id;
    perform public._append_vacancy_lifecycle_event(vacancy.id, 'renewed_to_draft', uid, ts);
  else
    raise exception 'invalid_private_lifecycle_action'
      using errcode = 'invalid_parameter_value';
  end if;

  return jsonb_build_object('status', 'ok', 'vacancy_id', vacancy.id);
end;
$$;

revoke all on function public._transition_employer_vacancy(uuid, text, timestamptz)
  from public, anon, authenticated;

create or replace function public.pause_employer_vacancy(p_vacancy_id uuid)
returns jsonb language sql security definer
set search_path to pg_catalog, public
as $$ select public._transition_employer_vacancy(p_vacancy_id, 'pause'); $$;

create or replace function public.resume_employer_vacancy(
  p_vacancy_id uuid,
  p_expires_at timestamptz default null
)
returns jsonb language sql security definer
set search_path to pg_catalog, public
as $$ select public._transition_employer_vacancy(p_vacancy_id, 'resume', p_expires_at); $$;

create or replace function public.fill_employer_vacancy(p_vacancy_id uuid)
returns jsonb language sql security definer
set search_path to pg_catalog, public
as $$ select public._transition_employer_vacancy(p_vacancy_id, 'fill'); $$;

create or replace function public.withdraw_employer_vacancy(p_vacancy_id uuid)
returns jsonb language sql security definer
set search_path to pg_catalog, public
as $$ select public._transition_employer_vacancy(p_vacancy_id, 'withdraw'); $$;

create or replace function public.materialize_employer_vacancy_expiry(p_vacancy_id uuid)
returns jsonb language sql security definer
set search_path to pg_catalog, public
as $$ select public._transition_employer_vacancy(p_vacancy_id, 'materialize_expiry'); $$;

revoke all on function public.publish_employer_vacancy(uuid, timestamptz) from public, anon;
revoke all on function public.pause_employer_vacancy(uuid) from public, anon;
revoke all on function public.resume_employer_vacancy(uuid, timestamptz) from public, anon;
revoke all on function public.fill_employer_vacancy(uuid) from public, anon;
revoke all on function public.withdraw_employer_vacancy(uuid) from public, anon;
revoke all on function public.materialize_employer_vacancy_expiry(uuid) from public, anon;
grant execute on function public.publish_employer_vacancy(uuid, timestamptz) to authenticated;
grant execute on function public.pause_employer_vacancy(uuid) to authenticated;
grant execute on function public.resume_employer_vacancy(uuid, timestamptz) to authenticated;
grant execute on function public.fill_employer_vacancy(uuid) to authenticated;
grant execute on function public.withdraw_employer_vacancy(uuid) to authenticated;
grant execute on function public.materialize_employer_vacancy_expiry(uuid) to authenticated;

create or replace function public.revoke_employer_verification(
  p_employer_profile_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  profile public.employer_profiles%rowtype;
  reason text := nullif(btrim(p_reason), '');
  vacancy record;
  ts timestamptz := clock_timestamp();
  paused_count integer := 0;
begin
  if uid is null then return jsonb_build_object('status', 'unauthenticated'); end if;
  if not public._is_active_verification_operator(uid) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if reason is null or char_length(reason) > 500 then
    return jsonb_build_object('status', 'validation_error');
  end if;
  select * into profile from public.employer_profiles
  where id = p_employer_profile_id for update;
  if not found then return jsonb_build_object('status', 'unavailable'); end if;
  if profile.verification_state <> 'verified' then
    return jsonb_build_object('status', 'invalid_state');
  end if;

  perform 1
  from public.vacancies v
  where v.employer_profile_id = profile.id
    and v.source = 'employer'
    and v.publication_state = 'published'
  order by v.id
  for update;

  perform set_config('stint.allow_verification_write', '1', true);
  update public.employer_profiles
  set verification_state = 'revoked',
      verification_reviewed_at = ts,
      verification_reviewed_by = uid,
      verification_review_reason = reason,
      updated_at = ts
  where id = profile.id;

  for vacancy in
    update public.vacancies
    set publication_state = 'paused', paused_at = ts, updated_at = ts
    where employer_profile_id = profile.id
      and source = 'employer'
      and publication_state = 'published'
    returning id
  loop
    paused_count := paused_count + 1;
    perform public._append_vacancy_lifecycle_event(
      vacancy.id, 'paused', uid, ts, jsonb_build_object('reason', 'verification_revoked')
    );
  end loop;

  return jsonb_build_object(
    'status', 'ok',
    'employer_profile_id', profile.id,
    'paused_vacancy_count', paused_count
  );
end;
$$;

revoke all on function public.revoke_employer_verification(uuid, text) from public, anon;
grant execute on function public.revoke_employer_verification(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Existing draft RPC compatibility: paused vacancies remain editable
-- ---------------------------------------------------------------------------

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
     or vacancy.source <> 'employer'
     or vacancy.employer_profile_id <> p_uid
     or vacancy.publication_state not in ('draft', 'paused')
  then
    return null;
  end if;
  return vacancy;
end;
$$;

revoke all on function public._employer_owned_draft_vacancy(uuid, uuid)
  from public, anon, authenticated;

create or replace function public._trg_vacancies_preserve_paused_lifecycle()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
begin
  if old.source = 'employer'
     and old.publication_state = 'paused'
     and new.publication_state = 'draft'
     and coalesce(current_setting('stint.allow_expired_renewal', true), '') <> '1'
  then
    new.publication_state := old.publication_state;
    new.published_at := old.published_at;
    new.paused_at := old.paused_at;
    new.filled_at := old.filled_at;
    new.withdrawn_at := old.withdrawn_at;
    new.expired_at := old.expired_at;
    new.expires_at := old.expires_at;
  end if;
  return new;
end;
$$;

revoke all on function public._trg_vacancies_preserve_paused_lifecycle()
  from public, anon, authenticated;

create trigger trg_vacancies_preserve_paused_lifecycle
before update on public.vacancies
for each row execute function public._trg_vacancies_preserve_paused_lifecycle();

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
  if uid is null then return jsonb_build_object('status', 'unauthenticated'); end if;
  select * into vacancy
  from public.vacancies
  where id = p_vacancy_id
  for update;
  if not found
     or vacancy.source <> 'employer'
     or vacancy.employer_profile_id <> uid
  then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if vacancy.publication_state <> 'draft'
     or exists (
       select 1 from public.vacancy_lifecycle_events e
       where e.vacancy_id = vacancy.id and e.event_type = 'published'
     )
     or exists (
       select 1 from public.applications a where a.vacancy_id = vacancy.id
     )
  then
    return jsonb_build_object('status', 'not_deletable');
  end if;
  delete from public.vacancies where id = vacancy.id returning id into deleted_id;
  return jsonb_build_object('status', 'ok', 'vacancy_id', deleted_id);
end;
$$;

revoke all on function public.delete_employer_vacancy_draft(uuid) from public, anon;
grant execute on function public.delete_employer_vacancy_draft(uuid) to authenticated;

-- Renewal is the only allowed lifecycle reset to draft.
create or replace function public.renew_employer_vacancy_to_draft(p_vacancy_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
begin
  perform set_config('stint.allow_expired_renewal', '1', true);
  return public._transition_employer_vacancy(p_vacancy_id, 'renew_to_draft');
end;
$$;

revoke all on function public.renew_employer_vacancy_to_draft(uuid) from public, anon;
grant execute on function public.renew_employer_vacancy_to_draft(uuid) to authenticated;

-- Owner reads cover every employer lifecycle state. Anonymous access remains
-- helper-only until PR 5.5 wires field-safe loaders.
drop policy if exists vacancies_select_own_employer_draft on public.vacancies;
create policy vacancies_select_own_employer
  on public.vacancies
  for select
  to authenticated
  using (
    source = 'employer'
    and employer_profile_id = (select auth.uid())
  );

drop policy if exists vacancy_language_requirements_select_own_employer_draft
  on public.vacancy_language_requirements;
create policy vacancy_language_requirements_select_own_employer
  on public.vacancy_language_requirements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vacancies v
      where v.id = vacancy_id
        and v.source = 'employer'
        and v.employer_profile_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Application submit: lock and recheck canonical effective visibility
-- ---------------------------------------------------------------------------

create or replace function public.submit_candidate_application(p_vacancy_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  profile public.candidate_profiles%rowtype;
  vacancy public.vacancies%rowtype;
  employer_display_name text;
  snapshot_job_category text;
  ts timestamptz := clock_timestamp();
  new_id uuid;
  existing_id uuid;
  candidate_languages_json jsonb;
  vacancy_languages_json jsonb;
  employment_sorted text[];
  shifts_sorted text[];
  vacancy_employment_sorted text[];
  vacancy_shifts_sorted text[];
  candidate_snap jsonb;
  vacancy_snap jsonb;
begin
  if uid is null or p_vacancy_id is null then
    return jsonb_build_object('result', 'unavailable');
  end if;

  select * into profile
  from public.candidate_profiles
  where id = uid
  for update;
  if not found or profile.onboarding_completed_at is null then
    return jsonb_build_object('result', 'incomplete');
  end if;

  select * into vacancy
  from public.vacancies
  where id = p_vacancy_id
  for update;
  if not found
     or not public.is_vacancy_effectively_public(vacancy.id, ts)
  then
    return jsonb_build_object('result', 'unavailable');
  end if;

  if vacancy.source = 'seed' then
    select c.name into employer_display_name
    from public.companies c
    where c.id = vacancy.company_id;
  else
    select coalesce(c.name, ep.display_name) into employer_display_name
    from public.employer_profiles ep
    left join public.companies c on c.id = vacancy.company_id
    where ep.id = vacancy.employer_profile_id;
  end if;
  if employer_display_name is null then
    return jsonb_build_object('result', 'unavailable');
  end if;

  select a.id into existing_id
  from public.applications a
  where a.candidate_id = uid and a.vacancy_id = p_vacancy_id;
  if existing_id is not null then
    return jsonb_build_object('result', 'already_applied', 'application_id', existing_id);
  end if;

  select pref.category into snapshot_job_category
  from unnest(profile.job_categories) as pref (category)
  where pref.category = vacancy.job_category
  limit 1;
  if snapshot_job_category is null then
    return jsonb_build_object('result', 'unavailable');
  end if;

  select coalesce(array_agg(x order by x), '{}'::text[])
  into employment_sorted
  from unnest(profile.employment_types) as x;
  select coalesce(array_agg(x order by x), '{}'::text[])
  into shifts_sorted
  from unnest(profile.shift_preferences) as x;
  select coalesce(array_agg(x order by x), '{}'::text[])
  into vacancy_employment_sorted
  from unnest(vacancy.employment_types) as x;
  select coalesce(array_agg(x order by x), '{}'::text[])
  into vacancy_shifts_sorted
  from unnest(vacancy.shift_requirements) as x;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'language_code', cl.language_code,
        'proficiency', cl.proficiency
      )
      order by cl.language_code
    ),
    '[]'::jsonb
  )
  into candidate_languages_json
  from public.candidate_languages cl
  where cl.candidate_id = uid
    and exists (
      select 1
      from public.vacancy_language_requirements vlr
      where vlr.vacancy_id = p_vacancy_id
        and vlr.language_code = cl.language_code
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'language_code', vlr.language_code,
        'min_proficiency', vlr.min_proficiency
      )
      order by vlr.language_code
    ),
    '[]'::jsonb
  )
  into vacancy_languages_json
  from public.vacancy_language_requirements vlr
  where vlr.vacancy_id = p_vacancy_id;

  candidate_snap := jsonb_build_object(
    'display_name', profile.display_name,
    'job_category', snapshot_job_category,
    'german_comfort', profile.german_comfort,
    'languages', candidate_languages_json,
    'work_authorisation_declared', profile.work_authorisation_declared,
    'available_from',
      case when profile.available_from is null then null
      else to_char(profile.available_from, 'YYYY-MM-DD') end,
    'employment_types', to_jsonb(employment_sorted),
    'shift_preferences', to_jsonb(shifts_sorted)
  );

  vacancy_snap := jsonb_build_object(
    'vacancy_id', vacancy.id,
    'title', vacancy.title,
    'employer_display_name', employer_display_name,
    'source', vacancy.source,
    'demo_label', case when vacancy.source = 'seed' then 'Demo vacancy' else null end,
    'city', vacancy.city,
    'job_category', vacancy.job_category,
    'employment_types', to_jsonb(vacancy_employment_sorted),
    'shift_requirements', to_jsonb(vacancy_shifts_sorted),
    'german_requirement', vacancy.german_requirement,
    'language_requirements', vacancy_languages_json,
    'available_from',
      case when vacancy.available_from is null then null
      else to_char(vacancy.available_from, 'YYYY-MM-DD') end
  );

  begin
    insert into public.applications (
      candidate_id,
      vacancy_id,
      status,
      submitted_at,
      snapshot_version,
      candidate_snapshot,
      vacancy_snapshot,
      created_at,
      updated_at
    )
    values (
      uid,
      p_vacancy_id,
      'submitted',
      ts,
      1,
      candidate_snap,
      vacancy_snap,
      ts,
      ts
    )
    returning id into new_id;
    return jsonb_build_object('result', 'submitted', 'application_id', new_id);
  exception
    when unique_violation then
      select a.id into existing_id
      from public.applications a
      where a.candidate_id = uid and a.vacancy_id = p_vacancy_id;
      if existing_id is null then raise; end if;
      return jsonb_build_object(
        'result', 'already_applied',
        'application_id', existing_id
      );
  end;
end;
$$;

comment on function public.submit_candidate_application(uuid) is
  'Auth-bound submit with vacancy row lock and canonical effective-public recheck. Preserves immutable v1 snapshots and uniqueness.';

revoke all on function public.submit_candidate_application(uuid) from public, anon;
grant execute on function public.submit_candidate_application(uuid) to authenticated;
