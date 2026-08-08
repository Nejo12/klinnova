-- Slice 8 PR 8.2 — Account deletion database contract.
--
-- Implements the database half of the accepted Slice 8 export/deletion
-- contract: D-078 (candidate deletion), D-079 (employer deletion), D-080
-- (Auth deletion mechanism — the account_deleted_at database gate half),
-- D-081 (deletion-request state machine), D-082 (audit-reason redaction),
-- D-085 (whole-account deletion across capabilities), D-086 (current-state
-- moderation removal). See docs/10-decisions.md, docs/45-slice-8-discovery.md,
-- docs/47-slice-8-data-removal-proposal.md.
--
-- Explicitly NOT in this migration: any Supabase Auth Admin API call, any
-- service-role application code, any UI. The privileged Auth-scrub
-- processing module is PR 8.4's responsibility; this migration only
-- provides the database primitives it will call.
--
-- No existing ON DELETE FK action is weakened. No existing table is
-- dropped or destructively altered.

-- =============================================================================
-- 1. Tombstone columns (D-080 §3.3, D-085)
-- =============================================================================
-- Nullable on both per-role identity tables directly — no shared `profiles`
-- table is introduced. NULL = active account; non-null = deleted/tombstoned.
-- Cleared only by the private domain-scrub functions below (§5); ordinary
-- authenticated RLS/RPC paths can never set or clear it (§4/§7).

alter table public.candidate_profiles
  add column account_deleted_at timestamptz null;

alter table public.employer_profiles
  add column account_deleted_at timestamptz null;

comment on column public.candidate_profiles.account_deleted_at is
  'D-080/D-085 tombstone marker. Set once, by _anonymize_candidate_domain only, never by ordinary authenticated writes. Independent of employer_profiles.account_deleted_at — a dual-capability account (D-047) may have one, both, or (pre-deletion) neither set, but D-085 requires both to become non-null atomically once any deletion request completes its domain scrub for an account holding both profiles.';

comment on column public.employer_profiles.account_deleted_at is
  'D-080/D-085 tombstone marker. Set once, by _anonymize_employer_domain only, never by ordinary authenticated writes. Independent of employer_suspension (temporary, appealable) and verification_state (unrelated dimension) — see D-080''s explicit non-conflation requirement.';

-- =============================================================================
-- 2. Canonical deleted-account helpers (D-080 §3.3)
-- =============================================================================
-- Mirrors the exact three-tier _is_employer_suspended /
-- _is_current_employer_suspended / is_current_employer_suspended pattern
-- from 20260807090000_admin_moderation_and_audit_contract.sql. The
-- arbitrary-id form is never authenticated/anon-executable (no existence
-- oracle); only the zero-argument, self-derived forms are.

