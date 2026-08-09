-- M5.1 Unit D — application outcome events (D-M5-22). Founder-approved
-- behavioral contract 1-8 (docs/49 D-M5-22; design direction docs/50).
-- Additive migration (18th). Database/authorization/RPC only — no UI.
--
-- Smallest trustworthy representation: one append-only table with exactly
-- the columns the approved contract requires. No replacement_for/
-- supersedes column — inspection of the existing schema found zero
-- precedent for a row-to-row correction-link column anywhere (every
-- existing correction pattern — verification revoke/re-request, employer
-- suspension/unsuspend, vacancy moderation/restore — is "current-state +
-- append-only history," never a link between two history rows). Void plus
-- an independent new event is sufficient: the partial unique index on
-- active `hired` events (below) already guarantees a corrected hire event
-- can only be inserted once the mistaken one is voided, with no explicit
-- link required to prove the correction happened.
--
-- Immutability follows the exact existing repo convention (application_
-- status_history, admin_audit_events, employer_suspension): zero grant to
-- anon/authenticated of any kind — no trigger is used anywhere in this
-- codebase for this purpose, and none is introduced here. Every read and
-- write is RPC-mediated.
--
-- Outcome events are NOT duplicated into admin_audit_events (D-074): that
-- ledger is documented as operator/admin-action history; the outcome
-- table is itself the authoritative append-only business record for these
-- events, matching docs/50 §9.
--
-- No export/deletion RPC change: the table stores no candidate PII
-- (application_id + outcome_type + timestamps + employer/actor auth ids
-- only), and Slice 8 deletion uses Supabase Auth's soft delete
-- (`deleteUser(id, true)`, docs/47 §"three mechanisms compared") — auth.users
-- rows are never hard-deleted, so recorded_by/voided_by (FKs to auth.users
-- with no ON DELETE clause, matching every other actor FK in this schema)
-- can never be blocked or require reconciliation.

-- ---------------------------------------------------------------------------
-- 1. Temporal-validity helper — immutable (pure function of its two
-- arguments, never calls now()/clock_timestamp() itself), so it is safe to
-- use in a table CHECK constraint without the historical-instability
-- problem a direct `now()`-referencing CHECK would create: the constraint
-- only ever compares occurred_at against the row's own persisted
-- recorded_at, never against wall-clock time at arbitrary future
-- validation. Reused by record_application_outcome for a clean typed
-- rejection result rather than a raw constraint-violation error.
-- 5-minute tolerance is a fixed system-owned constant (docs/50 §8), not a
-- caller-selectable parameter.
-- ---------------------------------------------------------------------------

create or replace function public._outcome_occurred_at_window_valid(
  p_occurred_at timestamptz,
  p_recorded_at timestamptz
)
returns boolean
language sql
immutable
as $$
  select
    p_occurred_at >= p_recorded_at - interval '30 days'
    and p_occurred_at <= p_recorded_at + interval '5 minutes';
$$;

comment on function public._outcome_occurred_at_window_valid(timestamptz, timestamptz) is
  'D-M5-22: occurred_at must be within 30 days before, and at most 5 minutes (fixed clock-skew tolerance) after, recorded_at. Immutable and now()-free by construction — safe as both a table CHECK and RPC-level validation.';

-- ---------------------------------------------------------------------------
-- 2. application_outcome_events — append-only.
-- ---------------------------------------------------------------------------

create table public.application_outcome_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.applications (id) on delete cascade,
  outcome_type text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  recorded_by uuid not null references auth.users (id),
  voided_at timestamptz null,
  voided_by uuid null references auth.users (id),
  constraint application_outcome_events_outcome_type_chk
    check (outcome_type in ('interview_completed', 'hired')),
  constraint application_outcome_events_void_pairing_chk
    check ((voided_at is null) = (voided_by is null)),
  constraint application_outcome_events_occurred_window_chk
    check (public._outcome_occurred_at_window_valid(occurred_at, recorded_at))
);

comment on table public.application_outcome_events is
  'D-M5-22 (M5.1 Unit D): append-only record of real-world interview/hire outcomes, conceptually separate from applications.status (accepted != hired). Zero ordinary grant — RPC-mediated only (record_application_outcome, void_application_outcome, candidate_application_outcomes, employer_application_outcomes). No candidate PII stored.';

comment on column public.application_outcome_events.outcome_type is
  'interview_completed | hired only (founder contract 1). No scheduling/invitation/offer/no-show/free-text/rejection-reason types.';

comment on column public.application_outcome_events.occurred_at is
  'Employer-supplied: when the interview/hire actually happened. Bounded to [recorded_at - 30 days, recorded_at + 5 minutes] by application_outcome_events_occurred_window_chk. Never client-controlled beyond this window.';

comment on column public.application_outcome_events.recorded_at is
  'Database-generated (clock_timestamp() default) and immutable — never accepted from the RPC caller, never updated after insert.';

