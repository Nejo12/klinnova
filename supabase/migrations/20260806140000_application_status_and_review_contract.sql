-- ---------------------------------------------------------------------------
-- PR 6.1 — Application status and employer review database contract.
-- Accepted per D-070 (docs/10-decisions.md). Widens `applications.status`
-- from the single Slice 3 value ('submitted') to a five-value forward-only
-- state machine, adds an append-only, RPC-mediated
-- `application_status_history` audit table, and adds four narrow
-- SECURITY DEFINER RPCs: two employer-facing (list/detail), one
-- transactional employer status transition, and one candidate-safe status
-- history read. No employer RLS is added to `applications` — employer
-- access is exclusively through these RPCs, each proving vacancy ownership
-- internally. `application_status_history` receives zero `authenticated`
-- grant (RPC-only), since it is read by two different projections
-- (employer-full vs. candidate-safe) that RLS row-filtering cannot express
-- on its own (see docs/38-application-status-and-review-proposal.md §7/§15).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Widen the application status vocabulary.
-- ---------------------------------------------------------------------------

alter table public.applications
  drop constraint applications_status_chk,
  add constraint applications_status_chk
    check (status in ('submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected'));

comment on column public.applications.status is
  'submitted | reviewing | shortlisted | accepted | rejected (D-070). Mutated only via transition_current_employer_application_status; the initial value is always ''submitted'', written by submit_candidate_application.';

-- ---------------------------------------------------------------------------
-- 2. Append-only application status history.
-- ---------------------------------------------------------------------------

create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_user_id uuid not null references auth.users (id),
  actor_role text not null,
  reason text,
  occurred_at timestamptz not null default now(),
  constraint application_status_history_to_status_chk
    check (to_status in ('submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected')),
  constraint application_status_history_from_status_chk
    check (from_status is null or from_status in ('submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected')),
  constraint application_status_history_initial_event_chk
    check (from_status is not null or to_status = 'submitted'),
  constraint application_status_history_actor_role_chk
    check (actor_role in ('candidate', 'employer')),
  constraint application_status_history_reason_chk
    check (
      reason is null
      or (
        to_status = 'rejected'
        and reason = btrim(reason)
        and char_length(reason) between 1 and 1000
      )
    )
);

comment on table public.application_status_history is
  'Append-only audit trail for public.applications.status (D-070). Written exclusively by submit_candidate_application (initial submitted event) and transition_current_employer_application_status (all later events). No direct authenticated grant — read only through get_current_employer_application (full projection) and list_current_candidate_application_status_history (candidate-safe projection, excludes reason/actor_user_id/actor_role).';

comment on column public.application_status_history.reason is
  'Employer-authored, optional, accepted only when to_status = ''rejected''. Trimmed and length-bounded (1-1000 chars) by both this CHECK and the writing RPC. Never returned to the candidate-safe projection.';

comment on column public.application_status_history.actor_user_id is
  'auth.uid() of the writer at insert time — the submitting candidate for the initial event, the reviewing employer for every later transition. Never client-supplied.';

create index application_status_history_application_occurred_idx
  on public.application_status_history (application_id, occurred_at, id);

-- Guarantees at most one initial ("from_status is null") event per
-- application, independent of the fact that both write paths (backfill,
-- submit_candidate_application) already only ever run once per application.
create unique index application_status_history_one_initial_event_idx
  on public.application_status_history (application_id)
  where from_status is null;

alter table public.application_status_history enable row level security;

revoke all on table public.application_status_history from public, anon, authenticated;
grant all on table public.application_status_history to service_role;

-- ---------------------------------------------------------------------------
-- 3. Backfill one initial `submitted` event per pre-existing application.
-- Every application row that exists before this migration has
-- status = 'submitted' (the only value the prior CHECK allowed), so the
-- synthesized event uses each row's own submitted_at/candidate_id — no
-- fabricated timestamp, no invented actor.
-- ---------------------------------------------------------------------------

insert into public.application_status_history (
  application_id, from_status, to_status, actor_user_id, actor_role, reason, occurred_at
)
select a.id, null, 'submitted', a.candidate_id, 'candidate', null, a.submitted_at
from public.applications a
where not exists (
  select 1
  from public.application_status_history h
  where h.application_id = a.id
    and h.from_status is null
);

-- ---------------------------------------------------------------------------
-- 4. Shared transition-matrix helper (internal only, no grants). Single
-- source of truth for both the employer detail RPC's `allowed_transitions`
-- projection and the transition RPC's own validation, so the two can never
-- drift apart.
-- ---------------------------------------------------------------------------

create or replace function public._application_allowed_transitions(p_current_status text)
returns text[]
language sql
immutable
security definer
set search_path to pg_catalog, public
as $$
  select case p_current_status
    when 'submitted' then array['reviewing', 'shortlisted', 'accepted', 'rejected']
    when 'reviewing' then array['shortlisted', 'accepted', 'rejected']
    when 'shortlisted' then array['accepted', 'rejected']
    when 'accepted' then array[]::text[]
    when 'rejected' then array[]::text[]
    else array[]::text[]
  end;
$$;

comment on function public._application_allowed_transitions(text) is
  'Internal, no grants. Canonical forward-only transition matrix (D-070): submitted -> reviewing/shortlisted/accepted/rejected; reviewing -> shortlisted/accepted/rejected; shortlisted -> accepted/rejected; accepted/rejected terminal. Shared by get_current_employer_application and transition_current_employer_application_status.';

