-- PR 7.2 — Admin moderation/audit database contract (D-072/D-073/D-074).
-- Additive migration (13th). Adds employer suspension, vacancy moderation,
-- and one general append-only administrative audit ledger, all reusing the
-- existing verification_operators / _is_active_verification_operator
-- authorization foundation from PR 5.2. No UI, no route work, no hosted
-- effects. See docs/41-43 for the accepted planning contract this
-- migration implements.

-- ---------------------------------------------------------------------------
-- 1. employer_suspension — current-state row. Row exists = suspended; row
-- absent = not suspended (locked representation; no nullable-column dual
-- representation). Real FK to employer_profiles, ON DELETE CASCADE, because
-- this is current state tied to a still-existing row, not durable history.
-- ---------------------------------------------------------------------------

create table public.employer_suspension (
  employer_profile_id uuid primary key
    references public.employer_profiles (id) on delete cascade,
  suspended_at timestamptz not null default clock_timestamp(),
  suspended_by uuid not null references auth.users (id),
  suspended_reason text not null,
  updated_at timestamptz not null default clock_timestamp(),
  constraint employer_suspension_reason_chk
    check (
      suspended_reason = btrim(suspended_reason)
      and char_length(suspended_reason) between 1 and 500
    )
);

comment on table public.employer_suspension is
  'PR 7.2 (D-072): current-state employer safety hold. Row presence is the suspended state; the row carries the most recent suspend reason/actor/timestamp for operator display only. Permanent history lives in admin_audit_events. Zero ordinary grant — RPC-mediated only.';

alter table public.employer_suspension enable row level security;
revoke all on table public.employer_suspension from public, anon, authenticated;
grant all on table public.employer_suspension to service_role;

-- ---------------------------------------------------------------------------
-- 2. vacancy_moderation — current-state row, same representation/grant
-- convention as employer_suspension. Real FK to vacancies, ON DELETE CASCADE.
-- ---------------------------------------------------------------------------

create table public.vacancy_moderation (
  vacancy_id uuid primary key
    references public.vacancies (id) on delete cascade,
  moderated_at timestamptz not null default clock_timestamp(),
  moderated_by uuid not null references auth.users (id),
  moderated_reason text not null,
  updated_at timestamptz not null default clock_timestamp(),
  constraint vacancy_moderation_reason_chk
    check (
      moderated_reason = btrim(moderated_reason)
      and char_length(moderated_reason) between 1 and 500
    )
);

comment on table public.vacancy_moderation is
  'PR 7.2 (D-073): current-state vacancy safety hold, independent of publication_state. Row presence is the moderated state. Reason/actor are operator-only, never employer/candidate-readable. Permanent history lives in admin_audit_events. Zero ordinary grant — RPC-mediated only.';

alter table public.vacancy_moderation enable row level security;
revoke all on table public.vacancy_moderation from public, anon, authenticated;
grant all on table public.vacancy_moderation to service_role;

-- ---------------------------------------------------------------------------
-- 3. admin_audit_events — general append-only ledger (D-074). event_type is
-- the closed action discriminator; target_kind is a second, independently
-- bounded enum — not derived from event_type by string matching, and their
-- legal pairing is enforced by a same-row CHECK (both columns live in the
-- same row, so this is directly declarable, unlike target_id existence).
--
-- target_id is a plain uuid with NO polymorphic FK and NO cross-table CHECK
-- — PostgreSQL cannot express a cross-table existence constraint. Integrity
-- is procedural: every audit-producing RPC below resolves and row-locks its
-- target before writing the event, target_kind is hard-coded per RPC (never
-- caller-supplied), and there is no generic client-callable "append an
-- audit event" RPC — every row is a side effect of a specific, already-
-- authorized domain RPC. Proven behaviorally by pgTAP (29_*), not
-- declaratively.
--
-- No metadata column: none of the seven accepted event types requires
-- structured extra data beyond reason/actor/timestamp, so the column is
-- omitted entirely rather than added speculatively.
--
-- actor_user_id has NO explicit ON DELETE clause (defaults to NO ACTION),
-- matching the existing repository convention for every other actor FK
-- (verification_reviewed_by, vacancy_lifecycle_events.actor_user_id,
-- application_status_history.actor_user_id) — deleting an auth.users row
-- that authored audit history is blocked rather than silently cascading or
-- nulling it out, so admin_audit_events can never lose its actor via
-- operator-account deletion.
--
-- No ON DELETE CASCADE from target_id to any domain table (it cannot be a
-- real FK at all, being polymorphic) — audit history is retained even if
-- the employer/vacancy row it concerns is later deleted. Slice 8 must
-- separately reconcile this with account-deletion/GDPR retention
-- requirements; this migration does not decide that.
-- ---------------------------------------------------------------------------