comment on column public.application_outcome_events.recorded_by is
  'auth.uid() of the recording employer at insert time inside record_application_outcome. Never client-supplied. No ON DELETE clause (matches actor_user_id on application_status_history/admin_audit_events) — safe because Slice 8 deletion soft-deletes auth.users (deleteUser(id, true)), never hard-deletes it.';

comment on column public.application_outcome_events.voided_at is
  'Append-only correction marker (founder contract 4). Set only by void_application_outcome. A voided event''s original outcome_type/occurred_at/recorded_at/recorded_by are never altered — only voided_at/voided_by are ever written after insert, and only once.';

comment on column public.application_outcome_events.voided_by is
  'auth.uid() of the voiding employer. Paired with voided_at by application_outcome_events_void_pairing_chk.';

create index application_outcome_events_application_occurred_idx
  on public.application_outcome_events (application_id, occurred_at, id);

-- Founder contract 3: at most one ACTIVE (non-voided) hired event per
-- application. A voided hired event does not block a corrected replacement
-- (partial index — the row simply falls outside the index once voided_at
-- is set). Does not restrict interview_completed multiplicity (contract 2).
create unique index application_outcome_events_one_active_hired_idx
  on public.application_outcome_events (application_id)
  where outcome_type = 'hired' and voided_at is null;

alter table public.application_outcome_events enable row level security;

revoke all on table public.application_outcome_events from public, anon, authenticated;
grant all on table public.application_outcome_events to service_role;

-- ---------------------------------------------------------------------------
-- 3. record_application_outcome — employer write. Identity from auth.uid()
-- only; ownership + deleted-candidate gate proven in one EXISTS, mirroring
-- transition_current_employer_application_status's exact pattern (D-070/
-- D-087): unknown application, cross-employer application, and a deleted
-- candidate's application all collapse to the same 'unavailable' result —
-- no existence oracle, no new discriminant for the deleted-candidate case.
-- ---------------------------------------------------------------------------