revoke all on function public._application_allowed_transitions(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Future submissions: application + initial history event, atomically.
-- Signature, JSON result contract (submitted | already_applied | incomplete
-- | unavailable | ineligible), duplicate-first idempotency, canonical
-- eligibility evaluator, row locking, effective-public recheck, and grants
-- are all preserved exactly from the PR 5.5c body. The only change is the
-- history insert immediately after the application insert succeeds, inside
-- the same exception block — a history-insert failure is not a
-- unique_violation, so it propagates out of the block uncaught, which rolls
-- back the just-inserted application row along with it (PL/pgSQL's
-- exception-block savepoint covers the whole block, not just the statement
-- that raised).
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

comment on function public.submit_candidate_application(uuid) is
  'Auth-bound submit with vacancy row lock and canonical effective-public recheck. PR 5.5c: eligibility enforced transactionally via the canonical evaluator. PR 6.1 (D-070): a successful submission also writes its initial application_status_history event (to_status=''submitted'') atomically in the same transaction — a history-insert failure rolls back the application insert. Preserves immutable v1 snapshots and uniqueness.';

revoke all on function public.submit_candidate_application(uuid) from public, anon;
grant execute on function public.submit_candidate_application(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Employer applicant list. Identity from auth.uid() only; ownership
-- proven via the vacancies join, never a caller-supplied employer/vacancy
-- owner id. Returns zero rows (never an error) for unauthenticated,
-- missing/incomplete employer profile, an unowned vacancy filter, or an
-- unrecognised status filter — no existence oracle.
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
  if not found or employer.onboarding_completed_at is null then
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

comment on function public.list_current_employer_applications(uuid, text) is
  'Employer-owned applicant inventory (D-070). Identity from auth.uid(); completed employer profile required; current verification not required (see docs/37-slice-6-build-plan.md "Employer access rule"). Ownership proven via vacancies.employer_profile_id, never a caller-supplied id. Optional vacancy/status filters; an unrecognised status filter yields zero rows, not an error. Ordered submitted_at desc, id asc. Returns only the narrow list projection — no candidate_id, no auth id, no raw snapshot JSON, no email/phone/address, no eligibility internals.';

revoke all on function public.list_current_employer_applications(uuid, text) from public, anon;
grant execute on function public.list_current_employer_applications(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Employer applicant detail. Unknown and unauthorized application ids
-- collapse to the identical {"status":"unavailable"} shape — no existence
-- oracle across employers.
-- ---------------------------------------------------------------------------

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
  if not found or employer.onboarding_completed_at is null then
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

comment on function public.get_current_employer_application(uuid) is
  'Employer-owned applicant detail (D-070). Identity from auth.uid(); completed employer profile required; current verification not required. Unknown and unauthorized application ids collapse to the identical {"status":"unavailable"} shape. Candidate fields are projected from the immutable candidate_snapshot only (D-038) — never a live candidate_profiles/candidate_languages read. status_history includes reason (employer-authored, own applications only); never actor_user_id/actor_role.';

revoke all on function public.get_current_employer_application(uuid) from public, anon;
grant execute on function public.get_current_employer_application(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Transactional employer status transition. Row-locked, re-read-and-
-- validate against live state (no client-supplied "expected current
-- status"), reason normalized/length-bounded/rejected-transition-only,
-- deterministic typed result, no raw PostgreSQL errors.
-- ---------------------------------------------------------------------------

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
  if not found or employer.onboarding_completed_at is null then
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

comment on function public.transition_current_employer_application_status(uuid, text, text) is
  'Transactional employer status transition (D-070). Identity from auth.uid(); completed employer profile + vacancy ownership required, current verification not required. Locks the application row, re-reads live status, validates against _application_allowed_transitions (forward-only, terminal at accepted/rejected). p_reason is trimmed; blank/whitespace-only normalizes to null. A non-null reason supplied for any target other than rejected is a caller error -> invalid_transition (no update, no history row) rather than being silently discarded. A rejected target accepts a 1-1000 char trimmed reason; a longer one is invalid_transition. Typed result: updated | already_in_state | invalid_transition | unavailable | employer_unavailable. No client-supplied actor identity or timestamp; no raw PostgreSQL errors.';

revoke all on function public.transition_current_employer_application_status(uuid, text, text) from public, anon;
grant execute on function public.transition_current_employer_application_status(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Candidate-safe status history. Excludes reason/actor_user_id/
-- actor_role entirely — only to_status/occurred_at, matching the
-- candidate-safe projection in docs/38 §4/§13.
-- ---------------------------------------------------------------------------

create or replace function public.list_current_candidate_application_status_history(
  p_application_id uuid
)
returns table (
  to_status text,
  occurred_at timestamptz
)
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
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

comment on function public.list_current_candidate_application_status_history(uuid) is
  'Candidate-safe status timeline (D-070). Identity from auth.uid(); the caller must own the application (applications.candidate_id = auth.uid()). Unauthorized/unknown application ids return zero rows, not an error. Returns only to_status/occurred_at, chronological — never reason, actor_user_id, or actor_role.';

revoke all on function public.list_current_candidate_application_status_history(uuid) from public, anon;
grant execute on function public.list_current_candidate_application_status_history(uuid) to authenticated;