create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  target_kind text not null,
  target_id uuid not null,
  actor_user_id uuid not null references auth.users (id),
  occurred_at timestamptz not null default clock_timestamp(),
  reason text,
  constraint admin_audit_events_event_type_chk
    check (event_type in (
      'employer_suspended',
      'employer_unsuspended',
      'vacancy_moderated',
      'vacancy_restored',
      'verification_approved',
      'verification_rejected',
      'verification_revoked'
    )),
  constraint admin_audit_events_target_kind_chk
    check (target_kind in ('employer', 'vacancy')),
  constraint admin_audit_events_event_target_kind_pairing_chk
    check (
      (
        event_type in (
          'employer_suspended',
          'employer_unsuspended',
          'verification_approved',
          'verification_rejected',
          'verification_revoked'
        )
        and target_kind = 'employer'
      )
      or (
        event_type in ('vacancy_moderated', 'vacancy_restored')
        and target_kind = 'vacancy'
      )
    ),
  constraint admin_audit_events_reason_chk
    check (
      reason is null
      or (reason = btrim(reason) and char_length(reason) between 1 and 500)
    ),
  constraint admin_audit_events_punitive_reason_required_chk
    check (
      event_type not in (
        'employer_suspended',
        'vacancy_moderated',
        'verification_rejected',
        'verification_revoked'
      )
      or reason is not null
    )
);

comment on table public.admin_audit_events is
  'PR 7.2 (D-074): general append-only administrative audit ledger. event_type/target_kind pairing is declaratively CHECK-constrained (same-row); target_id existence is procedural (RPC-boundary-enforced, no polymorphic FK/cross-table CHECK). Zero ordinary grant, RPC-mediated only, no ON DELETE CASCADE from target_id to any domain table.';

comment on column public.admin_audit_events.target_id is
  'employer_profiles.id or vacancies.id depending on target_kind. Not a foreign key (polymorphic) — existence is guaranteed procedurally by the writing RPC having already resolved/locked the row, never by a database constraint.';

create index admin_audit_events_target_occurred_idx
  on public.admin_audit_events (target_kind, target_id, occurred_at desc, id desc);

alter table public.admin_audit_events enable row level security;
revoke all on table public.admin_audit_events from public, anon, authenticated;
grant all on table public.admin_audit_events to service_role;

-- ---------------------------------------------------------------------------
-- 4. Internal helpers. _is_employer_suspended, _is_vacancy_moderated, and
-- _append_admin_audit_event carry no anon/authenticated grant at all — every
-- caller is itself a SECURITY DEFINER function body (privilege-checking runs
-- as the enclosing function's owner for nested calls, so no explicit grant
-- is needed there). In particular, _is_employer_suspended takes an
-- arbitrary caller-supplied employer id: it must never be authenticated-
-- executable directly, or any authenticated user could probe whether an
-- arbitrary employer is currently suspended — a real information-disclosure
-- oracle, not merely an internal-helper convention.
--
-- employer_profiles_update_own's RLS policy predicate (section 6) still
-- needs to ask this question, but only about the *caller's own* row. An RLS
-- policy predicate is evaluated under the querying role itself
-- (authenticated) — PostgreSQL does not implicitly elevate policy
-- expressions — so a raw subquery against employer_suspension there fails
-- with "permission denied for table employer_suspension" (proven while
-- writing this migration). _is_current_employer_suspended() below is the
-- narrow fix: zero arguments, identity derived exclusively from auth.uid(),
-- SECURITY DEFINER so its body can read the zero-grant table, and granted
-- EXECUTE to authenticated only because RLS evaluation requires it — never
-- exposing another employer's state, since there is no id parameter to
-- supply one with.
-- ---------------------------------------------------------------------------