create or replace function public._is_candidate_deleted(p_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select exists (
    select 1
    from public.candidate_profiles cp
    where cp.id = p_candidate_id
      and cp.account_deleted_at is not null
  );
$$;

comment on function public._is_candidate_deleted(uuid) is
  'Fully internal arbitrary-id deleted-account lookup. Never authenticated/anon-executable — an authenticated user must not be able to probe an arbitrary candidate''s deletion state. Called only from within other SECURITY DEFINER function bodies.';

revoke all on function public._is_candidate_deleted(uuid) from public, anon, authenticated;

create or replace function public._is_current_candidate_deleted()
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select public._is_candidate_deleted(auth.uid());
$$;

comment on function public._is_current_candidate_deleted() is
  'RLS-support helper: zero arguments, identity from auth.uid() only. Granted authenticated EXECUTE because RLS policy predicates evaluate under the querying role, not an elevated SECURITY DEFINER context — same reason _is_current_employer_suspended is granted. Cannot be used to probe another candidate''s deletion state.';

revoke all on function public._is_current_candidate_deleted() from public, anon;
grant execute on function public._is_current_candidate_deleted() to authenticated;

create or replace function public.is_current_candidate_deleted()
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select public._is_current_candidate_deleted();
$$;

comment on function public.is_current_candidate_deleted() is
  'Public self-scoped deletion check for the calling candidate. Delegates to _is_current_candidate_deleted() so there is exactly one implementation of "is the current session''s own candidate account deleted," not two.';

revoke all on function public.is_current_candidate_deleted() from public, anon;
grant execute on function public.is_current_candidate_deleted() to authenticated;

create or replace function public._is_employer_deleted(p_employer_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select exists (
    select 1
    from public.employer_profiles ep
    where ep.id = p_employer_profile_id
      and ep.account_deleted_at is not null
  );
$$;

comment on function public._is_employer_deleted(uuid) is
  'Fully internal arbitrary-id deleted-account lookup. Never authenticated/anon-executable — mirrors _is_employer_suspended''s no-existence-oracle discipline. Called only from within other SECURITY DEFINER function bodies.';

revoke all on function public._is_employer_deleted(uuid) from public, anon, authenticated;

create or replace function public._is_current_employer_deleted()
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select public._is_employer_deleted(auth.uid());
$$;

comment on function public._is_current_employer_deleted() is
  'RLS-support helper: zero arguments, identity from auth.uid() only. Granted authenticated EXECUTE because the employer_profiles_update_own/select_own/insert_own RLS predicates call it directly. Cannot be used to probe another employer''s deletion state.';

revoke all on function public._is_current_employer_deleted() from public, anon;
grant execute on function public._is_current_employer_deleted() to authenticated;

create or replace function public.is_current_employer_deleted()
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select public._is_current_employer_deleted();
$$;

comment on function public.is_current_employer_deleted() is
  'Public self-scoped deletion check for the calling employer. Delegates to _is_current_employer_deleted() so there is exactly one implementation of "is the current session''s own employer account deleted," not two.';

revoke all on function public.is_current_employer_deleted() from public, anon;
grant execute on function public.is_current_employer_deleted() to authenticated;

-- =============================================================================
-- 3. Trigger guard: preserve onboarding_completed_at during account-deletion
--    scrub (discovered during PR 8.2 implementation)
-- =============================================================================
-- D-078/D-079 require onboarding_completed_at preserved as a lifecycle fact
-- even though the essentials fields it depends on are being cleared. The
-- existing _trg_candidate_profiles_essentials / _trg_employer_profiles_guard
-- BEFORE UPDATE triggers (and the _clear_completion_if_incomplete /
-- _clear_employer_completion_if_incomplete helpers they call, directly or
-- via the candidate_languages/companies delete-reconcile triggers) would
-- otherwise automatically null out onboarding_completed_at the moment the
-- essentials fields go empty — correct behavior for an ordinary candidate/
-- employer self-edit, but incompatible with account-deletion's "preserve
-- as historical fact" requirement. Mirrors the existing
-- stint.allow_verification_write session-local escape-hatch pattern
-- (20260807090000, _trg_employer_profiles_guard) exactly: a transaction-local
-- flag, set only inside the domain-scrub functions below, that the ordinary
-- ongoing ownership ordinary-path ordinary business logic is otherwise
-- unaware of and cannot set for itself (no authenticated grant on set_config
-- is exposed).

create or replace function public._trg_candidate_profiles_essentials()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  first_group text;
begin
  if coalesce(current_setting('stint.allow_account_deletion_scrub', true), '') = '1' then
    return new;
  end if;

  -- work_authorisation_declared_at contract
  if new.work_authorisation_declared is distinct from true then
    new.work_authorisation_declared_at := null;
  elsif new.work_authorisation_declared_at is null then
    new.work_authorisation_declared_at := now();
  end if;

  -- Never auto-complete. Clear gate when resulting essentials (incl. languages) fail.
  first_group := public._profile_first_incomplete_group(
    new.id,
    new.german_comfort,
    new.work_authorisation_declared,
    new.city,
    new.travel_radius_minutes,
    new.job_categories,
    new.available_from,
    new.employment_types,
    new.shift_preferences
  );

  if first_group is not null then
    new.onboarding_completed_at := null;
  end if;

  return new;
end;
$$;

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
  if coalesce(current_setting('stint.allow_account_deletion_scrub', true), '') = '1' then
    return new;
  end if;

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

create or replace function public._clear_completion_if_incomplete(p_uid uuid)
returns void
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  profile public.candidate_profiles%rowtype;
  first_group text;
begin
  if coalesce(current_setting('stint.allow_account_deletion_scrub', true), '') = '1' then
    return;
  end if;

  if p_uid is null then
    return;
  end if;

  select * into profile
  from public.candidate_profiles
  where id = p_uid
  for update;

  if not found then
    return;
  end if;

  first_group := public._profile_first_incomplete_group(
    profile.id,
    profile.german_comfort,
    profile.work_authorisation_declared,
    profile.city,
    profile.travel_radius_minutes,
    profile.job_categories,
    profile.available_from,
    profile.employment_types,
    profile.shift_preferences
  );

  if first_group is not null and profile.onboarding_completed_at is not null then
    update public.candidate_profiles
    set
      onboarding_completed_at = null,
      updated_at = now()
    where id = p_uid;
  end if;
end;
$$;

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
  if coalesce(current_setting('stint.allow_account_deletion_scrub', true), '') = '1' then
    return;
  end if;

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

-- =============================================================================
-- 4. Deleted-account RLS composition (D-080 §3.3) — every direct-table
--    policy on candidate/employer-owned business data.
-- =============================================================================
-- Unlike suspension (which deliberately keeps SELECT open so a suspended
-- employer can see a neutral suspended state, per D-072), a deleted account
-- gets no read at all — "no active profile/business read" is the explicit
-- Slice 8 requirement. SELECT, INSERT, and UPDATE are all narrowed.

drop policy candidate_profiles_select_own on public.candidate_profiles;
create policy candidate_profiles_select_own
  on public.candidate_profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = id
    and not public._is_current_candidate_deleted()
  );

drop policy candidate_profiles_insert_own on public.candidate_profiles;
create policy candidate_profiles_insert_own
  on public.candidate_profiles
  for insert
  to authenticated
  with check (
    (select auth.uid()) = id
    and not public._is_current_candidate_deleted()
  );

drop policy candidate_profiles_update_own on public.candidate_profiles;
create policy candidate_profiles_update_own
  on public.candidate_profiles
  for update
  to authenticated
  using (
    (select auth.uid()) = id
    and not public._is_current_candidate_deleted()
  )
  with check ((select auth.uid()) = id);

drop policy candidate_languages_select_own on public.candidate_languages;
create policy candidate_languages_select_own
  on public.candidate_languages
  for select
  to authenticated
  using (
    (select auth.uid()) = candidate_id
    and not public._is_current_candidate_deleted()
  );

drop policy candidate_languages_insert_own on public.candidate_languages;
create policy candidate_languages_insert_own
  on public.candidate_languages
  for insert
  to authenticated
  with check (
    (select auth.uid()) = candidate_id
    and not public._is_current_candidate_deleted()
  );

drop policy candidate_languages_update_own on public.candidate_languages;
create policy candidate_languages_update_own
  on public.candidate_languages
  for update
  to authenticated
  using (
    (select auth.uid()) = candidate_id
    and not public._is_current_candidate_deleted()
  )
  with check ((select auth.uid()) = candidate_id);

drop policy candidate_languages_delete_own on public.candidate_languages;
create policy candidate_languages_delete_own
  on public.candidate_languages
  for delete
  to authenticated
  using (
    (select auth.uid()) = candidate_id
    and not public._is_current_candidate_deleted()
  );

drop policy applications_select_own on public.applications;
create policy applications_select_own
  on public.applications
  for select
  to authenticated
  using (
    candidate_id = (select auth.uid())
    and not public._is_current_candidate_deleted()
  );

drop policy employer_profiles_select_own on public.employer_profiles;
create policy employer_profiles_select_own
  on public.employer_profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = id
    and not public._is_current_employer_deleted()
  );

drop policy employer_profiles_insert_own on public.employer_profiles;
create policy employer_profiles_insert_own
  on public.employer_profiles
  for insert
  to authenticated
  with check (
    (select auth.uid()) = id
    and not public._is_current_employer_deleted()
  );

drop policy employer_profiles_update_own on public.employer_profiles;
create policy employer_profiles_update_own
  on public.employer_profiles
  for update
  to authenticated
  using (
    (select auth.uid()) = id
    and not public._is_current_employer_suspended()
    and not public._is_current_employer_deleted()
  )
  with check ((select auth.uid()) = id);

drop policy companies_select_own_employer on public.companies;
create policy companies_select_own_employer
  on public.companies
  for select
  to authenticated
  using (
    source = 'employer'
    and owner_employer_id = (select auth.uid())
    and not public._is_current_employer_deleted()
  );

drop policy companies_update_own_employer on public.companies;
create policy companies_update_own_employer
  on public.companies
  for update
  to authenticated
  using (
    source = 'employer'
    and owner_employer_id = (select auth.uid())
    and not public._is_current_employer_deleted()
  )
  with check (
    source = 'employer'
    and owner_employer_id = (select auth.uid())
  );