create or replace function public.record_application_outcome(
  p_application_id uuid,
  p_outcome_type text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  employer public.employer_profiles%rowtype;
  ts timestamptz := clock_timestamp();
  new_id uuid;
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
    return jsonb_build_object('result', 'unavailable');
  end if;

  if p_outcome_type not in ('interview_completed', 'hired') then
    return jsonb_build_object('result', 'invalid_outcome_type');
  end if;

  if p_occurred_at is null
     or not public._outcome_occurred_at_window_valid(p_occurred_at, ts)
  then
    return jsonb_build_object('result', 'invalid_occurred_at');
  end if;

  -- Ownership + deleted-candidate gate, no lock needed: vacancy ownership
  -- is immutable once set, and this is an INSERT (no row to lock yet).
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

  begin
    insert into public.application_outcome_events (
      application_id, outcome_type, occurred_at, recorded_at, recorded_by
    ) values (
      p_application_id, p_outcome_type, p_occurred_at, ts, uid
    )
    returning id into new_id;
  exception
    when unique_violation then
      return jsonb_build_object('result', 'already_hired');
  end;

  return jsonb_build_object(
    'result', 'ok',
    'outcome_event_id', new_id,
    'outcome_type', p_outcome_type,
    'occurred_at', p_occurred_at,
    'recorded_at', ts
  );
end;
$$;

comment on function public.record_application_outcome(uuid, text, timestamptz) is
  'D-M5-22 employer write. Identity from auth.uid(); completed, non-suspended, non-deleted employer profile required; vacancy ownership + non-deleted candidate proven in one EXISTS (D-070/D-087 pattern) — unknown, cross-employer, and deleted-candidate applications all collapse to result=unavailable. outcome_type restricted to interview_completed|hired. occurred_at bounded to [recorded_at-30d, recorded_at+5m]. recorded_at/recorded_by are DB-derived, never caller-supplied. A second active hired attempt returns already_hired (caught unique_violation from application_outcome_events_one_active_hired_idx), never a raw constraint error. Does not touch applications.status.';

revoke all on function public.record_application_outcome(uuid, text, timestamptz) from public, anon;
grant execute on function public.record_application_outcome(uuid, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. void_application_outcome — employer correction. Same ownership +
-- deleted-candidate gate as record_application_outcome: once a candidate
-- is deleted, this repo's established convention (D-087) is that an
-- employer's mutation access to that application stops entirely, not only
-- for "new facts" — transition_current_employer_application_status blocks
-- every further transition uniformly, and void is the same category of
-- employer-driven mutation. The original event's core columns
-- (outcome_type/occurred_at/recorded_at/recorded_by) are never touched —
-- only voided_at/voided_by are ever set, and the WHERE clause's
-- `voided_at is null` guard makes a repeat void a no-op zero-row UPDATE,
-- reported as already_voided rather than silently succeeding twice.
-- ---------------------------------------------------------------------------

create or replace function public.void_application_outcome(
  p_outcome_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  employer public.employer_profiles%rowtype;
  event public.application_outcome_events%rowtype;
  ts timestamptz := clock_timestamp();
  updated_id uuid;
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
    return jsonb_build_object('result', 'unavailable');
  end if;

  select e.* into event
  from public.application_outcome_events e
  join public.applications a on a.id = e.application_id
  join public.vacancies v on v.id = a.vacancy_id
  join public.candidate_profiles cp on cp.id = a.candidate_id
  where e.id = p_outcome_event_id
    and v.source = 'employer'
    and v.employer_profile_id = uid
    and cp.account_deleted_at is null
  for update of e;

  if not found then
    return jsonb_build_object('result', 'unavailable');
  end if;

  if event.voided_at is not null then
    return jsonb_build_object('result', 'already_voided');
  end if;

  update public.application_outcome_events
  set voided_at = ts, voided_by = uid
  where id = event.id
    and voided_at is null
  returning id into updated_id;

  if updated_id is null then
    -- Concurrent void won the race between the lock above and this
    -- UPDATE's own re-check; report the same result a sequential caller
    -- would see rather than a false 'ok'.
    return jsonb_build_object('result', 'already_voided');
  end if;

  return jsonb_build_object(
    'result', 'ok',
    'outcome_event_id', updated_id,
    'voided_at', ts
  );
end;
$$;

comment on function public.void_application_outcome(uuid) is
  'D-M5-22 employer correction. Identity from auth.uid(); same employer/ownership/deleted-candidate gate as record_application_outcome, applied to voiding too (D-087 precedent: employer mutation access to a deleted candidate''s application stops entirely, not only for new facts). Repeat void returns already_voided, never a silent no-op or error. Original event columns are never modified — only voided_at/voided_by. No free-text void reason (not required by the founder contract).';

revoke all on function public.void_application_outcome(uuid) from public, anon;
grant execute on function public.void_application_outcome(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. candidate_application_outcomes — candidate-safe read. Structurally
-- excludes every privileged column by only ever selecting outcome_type/
-- occurred_at into the RETURNS TABLE shape — there is no raw table SELECT
-- grant a candidate could use to see more (D-M5-6 candidate visibility).
-- ---------------------------------------------------------------------------

create or replace function public.candidate_application_outcomes(
  p_application_id uuid
)
returns table (
  outcome_type text,
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
  select e.outcome_type, e.occurred_at
  from public.application_outcome_events e
  where e.application_id = p_application_id
    and e.voided_at is null
  order by e.occurred_at asc, e.id asc;
end;
$$;

comment on function public.candidate_application_outcomes(uuid) is
  'D-M5-22 candidate-safe read. Identity from auth.uid(); caller must own the application (applications.candidate_id = auth.uid()) — unauthorized/unknown application ids return zero rows, not an error. Returns only outcome_type/occurred_at for active (non-voided) events — never outcome_event_id, recorded_at, recorded_by, voided_at, voided_by, or employer identity.';

revoke all on function public.candidate_application_outcomes(uuid) from public, anon;
grant execute on function public.candidate_application_outcomes(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. employer_application_outcomes — employer read, bounded to one
-- application (never a cross-application/analytics list). Includes voided
-- events so a Unit E correction UI can show history and let the employer
-- pick which event to void; omits recorded_by/voided_by (always "the
-- calling employer themselves" in this single-actor-per-account product,
-- so exposing it has no informational value here) — the smallest
-- projection Unit E's stated immediate need (docs/50 §12 step 2) requires.
-- ---------------------------------------------------------------------------

create or replace function public.employer_application_outcomes(
  p_application_id uuid
)
returns table (
  outcome_event_id uuid,
  outcome_type text,
  occurred_at timestamptz,
  recorded_at timestamptz,
  voided_at timestamptz
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
     or public._is_employer_deleted(uid)
  then
    return;
  end if;

  if not exists (
    select 1
    from public.applications a
    join public.vacancies v on v.id = a.vacancy_id
    where a.id = p_application_id
      and v.source = 'employer'
      and v.employer_profile_id = uid
  ) then
    return;
  end if;

  return query
  select e.id, e.outcome_type, e.occurred_at, e.recorded_at, e.voided_at
  from public.application_outcome_events e
  where e.application_id = p_application_id
  order by e.occurred_at asc, e.id asc;
end;
$$;

comment on function public.employer_application_outcomes(uuid) is
  'D-M5-22 employer read, bounded to one owned application (not a cross-application/analytics list — Unit E''s stated immediate need only). Identity from auth.uid(); completed, non-suspended, non-deleted employer profile + vacancy ownership required. Includes voided events (so a correction UI can show history and target the right event to void) but omits recorded_by/voided_by — always the calling employer in this single-actor-per-account product, so exposing it has no informational value.';

revoke all on function public.employer_application_outcomes(uuid) from public, anon;
grant execute on function public.employer_application_outcomes(uuid) to authenticated;