create or replace function public._is_employer_suspended(p_employer_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select exists (
    select 1
    from public.employer_suspension es
    where es.employer_profile_id = p_employer_profile_id
  );
$$;

comment on function public._is_employer_suspended(uuid) is
  'Fully internal arbitrary-id suspension lookup. Never authenticated/anon-executable — an authenticated user must not be able to probe an arbitrary employer''s suspension state. Called only from within other SECURITY DEFINER function bodies (mutation RPCs, Slice 6 review RPCs, _is_current_employer_suspended below), never from an RLS policy predicate directly.';

revoke all on function public._is_employer_suspended(uuid) from public, anon, authenticated;

-- Self-derived, zero-argument. The only helper the employer_profiles_update_own
-- RLS policy is allowed to call, and the only one of this pair granted to
-- authenticated — it exposes exclusively the calling session's own boolean
-- suspension state, with no id parameter through which another employer's
-- state could ever be requested.
create or replace function public._is_current_employer_suspended()
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select public._is_employer_suspended(auth.uid());
$$;

comment on function public._is_current_employer_suspended() is
  'RLS-support helper: zero arguments, identity from auth.uid() only. Granted authenticated EXECUTE because the employer_profiles_update_own RLS policy predicate calls it directly and RLS predicates evaluate under the querying role, not an elevated SECURITY DEFINER context — the same reason is_vacancy_effectively_public is granted to anon/authenticated. Cannot be used to probe another employer''s suspension state; there is no parameter through which to supply one.';

revoke all on function public._is_current_employer_suspended() from public, anon;
grant execute on function public._is_current_employer_suspended() to authenticated;

create or replace function public._is_vacancy_moderated(p_vacancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select exists (
    select 1
    from public.vacancy_moderation vm
    where vm.vacancy_id = p_vacancy_id
  );
$$;

revoke all on function public._is_vacancy_moderated(uuid)
  from public, anon, authenticated;

-- Not executable by anon/authenticated. Never becomes a generic public API:
-- event_type/target_kind are always caller-fixed by the domain RPC, never
-- forwarded from client input; actor/timestamp remain controlled by the
-- domain RPC's own captured values, never re-derived here.
create or replace function public._append_admin_audit_event(
  p_event_type text,
  p_target_kind text,
  p_target_id uuid,
  p_actor_user_id uuid,
  p_occurred_at timestamptz,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  event_id uuid;
begin
  insert into public.admin_audit_events (
    event_type, target_kind, target_id, actor_user_id, occurred_at, reason
  )
  values (
    p_event_type,
    p_target_kind,
    p_target_id,
    p_actor_user_id,
    coalesce(p_occurred_at, clock_timestamp()),
    p_reason
  )
  returning id into event_id;
  return event_id;
end;
$$;

revoke all on function public._append_admin_audit_event(
  text, text, uuid, uuid, timestamptz, text
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Canonical effective-public predicate — add employer-suspension and
-- vacancy-moderation conditions (D-072/D-073). This is the ONLY change
-- needed for public/candidate visibility: list_effective_public_vacancies,
-- get_effective_public_vacancy[_languages], visible_public_vacancy_ids,
-- resolve_current_candidate_vacancy_match, list_current_candidate_vacancy_matches,
-- and submit_candidate_application all delegate to this one function and
-- inherit both new conditions automatically — none of them need a body
-- change. Grants are unchanged (CREATE OR REPLACE preserves existing
-- grants). Does not rewrite publication_state or verification_state.
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

comment on function public.is_vacancy_effectively_public(uuid, timestamptz) is
  'Canonical effective-public predicate. PR 7.2 (D-072/D-073) adds two independent AND-clauses: employer not currently suspended, vacancy not currently moderated — a no-op for source=seed rows (employer_profile_id is null, so the suspension NOT EXISTS trivially holds). Every dependent function inherits both by delegation.';

-- ---------------------------------------------------------------------------
-- 6. employer_profiles_update_own RLS narrowing — the one required RLS
-- change (D-072). USING determines which existing rows can be targeted by
-- an UPDATE; adding the suspension exclusion there means a suspended
-- employer's row is simply not selectable as an UPDATE target, so every
-- direct-table UPDATE path (savePrivateEmployerAction,
-- completeEmployerOnboardingAction's private branch, setLawfulHiringDeclared,
-- and the pre-lock employer_type update) is blocked identically, with no
-- per-call-site exception. WITH CHECK is unchanged — it validates the
-- resulting row's ownership, not suspension state, so no suspension clause
-- belongs there. SELECT (employer_profiles_select_own) and INSERT
-- (employer_profiles_insert_own) are untouched: SELECT must keep working
-- while suspended (D-072: "the employer account may render a neutral
-- suspended state"), and INSERT is structurally exempt (a not-yet-existing
-- profile cannot already have a suspension row referencing it).
-- ---------------------------------------------------------------------------

drop policy employer_profiles_update_own on public.employer_profiles;

create policy employer_profiles_update_own
  on public.employer_profiles
  for update
  to authenticated
  using (
    (select auth.uid()) = id
    and not public._is_current_employer_suspended()
  )
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- 7. Suspension enforcement — Mechanism A (SECURITY DEFINER RPCs).
-- Authoritative inventory (docs/43 §4.1, re-verified against current SQL):
-- create_employer_vacancy_draft, update_employer_vacancy_draft (via the
-- shared _employer_owned_draft_vacancy helper), replace_employer_vacancy_languages
-- (same helper), delete_employer_vacancy_draft (does NOT use the shared
-- helper in its live 20260805110000 definition — given its own explicit
-- check below), publish_employer_vacancy, and every action dispatched
-- through _transition_employer_vacancy (pause/resume/fill/withdraw/
-- materialize_expiry/renew_to_draft — one check in the shared dispatcher
-- covers all six; materialize_expiry is included even though it is a
-- passive/automatic materialization, not a chosen business action, because
-- blocking it is harmless: is_vacancy_effectively_public already excludes
-- an elapsed-but-not-yet-materialized vacancy regardless of stored
-- publication_state, so no visibility gap is created either way — this is
-- a deliberate scope decision, not an oversight), request_employer_verification,
-- bootstrap_organisation_employer (existing-profile branch only — a
-- first-time insert is structurally exempt, mirroring D-072's INSERT
-- exemption), and complete_employer_onboarding. All reuse the existing
-- 'unavailable' discriminant already used pervasively across this RPC
-- family, rather than inventing a new "suspended" oracle.
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
     or public._is_employer_suspended(p_uid)
  then
    return null;
  end if;
  return vacancy;
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
  if public._is_employer_suspended(uid) then
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

  if public._is_employer_suspended(uid) then
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
  if public._is_employer_suspended(uid) then
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
  if public._is_employer_suspended(uid) then
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
  if public._is_employer_suspended(uid) then
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

  if public._is_employer_suspended(uid) then
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
    if public._is_employer_suspended(uid) then
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
    -- No existing profile: structurally cannot be suspended (D-072 — an
    -- employer_suspension row can only reference an already-existing
    -- employer_profile_id), so this branch is deliberately unguarded.
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

-- ---------------------------------------------------------------------------
-- 8. Suspension enforcement — Slice 6 employer applicant-review RPCs
-- (D-072, corrected during planning review from an earlier, mistaken
-- exemption). Each RPC reuses its own existing deny-branch result — no new
-- externally-visible "suspended" discriminant, no new existence oracle.
-- Verification-revocation (D-070) is unaffected: a revoked-but-unsuspended
-- employer's review access is untouched by this change, proven in pgTAP.
-- ---------------------------------------------------------------------------

create or replace function public.list_current_employer_applications(
  p_vacancy_id uuid default null,
  p_status text default null
)
returns table (
  application_id uuid,
  vacancy_id uuid,
  vacancy_title text,
  candidate_display_name text,
  job_category text,
  german_comfort text,
  available_from text,
  current_status text,
  submitted_at timestamptz,
  updated_at timestamptz
)
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
    a.candidate_snapshot ->> 'display_name',
    a.candidate_snapshot ->> 'job_category',
    a.candidate_snapshot ->> 'german_comfort',
    a.candidate_snapshot ->> 'available_from',
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
begin
  if uid is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select * into employer from public.employer_profiles where id = uid;
  if not found
     or employer.onboarding_completed_at is null
     or public._is_employer_suspended(uid)
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

  return jsonb_build_object(
    'status', 'ready',
    'application_id', app.id,
    'vacancy_id', app.vacancy_id,
    'vacancy_title', vacancy_title,
    'submitted_at', app.submitted_at,
    'current_status', app.status,
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

create or replace function public.transition_current_employer_application_status(
  p_application_id uuid,
  p_target_status text,
  p_reason text default null
)
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
  then
    return jsonb_build_object('result', 'employer_unavailable');
  end if;

  if p_target_status not in ('submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected') then
    return jsonb_build_object('result', 'invalid_transition');
  end if;

  -- Ownership check first (no lock) — vacancy ownership is immutable once
  -- set (D-070/build-plan audit), so there is no race between this check
  -- and the row lock taken below on `applications` alone.
  if not exists (
    select 1
    from public.applications a
    join public.vacancies v on v.id = a.vacancy_id
    where a.id = p_application_id
      and v.source = 'employer'
      and v.employer_profile_id = uid
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

comment on function public.list_current_employer_applications(uuid, text) is
  'Employer-owned applicant inventory (D-070, suspension-gated per D-072). Identity from auth.uid(); completed employer profile required, and not currently suspended; current verification not required. Ownership proven via vacancies.employer_profile_id, never a caller-supplied id. Optional vacancy/status filters; an unrecognised status filter or a suspended employer yields zero rows, not an error.';

comment on function public.get_current_employer_application(uuid) is
  'Employer-owned applicant detail (D-070, suspension-gated per D-072). Identity from auth.uid(); completed employer profile required and not currently suspended; current verification not required. Unknown, unauthorized, and suspended-employer cases all collapse to the identical {"status":"unavailable"} shape — no existence oracle.';

comment on function public.transition_current_employer_application_status(uuid, text, text) is
  'Transactional employer status transition (D-070, suspension-gated per D-072). Identity from auth.uid(); completed employer profile + vacancy ownership required, not currently suspended, current verification not required. A suspended employer receives the same employer_unavailable result already used for an incomplete employer — no new discriminant.';

-- ---------------------------------------------------------------------------
-- 9. Verification RPC audit emission (D-074) — additive only. No parameter
-- or result-contract change; each RPC now also writes one admin_audit_events
-- row inside its existing transaction, sharing the same captured timestamp
-- as its own current-state update.
-- ---------------------------------------------------------------------------

create or replace function public.approve_employer_verification(p_employer_profile_id uuid)
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
      verification_reviewed_at = ts,
      verification_reviewed_by = uid,
      verification_review_reason = null,
      updated_at = ts
  where id = profile.id;
  perform public._append_admin_audit_event(
    'verification_approved', 'employer', profile.id, uid, ts, null
  );
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
  ts timestamptz := clock_timestamp();
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
      verification_reviewed_at = ts,
      verification_reviewed_by = uid,
      verification_review_reason = reason,
      updated_at = ts
  where id = profile.id;
  perform public._append_admin_audit_event(
    'verification_rejected', 'employer', profile.id, uid, ts, reason
  );
  return jsonb_build_object('status', 'ok', 'employer_profile_id', profile.id);
end;
$$;

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

  perform public._append_admin_audit_event(
    'verification_revoked', 'employer', profile.id, uid, ts, reason
  );

  return jsonb_build_object(
    'status', 'ok',
    'employer_profile_id', profile.id,
    'paused_vacancy_count', paused_count
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Operator write RPCs — suspend/unsuspend employer, moderate/restore
-- vacancy. Deterministic result discriminants, row-locked target, shared
-- captured timestamp between state row and audit event, no client-supplied
-- actor/timestamp/target_kind.
-- ---------------------------------------------------------------------------

create or replace function public.suspend_employer(
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
  ts timestamptz := clock_timestamp();
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

  if public._is_employer_suspended(profile.id) then
    return jsonb_build_object('status', 'already_in_state', 'employer_profile_id', profile.id);
  end if;

  insert into public.employer_suspension (
    employer_profile_id, suspended_at, suspended_by, suspended_reason, updated_at
  ) values (
    profile.id, ts, uid, reason, ts
  );

  perform public._append_admin_audit_event(
    'employer_suspended', 'employer', profile.id, uid, ts, reason
  );

  return jsonb_build_object('status', 'ok', 'employer_profile_id', profile.id);
end;
$$;

create or replace function public.unsuspend_employer(p_employer_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  profile public.employer_profiles%rowtype;
  ts timestamptz := clock_timestamp();
  removed_id uuid;
begin
  if uid is null then return jsonb_build_object('status', 'unauthenticated'); end if;
  if not public._is_active_verification_operator(uid) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select * into profile from public.employer_profiles
  where id = p_employer_profile_id for update;
  if not found then return jsonb_build_object('status', 'unavailable'); end if;

  delete from public.employer_suspension
  where employer_profile_id = profile.id
  returning employer_profile_id into removed_id;

  if removed_id is null then
    return jsonb_build_object('status', 'already_in_state', 'employer_profile_id', profile.id);
  end if;

  perform public._append_admin_audit_event(
    'employer_unsuspended', 'employer', profile.id, uid, ts, null
  );

  return jsonb_build_object('status', 'ok', 'employer_profile_id', profile.id);
end;
$$;

create or replace function public.moderate_vacancy(
  p_vacancy_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  vacancy public.vacancies%rowtype;
  reason text := nullif(btrim(p_reason), '');
  ts timestamptz := clock_timestamp();
begin
  if uid is null then return jsonb_build_object('status', 'unauthenticated'); end if;
  if not public._is_active_verification_operator(uid) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if reason is null or char_length(reason) > 500 then
    return jsonb_build_object('status', 'validation_error');
  end if;

  select * into vacancy from public.vacancies where id = p_vacancy_id for update;
  if not found then return jsonb_build_object('status', 'unavailable'); end if;

  if public._is_vacancy_moderated(vacancy.id) then
    return jsonb_build_object('status', 'already_in_state', 'vacancy_id', vacancy.id);
  end if;

  insert into public.vacancy_moderation (
    vacancy_id, moderated_at, moderated_by, moderated_reason, updated_at
  ) values (
    vacancy.id, ts, uid, reason, ts
  );

  perform public._append_admin_audit_event(
    'vacancy_moderated', 'vacancy', vacancy.id, uid, ts, reason
  );

  return jsonb_build_object('status', 'ok', 'vacancy_id', vacancy.id);
end;
$$;

create or replace function public.restore_vacancy(p_vacancy_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  vacancy public.vacancies%rowtype;
  ts timestamptz := clock_timestamp();
  removed_id uuid;
begin
  if uid is null then return jsonb_build_object('status', 'unauthenticated'); end if;
  if not public._is_active_verification_operator(uid) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select * into vacancy from public.vacancies where id = p_vacancy_id for update;
  if not found then return jsonb_build_object('status', 'unavailable'); end if;

  delete from public.vacancy_moderation
  where vacancy_id = vacancy.id
  returning vacancy_id into removed_id;

  if removed_id is null then
    return jsonb_build_object('status', 'already_in_state', 'vacancy_id', vacancy.id);
  end if;

  perform public._append_admin_audit_event(
    'vacancy_restored', 'vacancy', vacancy.id, uid, ts, null
  );

  return jsonb_build_object('status', 'ok', 'vacancy_id', vacancy.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Operator read contracts — the minimum PR 7.3 needs: an all-employers
-- list, one target-scoped employer detail (identity + suspension state +
-- bounded audit history), one employer-scoped vacancy list (so the employer
-- detail page can navigate to/moderate a vacancy without a standalone
-- /internal/vacancies list), and one target-scoped vacancy detail. No
-- unbounded "dump the whole ledger" RPC — audit history is embedded,
-- target-scoped, and capped at 50 most-recent rows per detail call.
-- actor_user_id is deliberately never returned to any of these — no
-- human-readable operator identity system exists, and PR 7.3 has no stated
-- need for it.
--
-- Both list RPCs (this one and list_employer_vacancies_for_operator below)
-- are additionally bounded by p_limit/p_offset: default 50, hard-clamped to
-- [1, 100] via least(greatest(...)) so neither an omitted, zero, negative,
-- nor oversized limit can turn either list into an unrestricted table dump;
-- p_offset is clamped to >= 0. Ordering is deterministic with an explicit
-- id tie-breaker, so pagination never produces duplicate or skipped rows
-- across pages. A non-operator's WHERE clause already yields zero rows
-- regardless of the requested bound.
-- ---------------------------------------------------------------------------

create or replace function public.list_employers_for_operator(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  employer_profile_id uuid,
  employer_type text,
  display_name text,
  company_name text,
  onboarding_completed boolean,
  verification_state text,
  suspended boolean,
  suspended_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select
    ep.id,
    ep.employer_type,
    ep.display_name,
    c.name,
    (ep.onboarding_completed_at is not null),
    ep.verification_state,
    (es.employer_profile_id is not null),
    es.suspended_at,
    ep.created_at
  from public.employer_profiles ep
  left join public.companies c
    on c.owner_employer_id = ep.id
    and c.source = 'employer'
  left join public.employer_suspension es
    on es.employer_profile_id = ep.id
  where public._is_active_verification_operator(auth.uid())
  order by ep.created_at desc, ep.id asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

comment on function public.list_employers_for_operator(integer, integer) is
  'PR 7.2: operator-only all-employers list for /internal/employers, unlike list_pending_employer_verifications (pending-only). Non-operators receive a deterministic empty result. Minimum fields for a moderation list view — no verification review reason, no raw profile data. p_limit defaults to 50, hard-clamped to [1,100]; p_offset clamped to >= 0; ordering is deterministic (created_at desc, id asc) so pagination is stable.';

revoke all on function public.list_employers_for_operator(integer, integer) from public, anon;
grant execute on function public.list_employers_for_operator(integer, integer) to authenticated;

create or replace function public.get_employer_moderation_status(
  p_employer_profile_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  profile public.employer_profiles%rowtype;
  suspension public.employer_suspension%rowtype;
  company_name text;
  events_json jsonb;
begin
  if uid is null or not public._is_active_verification_operator(uid) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select * into profile from public.employer_profiles where id = p_employer_profile_id;
  if not found then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select c.name into company_name
  from public.companies c
  where c.owner_employer_id = profile.id and c.source = 'employer';

  select * into suspension
  from public.employer_suspension
  where employer_profile_id = profile.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'event_type', e.event_type,
        'occurred_at', e.occurred_at,
        'reason', e.reason
      )
      order by e.occurred_at desc, e.id desc
    ),
    '[]'::jsonb
  )
  into events_json
  from (
    select id, event_type, occurred_at, reason
    from public.admin_audit_events
    where target_kind = 'employer' and target_id = profile.id
    order by occurred_at desc, id desc
    limit 50
  ) e;

  return jsonb_build_object(
    'status', 'ready',
    'employer_profile_id', profile.id,
    'employer_type', profile.employer_type,
    'display_name', profile.display_name,
    'company_name', company_name,
    'onboarding_completed', (profile.onboarding_completed_at is not null),
    'verification_state', profile.verification_state,
    'suspended', (suspension.employer_profile_id is not null),
    'suspended_at', suspension.suspended_at,
    'suspended_reason', suspension.suspended_reason,
    'audit_events', events_json
  );
end;
$$;

comment on function public.get_employer_moderation_status(uuid) is
  'PR 7.2: operator-only target-scoped employer detail for /internal/employers/[employerProfileId] — identity + current suspension state + up to 50 most-recent audit events for this employer. Unlike get_employer_verification_review, works for every verification_state, not only pending/verified/rejected. actor_user_id never returned.';

revoke all on function public.get_employer_moderation_status(uuid) from public, anon;
grant execute on function public.get_employer_moderation_status(uuid) to authenticated;

create or replace function public.list_employer_vacancies_for_operator(
  p_employer_profile_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  vacancy_id uuid,
  title text,
  publication_state text,
  moderated boolean,
  moderated_at timestamptz,
  published_at timestamptz
)
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select
    v.id,
    v.title,
    v.publication_state,
    (vm.vacancy_id is not null),
    vm.moderated_at,
    v.published_at
  from public.vacancies v
  left join public.vacancy_moderation vm on vm.vacancy_id = v.id
  where v.source = 'employer'
    and v.employer_profile_id = p_employer_profile_id
    and public._is_active_verification_operator(auth.uid())
  order by v.created_at desc, v.id asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

comment on function public.list_employer_vacancies_for_operator(uuid, integer, integer) is
  'PR 7.2: operator-only, employer-scoped vacancy list so the employer detail page can navigate to/moderate a vacancy without a standalone /internal/vacancies list. Non-operators receive a deterministic empty result. p_limit defaults to 50, hard-clamped to [1,100]; p_offset clamped to >= 0; ordering is deterministic (created_at desc, id asc).';

revoke all on function public.list_employer_vacancies_for_operator(uuid, integer, integer) from public, anon;
grant execute on function public.list_employer_vacancies_for_operator(uuid, integer, integer) to authenticated;

create or replace function public.get_vacancy_moderation_status(
  p_vacancy_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  vacancy public.vacancies%rowtype;
  moderation public.vacancy_moderation%rowtype;
  events_json jsonb;
begin
  if uid is null or not public._is_active_verification_operator(uid) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select * into vacancy from public.vacancies where id = p_vacancy_id;
  if not found then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select * into moderation
  from public.vacancy_moderation
  where vacancy_id = vacancy.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'event_type', e.event_type,
        'occurred_at', e.occurred_at,
        'reason', e.reason
      )
      order by e.occurred_at desc, e.id desc
    ),
    '[]'::jsonb
  )
  into events_json
  from (
    select id, event_type, occurred_at, reason
    from public.admin_audit_events
    where target_kind = 'vacancy' and target_id = vacancy.id
    order by occurred_at desc, id desc
    limit 50
  ) e;

  return jsonb_build_object(
    'status', 'ready',
    'vacancy_id', vacancy.id,
    'title', vacancy.title,
    'employer_profile_id', vacancy.employer_profile_id,
    'publication_state', vacancy.publication_state,
    'moderated', (moderation.vacancy_id is not null),
    'moderated_at', moderation.moderated_at,
    'moderated_reason', moderation.moderated_reason,
    'audit_events', events_json
  );
end;
$$;

comment on function public.get_vacancy_moderation_status(uuid) is
  'PR 7.2: operator-only target-scoped vacancy detail for the moderation UI — identity + current moderation state + up to 50 most-recent audit events for this vacancy. actor_user_id never returned.';

revoke all on function public.get_vacancy_moderation_status(uuid) from public, anon;
grant execute on function public.get_vacancy_moderation_status(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 12. Own-account suspension read — lets a future employer-facing UI render
-- a neutral suspended state without any operator role. Self-derived
-- identity only, no caller-supplied employer id.
-- ---------------------------------------------------------------------------

create or replace function public.is_current_employer_suspended()
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select public._is_current_employer_suspended();
$$;

comment on function public.is_current_employer_suspended() is
  'PR 7.2: self-scoped suspension check for the calling employer. Delegates to _is_current_employer_suspended() — the same zero-argument, self-derived helper the employer_profiles_update_own RLS policy uses — so there is exactly one implementation of "is the current session''s own employer suspended," not two. False for an unauthenticated/nonexistent caller (same shape as every other own-account boolean check in this codebase).';

revoke all on function public.is_current_employer_suspended() from public, anon;
grant execute on function public.is_current_employer_suspended() to authenticated;

-- ---------------------------------------------------------------------------
-- 13. Grants — new RPC functions above already carry their own explicit
-- revoke/grant statements inline. This section documents the grant model
-- for the three new tables as a single point of reference (grants already
-- issued in sections 1-3): zero anon/authenticated access on
-- employer_suspension, vacancy_moderation, admin_audit_events; all reads
-- and writes are RPC-mediated through the SECURITY DEFINER functions above.
-- ---------------------------------------------------------------------------