drop policy vacancies_select_own_employer on public.vacancies;
create policy vacancies_select_own_employer
  on public.vacancies
  for select
  to authenticated
  using (
    source = 'employer'
    and employer_profile_id = (select auth.uid())
    and not public._is_current_employer_deleted()
  );

drop policy vacancy_language_requirements_select_own_employer on public.vacancy_language_requirements;
create policy vacancy_language_requirements_select_own_employer
  on public.vacancy_language_requirements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vacancies v
      where v.id = vacancy_language_requirements.vacancy_id
        and v.source = 'employer'
        and v.employer_profile_id = (select auth.uid())
    )
    and not public._is_current_employer_deleted()
  );

drop policy vacancy_lifecycle_events_select_owner on public.vacancy_lifecycle_events;
create policy vacancy_lifecycle_events_select_owner
  on public.vacancy_lifecycle_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vacancies v
      where v.id = vacancy_lifecycle_events.vacancy_id
        and v.source = 'employer'
        and v.employer_profile_id = (select auth.uid())
    )
    and not public._is_current_employer_deleted()
  );

-- =============================================================================
-- 5. Deleted-account SECURITY DEFINER RPC composition (D-080 §3.3)
-- =============================================================================
-- Every candidate/employer self-service RPC identified in the full
-- inventory (docs/45 §3.3, re-verified against live SQL for PR 8.2). Each
-- gate reuses the exact structured "unavailable"/"incomplete"/existing
-- status vocabulary the function already returns for other unauthorized
-- states — no new client-visible enum value is introduced, matching this
-- repository's no-existence-oracle discipline (a deleted account is
-- indistinguishable from an incomplete/suspended one to the caller).

-- 5.1 Candidate onboarding completion
create or replace function public.complete_candidate_onboarding()
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  profile public.candidate_profiles%rowtype;
  first_group text;
  prior_completed_at timestamptz;
  prior_declared_at timestamptz;
