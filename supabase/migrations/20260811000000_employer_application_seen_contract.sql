-- N4 — employer application attention/unseen indicator. Additive migration.
--
-- Smallest trustworthy representation: one nullable timestamp on the
-- existing `applications` row (`employer_seen_at`), not a generic
-- notification/acknowledgement table. This mirrors the repo's existing
-- "current-state field, not an event ledger" precedent used for e.g.
-- `employer_profiles.verification_state`/`applications.status` — there is
-- exactly one thing to remember (has the owning employer opened this
-- application yet), and a single nullable column expresses it completely.
--
-- `employer_seen_at` is a strictly separate dimension from `applications
-- .status` (D-070's hiring-workflow state machine) and from
-- `application_status_history` (append-only hiring-status audit trail).
-- Marking an application seen never reads, writes, or otherwise touches
-- either — this migration adds no application_status_history event kind,
-- and no status transition ever sets or clears employer_seen_at.
--
-- Backfill: every pre-existing application is stamped seen at migration
-- time (`employer_seen_at = now()` for existing rows only). Only
-- applications submitted after this migration runs begin unseen. This
-- avoids retroactively surfacing every historical Preview/seed application
-- as "new" the moment N4 ships, which would misrepresent genuine employer
-- attention debt with migration-artifact noise.
--
-- Ownership/RLS: `applications` already carries zero authenticated UPDATE
-- grant (every mutation in this schema is RPC-mediated); this migration
-- does not change that. `mark_employer_application_seen` and
-- `count_unseen_current_employer_applications` are the only two ways to
-- read/write this column for an authenticated caller, both SECURITY
-- DEFINER, both deriving identity exclusively from auth.uid(), both
-- reusing transition_current_employer_application_status's exact
-- ownership-join pattern (application -> vacancy -> employer_profile_id =
-- uid, source = 'employer'). No candidate write path can reach this column
-- at all. Marking seen is monotonic (`coalesce(employer_seen_at, now())`)
-- — repeated/concurrent calls converge safely and never move a set
-- timestamp backward or clear it.

alter table public.applications
  add column employer_seen_at timestamptz;

update public.applications
set employer_seen_at = now()
where employer_seen_at is null;

comment on column public.applications.employer_seen_at is
  'N4: employer attention acknowledgement, independent of applications.status. Null = unseen. Set once, monotonically, only by mark_employer_application_seen; never by a status transition. Pre-existing rows were backfilled seen at migration time; only later submissions begin unseen.';

-- ---------------------------------------------------------------------------
-- mark_employer_application_seen — idempotent, ownership-checked, monotonic.
-- ---------------------------------------------------------------------------

create or replace function public.mark_employer_application_seen(
  p_application_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  employer public.employer_profiles%rowtype;
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

  update public.applications
  set employer_seen_at = coalesce(employer_seen_at, now())
  where id = p_application_id;

  return jsonb_build_object('result', 'ok');
end;
$$;

comment on function public.mark_employer_application_seen(uuid) is
  'N4: marks one employer-owned application seen. Identity from auth.uid() only; completed employer profile required, not currently suspended; vacancy ownership proven via vacancies.employer_profile_id, never a caller-supplied id. Monotonic (coalesce) — idempotent under retry/concurrency/multi-tab. Never touches applications.status or application_status_history.';

revoke all on function public.mark_employer_application_seen(uuid) from public, anon;
grant execute on function public.mark_employer_application_seen(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- count_unseen_current_employer_applications — derived, not a maintained
-- counter column (avoids increment/decrement synchronization bugs).
-- ---------------------------------------------------------------------------

create or replace function public.count_unseen_current_employer_applications()
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  employer public.employer_profiles%rowtype;
  unseen_count integer;
begin
  if uid is null then
    return jsonb_build_object('result', 'unavailable', 'count', 0);
  end if;

  select * into employer from public.employer_profiles where id = uid;
  if not found
     or employer.onboarding_completed_at is null
     or public._is_employer_suspended(uid)
  then
    return jsonb_build_object('result', 'employer_unavailable', 'count', 0);
  end if;

  select count(*)
  into unseen_count
  from public.applications a
  join public.vacancies v on v.id = a.vacancy_id
  where v.source = 'employer'
    and v.employer_profile_id = uid
    and a.employer_seen_at is null;

  return jsonb_build_object('result', 'ok', 'count', unseen_count);
end;
$$;

comment on function public.count_unseen_current_employer_applications() is
  'N4: count of the current employer''s applications with employer_seen_at is null. Identity from auth.uid() only; completed employer profile required, not currently suspended. Derived from source rows on every call — no maintained counter column, so there is nothing to fall out of sync.';

revoke all on function public.count_unseen_current_employer_applications() from public, anon;
grant execute on function public.count_unseen_current_employer_applications() to authenticated;