begin
  if uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  select * into profile
  from public.candidate_profiles
  where id = uid
  for update;

  if not found or profile.account_deleted_at is not null then
    return jsonb_build_object('status', 'missing_profile');
  end if;

  prior_completed_at := profile.onboarding_completed_at;
  prior_declared_at := profile.work_authorisation_declared_at;

  first_group := public._profile_first_incomplete_group(
    profile.id,
    profile.german_comfort,
    profile.work_authorisation_declared,
    profile.city,
    profile.travel_radius_minutes,
    profile.job_categories,
    profile.available_from,
    profile.employment_types,
    profile.shift_preferences
  );

  if first_group is not null then
    if profile.onboarding_completed_at is not null then
      update public.candidate_profiles
      set
        onboarding_completed_at = null,
        updated_at = now()
      where id = uid;
    end if;

    return jsonb_build_object(
      'status', 'incomplete',
      'first_incomplete_group', first_group
    );
  end if;

  if prior_completed_at is not null then
    if prior_declared_at is null
       and profile.work_authorisation_declared is true
    then
      update public.candidate_profiles
      set
        work_authorisation_declared_at = now(),
        updated_at = now()
      where id = uid;
    end if;

    return jsonb_build_object(
      'status', 'completed',
      'already_complete', true
    );
  end if;

  update public.candidate_profiles
  set
    work_authorisation_declared_at = coalesce(
      work_authorisation_declared_at,
      case
        when work_authorisation_declared is true then now()
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

-- 5.2 Candidate matching
create or replace function public.resolve_current_candidate_vacancy_match(p_vacancy_id uuid)
returns table(status text, eligible boolean, missing_requirements text[])
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  candidate public.candidate_profiles%rowtype;
  ts timestamptz := now();
begin
  if uid is null then
    return query select 'unavailable'::text, null::boolean, null::text[];
    return;
  end if;

  select * into candidate
  from public.candidate_profiles
  where id = uid;

  if not found
     or candidate.onboarding_completed_at is null
     or candidate.account_deleted_at is not null
  then
    return query select 'incomplete'::text, null::boolean, null::text[];
    return;
  end if;

  if p_vacancy_id is null
     or not public.is_vacancy_effectively_public(p_vacancy_id, ts)
  then
    return query select 'unavailable'::text, null::boolean, null::text[];
    return;
  end if;

  return query
    select
      case when e.eligible then 'eligible' else 'ineligible' end,
      e.eligible,
      e.missing_requirements
    from public._evaluate_candidate_vacancy_eligibility(uid, p_vacancy_id, ts) e;
end;
$$;

create or replace function public.list_current_candidate_vacancy_matches()
returns table(vacancy_id uuid, title text, description text, job_category text, public_locality text, workplace_type text, work_frequency text, cv_required boolean, interview_english_ok boolean, source text, employer_type text, employer_display_name text, company_name text, website text, published_at timestamptz, expires_at timestamptz, eligible boolean, missing_requirements text[])
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  candidate public.candidate_profiles%rowtype;
  ts timestamptz := now();
begin
  if uid is null then
    return;
  end if;

  select * into candidate
  from public.candidate_profiles
  where id = uid;

  if not found
     or candidate.onboarding_completed_at is null
     or candidate.account_deleted_at is not null
  then
    return;
  end if;

  return query
    select
      v.id,
      v.title,
      v.description,
      v.job_category,
      v.public_locality,
      v.workplace_type,
      v.work_frequency,
      v.cv_required,
      v.interview_english_ok,
      v.source,
      ep.employer_type,
      coalesce(c.name, ep.display_name),
      c.name,
      ep.website,
      v.published_at,
      v.expires_at,
      ev.eligible,
      ev.missing_requirements
    from public.vacancies v
    left join public.employer_profiles ep on ep.id = v.employer_profile_id
    left join public.companies c on c.id = v.company_id
    cross join lateral public._evaluate_candidate_vacancy_eligibility(uid, v.id, ts) ev
    where public.is_vacancy_effectively_public(v.id, ts)
      and ev.eligible
    order by v.published_at desc, v.id asc;
end;
$$;

-- 5.3 Candidate application submission and history
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
  v_eligible boolean;
  v_missing text[];
begin
  if uid is null or p_vacancy_id is null then
    return jsonb_build_object('result', 'unavailable');
  end if;

  select * into profile
  from public.candidate_profiles
  where id = uid
  for update;
  if not found
     or profile.onboarding_completed_at is null
     or profile.account_deleted_at is not null
  then
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

  select e.eligible, e.missing_requirements
  into v_eligible, v_missing
  from public._evaluate_candidate_vacancy_eligibility(uid, p_vacancy_id, ts) e;

  if v_eligible is not true then
    return jsonb_build_object(
      'result', 'ineligible',
      'missing_requirements', to_jsonb(coalesce(v_missing, '{}'::text[]))
    );
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
    'job_category', vacancy.job_category,
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

    insert into public.application_status_history (
      application_id, from_status, to_status, actor_user_id, actor_role, reason, occurred_at
    ) values (
      new_id, null, 'submitted', uid, 'candidate', null, ts
    );

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

create or replace function public.list_current_candidate_application_status_history(p_application_id uuid)
returns table(to_status text, occurred_at timestamptz)
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or public._is_candidate_deleted(uid) then
    return;
  end if;

  if not exists (
    select 1
    from public.applications a
    where a.id = p_application_id
      and a.candidate_id = uid
  ) then
    return;
  end if;

  return query
  select h.to_status, h.occurred_at
  from public.application_status_history h
  where h.application_id = p_application_id
  order by h.occurred_at asc, h.id asc;
end;
$$;

-- 5.4 Employer onboarding completion
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

  if public._is_employer_suspended(uid) or public._is_employer_deleted(uid) then
    return jsonb_build_object('status', 'unavailable');
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

-- 5.5 Employer verification request
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
  if public._is_employer_suspended(uid) or public._is_employer_deleted(uid) then
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

-- 5.6 Employer/company bootstrap
create or replace function public.bootstrap_organisation_employer(
  p_display_name text,
  p_organisation_legal_name text,
  p_berlin_locality text,
  p_company_name text,
  p_company_slug text,
  p_website text default null::text,
  p_phone text default null::text
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
    if public._is_employer_suspended(uid) or public._is_employer_deleted(uid) then
      return jsonb_build_object('status', 'unavailable');
    end if;

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
    -- No existing profile: structurally cannot be suspended or deleted
    -- (D-072/D-080 — an employer_suspension row, and account_deleted_at,
    -- can only reference an already-existing employer_profile_id), so
    -- this branch is deliberately unguarded.
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

-- 5.7 Employer draft vacancy mutations
create or replace function public.create_employer_vacancy_draft(
  p_title text,
  p_job_category text,
  p_public_locality text,
  p_summary text default null::text,
  p_description text default null::text,
  p_employment_types text[] default '{}'::text[],
  p_shift_requirements text[] default '{}'::text[],
  p_german_requirement text default 'none'::text,
  p_workplace_type text default null::text,
  p_work_frequency text default null::text,
  p_salary_amount_cents integer default null::integer,
  p_salary_period text default null::text,
  p_cv_required boolean default null::boolean,
  p_interview_english_ok boolean default null::boolean,
  p_experience_notes text default null::text,
  p_available_from date default null::date
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

  if public._is_employer_suspended(uid) or public._is_employer_deleted(uid) then
    return jsonb_build_object('status', 'unavailable');
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
  if public._is_employer_suspended(uid) or public._is_employer_deleted(uid) then
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
     or public._is_employer_deleted(uid)
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

create or replace function public.update_employer_vacancy_draft(
  p_vacancy_id uuid,
  p_title text default null::text,
  p_job_category text default null::text,
  p_public_locality text default null::text,
  p_summary text default null::text,
  p_description text default null::text,
  p_employment_types text[] default null::text[],
  p_shift_requirements text[] default null::text[],
  p_german_requirement text default null::text,
  p_workplace_type text default null::text,
  p_work_frequency text default null::text,
  p_salary_amount_cents integer default null::integer,
  p_salary_period text default null::text,
  p_clear_salary boolean default false,
  p_cv_required boolean default null::boolean,
  p_interview_english_ok boolean default null::boolean,
  p_experience_notes text default null::text,
  p_available_from date default null::date,
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

-- 5.8 Shared owned-draft-vacancy helper (covers update_employer_vacancy_draft
-- and replace_employer_vacancy_languages via one gate)
create or replace function public._employer_owned_draft_vacancy(p_uid uuid, p_vacancy_id uuid)
returns vacancies
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
     or public._is_employer_suspended(p_uid)
     or public._is_employer_deleted(p_uid)
  then
    return null;
  end if;
  return vacancy;
end;
$$;

create or replace function public.replace_employer_vacancy_languages(p_vacancy_id uuid, p_languages jsonb default '[]'::jsonb)
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

-- 5.9 Publish, and the shared internal lifecycle transition (covers pause/
-- resume/fill/withdraw/materialize_expiry/renew_to_draft via one gate)
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
  if public._is_employer_suspended(uid) or public._is_employer_deleted(uid) then
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

create or replace function public._transition_employer_vacancy(p_vacancy_id uuid, p_action text, p_expires_at timestamptz default null::timestamptz)
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
  if public._is_employer_suspended(uid) or public._is_employer_deleted(uid) then
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

-- 5.10 Employer applicant review
-- Both functions' RETURNS shape gains new fields (candidate_deleted on the
-- list row; candidate_deleted on the detail jsonb, which needs no DROP
-- since jsonb is an opaque return type). DROP is required only for
-- list_current_employer_applications, whose RETURNS TABLE column list
-- changes — CREATE OR REPLACE FUNCTION cannot alter an existing function's
-- return type.
drop function if exists public.list_current_employer_applications(uuid, text);

create function public.list_current_employer_applications(p_vacancy_id uuid default null::uuid, p_status text default null::text)
returns table(application_id uuid, vacancy_id uuid, vacancy_title text, candidate_deleted boolean, candidate_display_name text, job_category text, german_comfort text, available_from text, current_status text, submitted_at timestamptz, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  employer public.employer_profiles%rowtype;
begin
  if uid is null then
    return;
  end if;

  select * into employer from public.employer_profiles where id = uid;
  if not found
     or employer.onboarding_completed_at is null
     or public._is_employer_suspended(uid)
     or public._is_employer_deleted(uid)
  then
    return;
  end if;

  if p_status is not null
     and p_status not in ('submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected')
  then
    return;
  end if;

  return query
  select
    a.id,
    a.vacancy_id,
    v.title,
    coalesce((a.candidate_snapshot ->> 'deleted')::boolean, false),
    case
      when coalesce((a.candidate_snapshot ->> 'deleted')::boolean, false) then 'Deleted candidate'
      else a.candidate_snapshot ->> 'display_name'
    end,
    case
      when coalesce((a.candidate_snapshot ->> 'deleted')::boolean, false) then null
      else a.candidate_snapshot ->> 'job_category'
    end,
    case
      when coalesce((a.candidate_snapshot ->> 'deleted')::boolean, false) then null
      else a.candidate_snapshot ->> 'german_comfort'
    end,
    case
      when coalesce((a.candidate_snapshot ->> 'deleted')::boolean, false) then null
      else a.candidate_snapshot ->> 'available_from'
    end,
    a.status,
    a.submitted_at,
    a.updated_at
  from public.applications a
  join public.vacancies v on v.id = a.vacancy_id
  where v.source = 'employer'
    and v.employer_profile_id = uid
    and (p_vacancy_id is null or a.vacancy_id = p_vacancy_id)
    and (p_status is null or a.status = p_status)
  order by a.submitted_at desc, a.id asc;
end;
$$;

-- The DROP above removed the function's prior grants entirely; re-apply the
-- exact same grant this function has always had (D-070/PR 6.1) — the DROP
-- was needed only to change RETURNS TABLE's column list, not to change who
-- may call it.
revoke all on function public.list_current_employer_applications(uuid, text) from public, anon;
grant execute on function public.list_current_employer_applications(uuid, text) to authenticated;

create or replace function public.get_current_employer_application(p_application_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  employer public.employer_profiles%rowtype;
  app public.applications%rowtype;
  vacancy_title text;
  allowed text[];
  history_json jsonb;
  is_deleted boolean;
begin
  if uid is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select * into employer from public.employer_profiles where id = uid;
  if not found
     or employer.onboarding_completed_at is null
     or public._is_employer_suspended(uid)
     or public._is_employer_deleted(uid)
  then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select a.* into app
  from public.applications a
  join public.vacancies v on v.id = a.vacancy_id
  where a.id = p_application_id
    and v.source = 'employer'
    and v.employer_profile_id = uid;

  if not found then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select v.title into vacancy_title
  from public.vacancies v
  where v.id = app.vacancy_id;

  allowed := public._application_allowed_transitions(app.status);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'from_status', h.from_status,
        'to_status', h.to_status,
        'reason', h.reason,
        'occurred_at', h.occurred_at
      )
      order by h.occurred_at, h.id
    ),
    '[]'::jsonb
  )
  into history_json
  from public.application_status_history h
  where h.application_id = app.id;

  is_deleted := coalesce((app.candidate_snapshot ->> 'deleted')::boolean, false);

  if is_deleted then
    -- D-087: a deleted candidate's application is frozen — the detail RPC
    -- must never advertise a transition that
    -- transition_current_employer_application_status will reject, so this
    -- branch always reports an empty array regardless of app.status.
    return jsonb_build_object(
      'status', 'ready',
      'application_id', app.id,
      'vacancy_id', app.vacancy_id,
      'vacancy_title', vacancy_title,
      'submitted_at', app.submitted_at,
      'current_status', app.status,
      'candidate_deleted', true,
      'candidate_display_name', 'Deleted candidate',
      'allowed_transitions', '[]'::jsonb,
      'status_history', history_json
    );
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'application_id', app.id,
    'vacancy_id', app.vacancy_id,
    'vacancy_title', vacancy_title,
    'submitted_at', app.submitted_at,
    'current_status', app.status,
    'candidate_deleted', false,
    'candidate_display_name', app.candidate_snapshot ->> 'display_name',
    'matched_job_category', app.candidate_snapshot ->> 'job_category',
    'german_comfort', app.candidate_snapshot ->> 'german_comfort',
    'languages', coalesce(app.candidate_snapshot -> 'languages', '[]'::jsonb),
    'work_authorisation_declared', app.candidate_snapshot -> 'work_authorisation_declared',
    'available_from', app.candidate_snapshot ->> 'available_from',
    'employment_types', coalesce(app.candidate_snapshot -> 'employment_types', '[]'::jsonb),
    'shift_preferences', coalesce(app.candidate_snapshot -> 'shift_preferences', '[]'::jsonb),
    'allowed_transitions', to_jsonb(allowed),
    'status_history', history_json
  );
end;
$$;

create or replace function public.transition_current_employer_application_status(p_application_id uuid, p_target_status text, p_reason text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  employer public.employer_profiles%rowtype;
  app public.applications%rowtype;
  ts timestamptz := clock_timestamp();
  normalized_reason text;
  allowed text[];
begin
  if uid is null then
    return jsonb_build_object('result', 'unavailable');
  end if;

  select * into employer from public.employer_profiles where id = uid;
  if not found
     or employer.onboarding_completed_at is null
     or public._is_employer_suspended(uid)
     or public._is_employer_deleted(uid)
  then
    return jsonb_build_object('result', 'employer_unavailable');
  end if;

  if p_target_status not in ('submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected') then
    return jsonb_build_object('result', 'invalid_transition');
  end if;

  -- Ownership check first (no lock) — vacancy ownership is immutable once
  -- set (D-070/build-plan audit), so there is no race between this check
  -- and the row lock taken below on `applications` alone. D-087: the same
  -- check also denies a deleted candidate's application here, before any
  -- lock/mutation — candidate_profiles.account_deleted_at is the sole
  -- authoritative signal (never candidate_snapshot's presentation-only
  -- 'deleted' marker), and the existing 'unavailable' result already used
  -- for cross-employer/nonexistent applications is reused rather than
  -- introducing a new result variant.
  if not exists (
    select 1
    from public.applications a
    join public.vacancies v on v.id = a.vacancy_id
    join public.candidate_profiles cp on cp.id = a.candidate_id
    where a.id = p_application_id
      and v.source = 'employer'
      and v.employer_profile_id = uid
      and cp.account_deleted_at is null
  ) then
    return jsonb_build_object('result', 'unavailable');
  end if;

  select * into app
  from public.applications
  where id = p_application_id
  for update;

  normalized_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if normalized_reason is not null and p_target_status <> 'rejected' then
    return jsonb_build_object('result', 'invalid_transition');
  end if;
  if normalized_reason is not null and char_length(normalized_reason) > 1000 then
    return jsonb_build_object('result', 'invalid_transition');
  end if;

  if app.status = p_target_status then
    return jsonb_build_object(
      'result', 'already_in_state',
      'application_id', app.id,
      'current_status', app.status
    );
  end if;

  allowed := public._application_allowed_transitions(app.status);
  if not (p_target_status = any(allowed)) then
    return jsonb_build_object('result', 'invalid_transition');
  end if;

  insert into public.application_status_history (
    application_id, from_status, to_status, actor_user_id, actor_role, reason, occurred_at
  ) values (
    app.id, app.status, p_target_status, uid, 'employer', normalized_reason, ts
  );

  update public.applications
  set status = p_target_status, updated_at = ts
  where id = app.id;

  return jsonb_build_object(
    'result', 'updated',
    'application_id', app.id,
    'previous_status', app.status,
    'current_status', p_target_status,
    'occurred_at', ts
  );
end;
$$;

-- =============================================================================
-- 6. Effective-public deleted-employer gate (PART F) — defense in depth
--    alongside the mandatory vacancy withdrawal performed by
--    _anonymize_employer_domain (§8). A deleted employer must never be
--    considered effectively public even under inconsistent historical
--    state; this mirrors the existing suspension/moderation exclusions
--    exactly, adding one more `not exists`-style condition.
-- =============================================================================

create or replace function public.is_vacancy_effectively_public(p_vacancy_id uuid, p_at timestamptz default now())
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
      and ep.account_deleted_at is null
      and not exists (
        select 1
        from public.employer_suspension es
        where es.employer_profile_id = v.employer_profile_id
      )
      and not exists (
        select 1
        from public.vacancy_moderation vm
        where vm.vacancy_id = v.id
      )
    from public.vacancies v
    left join public.employer_profiles ep on ep.id = v.employer_profile_id
    left join public.companies c on c.id = v.company_id
    where v.id = p_vacancy_id
  ), false);
$$;

-- =============================================================================
-- 7. deletion_requests table (D-081, D-085)
-- =============================================================================
-- Scoped by user_id — the whole Stint account, per D-085 — never a
-- caller-selected role. No account_role column: D-085 explicitly prefers
-- omission over a stored-but-non-authoritative descriptor.

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  status text not null default 'pending',
  requested_at timestamptz not null default clock_timestamp(),
  processing_started_at timestamptz null,
  domain_scrubbed_at timestamptz null,
  auth_deleted_at timestamptz null,
  completed_at timestamptz null,
  failed_at timestamptz null,
  failure_code text null,
  updated_at timestamptz not null default clock_timestamp(),
  constraint deletion_requests_status_chk
    check (status in ('pending', 'processing', 'completed', 'failed')),
  constraint deletion_requests_processing_started_chk
    check (status = 'pending' or processing_started_at is not null),
  constraint deletion_requests_domain_scrub_order_chk
    check (domain_scrubbed_at is null or domain_scrubbed_at >= requested_at),
  constraint deletion_requests_auth_deleted_requires_scrub_chk
    check (auth_deleted_at is null or domain_scrubbed_at is not null),
  constraint deletion_requests_completed_requires_evidence_chk
    check (
      status <> 'completed'
      or (domain_scrubbed_at is not null and auth_deleted_at is not null)
    ),
  constraint deletion_requests_completed_at_chk
    check ((status = 'completed') = (completed_at is not null)),
  constraint deletion_requests_failed_at_chk
    check ((status = 'failed') = (failed_at is not null)),
  constraint deletion_requests_failure_code_chk
    check (failure_code is null or char_length(btrim(failure_code)) > 0)
);

comment on table public.deletion_requests is
  'D-081/D-085 whole-account deletion request state machine. user_id is the authoritative scope — the whole Stint account, never a caller-selected candidate/employer role. No direct authenticated/anon grant; RPC-mediated only (request_account_deletion, cancel_account_deletion_request for self-service; the processor-only _claim_deletion_request/_process_deletion_domain_scrub/_record_deletion_auth_evidence/_record_deletion_failure for privileged processing, callable only by service_role).';

create unique index deletion_requests_active_user_uidx
  on public.deletion_requests (user_id)
  where status in ('pending', 'processing');

create index deletion_requests_user_id_idx
  on public.deletion_requests (user_id);

alter table public.deletion_requests enable row level security;

revoke all on table public.deletion_requests from public, anon, authenticated;

-- =============================================================================
-- 8. Self-service request/cancel RPCs (D-081, D-085)
-- =============================================================================

create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  has_candidate boolean;
  has_employer boolean;
  candidate_deleted boolean := false;
  employer_deleted boolean := false;
  existing public.deletion_requests%rowtype;
  new_id uuid;
begin
  if uid is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select exists(select 1 from public.candidate_profiles where id = uid) into has_candidate;
  select exists(select 1 from public.employer_profiles where id = uid) into has_employer;

  if not has_candidate and not has_employer then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if has_candidate then
    select (account_deleted_at is not null) into candidate_deleted
    from public.candidate_profiles where id = uid;
  end if;
  if has_employer then
    select (account_deleted_at is not null) into employer_deleted
    from public.employer_profiles where id = uid;
  end if;

  if (has_candidate and candidate_deleted) or (has_employer and employer_deleted) then
    return jsonb_build_object('status', 'already_completed');
  end if;

  select * into existing
  from public.deletion_requests
  where user_id = uid
    and status in ('pending', 'processing')
  order by requested_at desc
  limit 1;

  if found then
    if existing.status = 'pending' then
      return jsonb_build_object('status', 'existing_pending', 'request_id', existing.id);
    else
      return jsonb_build_object('status', 'already_processing', 'request_id', existing.id);
    end if;
  end if;

  begin
    insert into public.deletion_requests (user_id, status)
    values (uid, 'pending')
    returning id into new_id;
    return jsonb_build_object('status', 'created', 'request_id', new_id);
  exception
    when unique_violation then
      select id into new_id
      from public.deletion_requests
      where user_id = uid and status in ('pending', 'processing')
      order by requested_at desc
      limit 1;
      return jsonb_build_object('status', 'existing_pending', 'request_id', new_id);
  end;
end;
$$;

comment on function public.request_account_deletion() is
  'D-081/D-085 self-service deletion request. Target is always auth.uid() — never a caller-supplied user ID or role. Idempotent: a duplicate call while pending/processing returns the existing request rather than erroring or creating a second row (enforced declaratively by deletion_requests_active_user_uidx, defensively by the unique_violation handler above).';

revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

create or replace function public.cancel_account_deletion_request()
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  deleted_id uuid;
begin
  if uid is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  delete from public.deletion_requests
  where user_id = uid
    and status = 'pending'
  returning id into deleted_id;

  if deleted_id is null then
    return jsonb_build_object('status', 'not_cancellable');
  end if;

  return jsonb_build_object('status', 'cancelled', 'request_id', deleted_id);
end;
$$;

comment on function public.cancel_account_deletion_request() is
  'D-081 pending-only cancellation. Deletes the pending request row outright (D-081''s preferred representation — keeps the status enum closed at pending/processing/completed/failed, immediately frees the active-request uniqueness constraint). Only the caller''s own row, only while status=pending; a processing/completed/failed request cannot be cancelled by any authenticated path.';

revoke all on function public.cancel_account_deletion_request() from public, anon;
grant execute on function public.cancel_account_deletion_request() to authenticated;

-- =============================================================================
-- 9. Private domain-anonymization helpers (D-078, D-079, D-082, D-086)
-- =============================================================================
-- Neither is independently authenticated/anon-callable — both accept an
-- explicit target id and timestamp rather than deriving auth.uid(), and
-- are invoked only from _process_deletion_domain_scrub (§10) inside the
-- processor's already-claimed-request transaction.

create or replace function public._withdraw_vacancy_for_deletion(p_vacancy_id uuid, p_employer_profile_id uuid, p_ts timestamptz)
returns void
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  vacancy public.vacancies%rowtype;
begin
  select * into vacancy from public.vacancies where id = p_vacancy_id for update;
  if not found or vacancy.employer_profile_id <> p_employer_profile_id then
    return;
  end if;
  if vacancy.publication_state not in ('published', 'paused') then
    return;
  end if;
  update public.vacancies
  set publication_state = 'withdrawn', withdrawn_at = p_ts, updated_at = p_ts
  where id = vacancy.id;
  perform public._append_vacancy_lifecycle_event(vacancy.id, 'withdrawn', p_employer_profile_id, p_ts);
end;
$$;

comment on function public._withdraw_vacancy_for_deletion(uuid, uuid, timestamptz) is
  'Internal-only vacancy withdrawal for account-deletion processing. Reproduces _transition_employer_vacancy''s withdraw branch exactly, but takes an explicit target employer id instead of deriving auth.uid() — the processor context has no caller session. Lifecycle-event actor is the deleted employer''s own id (their own account action being finalized), never service_role/an operator/another user.';

revoke all on function public._withdraw_vacancy_for_deletion(uuid, uuid, timestamptz) from public, anon, authenticated;

create or replace function public._anonymize_candidate_domain(p_candidate_id uuid, p_ts timestamptz)
returns void
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
begin
  perform set_config('stint.allow_account_deletion_scrub', '1', true);

  update public.candidate_profiles
  set
    account_deleted_at = p_ts,
    display_name = 'Deleted candidate',
    german_comfort = null,
    work_authorisation_declared = null,
    work_authorisation_declared_at = null,
    city = null,
    travel_radius_minutes = null,
    available_from = null,
    job_categories = '{}'::text[],
    employment_types = '{}'::text[],
    shift_preferences = '{}'::text[],
    updated_at = p_ts
  where id = p_candidate_id;

  delete from public.candidate_languages where candidate_id = p_candidate_id;

  update public.applications
  set
    candidate_snapshot = jsonb_build_object('deleted', true),
    updated_at = p_ts
  where candidate_id = p_candidate_id;
end;
$$;

comment on function public._anonymize_candidate_domain(uuid, timestamptz) is
  'D-078 candidate anonymization. candidate_profiles preserved as tombstone (account_deleted_at set, identifying fields cleared/placeholder, onboarding_completed_at/created_at left untouched by this function and protected from the essentials trigger''s auto-clear via stint.allow_account_deletion_scrub). candidate_languages rows deleted outright. Every applications.candidate_snapshot replaced with the exact minimal tombstone {"deleted": true} — no fabricated candidate attributes (job_category/german_comfort/employment_types/shift_preferences/languages/available_from/work_authorisation_declared/display_name are never written into this JSON). applications.snapshot_version remains 1 (unchanged) — the deleted marker does not need its own JSON version key. candidateSnapshotV1Schema and the employer list/detail schemas were corrected (not the SQL) to accept this shape as a distinct, explicit deleted variant via a discriminated union — the employer applicant list/detail views detect it via this exact "deleted" key and render a truthful "Deleted candidate" label, never a fabricated live attribute. applications/application_status_history rows and vacancy_snapshot are never touched by this function.';

revoke all on function public._anonymize_candidate_domain(uuid, timestamptz) from public, anon, authenticated;

create or replace function public._anonymize_employer_domain(p_employer_id uuid, p_ts timestamptz)
returns void
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  vac record;
begin
  perform set_config('stint.allow_account_deletion_scrub', '1', true);

  for vac in
    select id from public.vacancies
    where source = 'employer' and employer_profile_id = p_employer_id
  loop
    perform public._withdraw_vacancy_for_deletion(vac.id, p_employer_id, p_ts);
  end loop;

  update public.admin_audit_events
  set reason = '[redacted after account deletion]'
  where reason is not null
    and (
      (target_kind = 'employer' and target_id = p_employer_id)
      or (
        target_kind = 'vacancy'
        and target_id in (
          select id from public.vacancies
          where source = 'employer' and employer_profile_id = p_employer_id
        )
      )
    );

  delete from public.employer_suspension where employer_profile_id = p_employer_id;

  delete from public.vacancy_moderation
  where vacancy_id in (
    select id from public.vacancies
    where source = 'employer' and employer_profile_id = p_employer_id
  );

  update public.employer_profiles
  set
    account_deleted_at = p_ts,
    display_name = 'Deleted employer',
    berlin_locality = null,
    phone = null,
    website = null,
    organisation_legal_name = null,
    updated_at = p_ts
  where id = p_employer_id;

  update public.companies
  set
    name = 'Deleted company',
    slug = 'deleted-company-' || id::text,
    updated_at = p_ts
  where owner_employer_id = p_employer_id and source = 'employer';
end;
$$;

comment on function public._anonymize_employer_domain(uuid, timestamptz) is
  'D-079/D-082/D-086 employer anonymization. Order: (1) withdraw every owned published/paused vacancy via _withdraw_vacancy_for_deletion, so vacancy ids remain queryable by employer_profile_id unchanged throughout; (2) D-082 redact admin_audit_events.reason for rows targeting this employer or its vacancies, preserving id/event_type/target_kind/target_id/actor_user_id/occurred_at; (3) D-086 delete (not redact, not preserve) the current-state employer_suspension row and vacancy_moderation rows for owned vacancies — no unsuspend_employer/restore_vacancy call, no employer_unsuspended/vacancy_restored audit event; (4) employer_profiles preserved as tombstone; (5) owned organisation company preserved as tombstone with a deterministic deleted-company-<uuid> slug derived only from the company''s own immutable id. vacancies, vacancy_language_requirements, applications, and application_status_history are never written to, deleted, or cascaded by this function.';

revoke all on function public._anonymize_employer_domain(uuid, timestamptz) from public, anon, authenticated;

-- =============================================================================
-- 10. Processor-only claim/scrub/evidence/failure primitives (D-081, D-085)
-- =============================================================================
-- None of these four functions are granted to authenticated/anon — only
-- service_role's default schema privilege (unchanged by this migration,
-- matching admin_audit_events/employer_suspension/vacancy_moderation's own
-- service_role-default-access pattern) can execute them. PR 8.4's isolated
-- server-only processing module is the only intended caller.

create or replace function public._claim_deletion_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  claimed public.deletion_requests%rowtype;
  current public.deletion_requests%rowtype;
begin
  update public.deletion_requests
  set status = 'processing',
      processing_started_at = coalesce(processing_started_at, clock_timestamp()),
      failed_at = null,
      failure_code = null,
      updated_at = clock_timestamp()
  where id = p_request_id
    and status in ('pending', 'failed')
  returning * into claimed;

  if claimed.id is not null then
    return jsonb_build_object('status', 'claimed', 'request_id', claimed.id, 'user_id', claimed.user_id);
  end if;

  select * into current from public.deletion_requests where id = p_request_id;
  if current.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object('status', 'no_op', 'current_status', current.status);
end;
$$;

comment on function public._claim_deletion_request(uuid) is
  'D-081 row-locked/deterministic single-writer claim. The UPDATE ... WHERE status IN (''pending'',''failed'') itself is the concurrency guarantee: two concurrent claim attempts on the same row cannot both match under Postgres MVCC (the second sees the first''s already-updated status and matches zero rows). Claims from ''failed'' too, so a retry after a failed Auth step re-enters processing without a separate retry function. A completed/already-processing row is a deterministic no-op, never an error.';

revoke all on function public._claim_deletion_request(uuid) from public, anon, authenticated;

create or replace function public._process_deletion_domain_scrub(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  req public.deletion_requests%rowtype;
  target_uid uuid;
  has_candidate boolean;
  has_employer boolean;
  ts timestamptz := clock_timestamp();
begin
  select * into req from public.deletion_requests where id = p_request_id for update;
  if not found or req.status <> 'processing' then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if req.domain_scrubbed_at is not null then
    return jsonb_build_object('status', 'already_scrubbed', 'request_id', p_request_id);
  end if;

  target_uid := req.user_id;

  select exists(select 1 from public.candidate_profiles where id = target_uid) into has_candidate;
  select exists(select 1 from public.employer_profiles where id = target_uid) into has_employer;

  if not has_candidate and not has_employer then
    return jsonb_build_object('status', 'unavailable');
  end if;

  -- D-085: both capabilities anonymized inside this one transaction when
  -- both exist — never as two separately committed transactions.
  if has_candidate then
    perform public._anonymize_candidate_domain(target_uid, ts);
  end if;

  if has_employer then
    perform public._anonymize_employer_domain(target_uid, ts);
  end if;

  update public.deletion_requests
  set domain_scrubbed_at = ts, updated_at = ts
  where id = p_request_id;

  return jsonb_build_object('status', 'scrubbed', 'request_id', p_request_id);
end;
$$;

comment on function public._process_deletion_domain_scrub(uuid) is
  'D-081 phase 2/3. Accepts only a deletion_request_id, never candidate_id/employer_id/user_id/role — resolves request.user_id internally (D-085). Must be called only after _claim_deletion_request has transitioned the row to processing. Runs D-078 and/or D-079+D-082+D-086 anonymization for whichever profile(s) exist on the target identity inside this one function invocation''s transaction, then records domain_scrubbed_at — the durable evidence PR 8.4''s Auth-scrub step (phase 4) checks for before proceeding.';

revoke all on function public._process_deletion_domain_scrub(uuid) from public, anon, authenticated;

create or replace function public._record_deletion_auth_evidence(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  req public.deletion_requests%rowtype;
  ts timestamptz := clock_timestamp();
begin
  select * into req from public.deletion_requests where id = p_request_id for update;

  if not found or req.domain_scrubbed_at is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if req.status = 'completed' then
    return jsonb_build_object('status', 'completed', 'request_id', p_request_id);
  end if;

  update public.deletion_requests
  set auth_deleted_at = coalesce(auth_deleted_at, ts),
      completed_at = ts,
      status = 'completed',
      failure_code = null,
      failed_at = null,
      updated_at = ts
  where id = p_request_id;

  return jsonb_build_object('status', 'completed', 'request_id', p_request_id);
end;
$$;

comment on function public._record_deletion_auth_evidence(uuid) is
  'D-081 phase 5/6, and the reconciliation primitive for the Auth-succeeded-but-evidence-write-failed case in one function: idempotent (coalesce on auth_deleted_at, early-return once already completed), callable from ''processing'' or ''failed'' status as long as domain_scrubbed_at is already set, and requires no authentication from the deleted user — PR 8.4''s manual reconciliation path calls this same function again after independently re-confirming the Auth deletion via the Auth Admin API, rather than needing a second dedicated reconciliation function.';

revoke all on function public._record_deletion_auth_evidence(uuid) from public, anon, authenticated;

create or replace function public._record_deletion_failure(p_request_id uuid, p_failure_code text)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  ts timestamptz := clock_timestamp();
  updated_id uuid;
begin
  update public.deletion_requests
  set status = 'failed',
      failed_at = ts,
      failure_code = coalesce(nullif(btrim(p_failure_code), ''), 'unknown'),
      updated_at = ts
  where id = p_request_id
    and status = 'processing'
  returning id into updated_id;

  if updated_id is null then
    return jsonb_build_object('status', 'no_op');
  end if;

  return jsonb_build_object('status', 'failed', 'request_id', updated_id);
end;
$$;

comment on function public._record_deletion_failure(uuid, text) is
  'D-081 failure recording. Only transitions from processing — a fixed, generic, bounded failure_code is stored, never a raw Auth Admin API or Postgres error message (no internal-error-leakage). Claimable again via _claim_deletion_request (which accepts pending or failed).';

revoke all on function public._record_deletion_failure(uuid, text) from public, anon, authenticated;
