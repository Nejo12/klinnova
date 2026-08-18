-- Task M (P3 employer-presentation-polish, Founder Ruling #6) — additive
-- read-side projection of the already-shipped `applications.employer_seen_at`
-- column (added in 20260811000000_employer_application_seen_contract.sql)
-- onto the two employer-facing applicant RPCs. Neither RPC's write path,
-- authorization logic, or any other field changes — this migration only
-- adds one field/column to each function's existing return shape.
--
-- list_current_employer_applications: RETURNS TABLE's column list changes,
-- which CREATE OR REPLACE FUNCTION cannot do in Postgres — DROP + CREATE is
-- required, exactly as the original 20260807220000 migration's own comment
-- explains for the same reason. The DROP removes the function's grants, so
-- they are re-applied verbatim below.
--
-- get_current_employer_application: return type remains jsonb (unchanged),
-- so CREATE OR REPLACE is sufficient — no DROP, no grant/comment
-- re-declaration needed (its signature is unchanged, so its existing
-- comment/grant from earlier migrations still applies).

drop function if exists public.list_current_employer_applications(uuid, text);

create function public.list_current_employer_applications(p_vacancy_id uuid default null::uuid, p_status text default null::text)
returns table(application_id uuid, vacancy_id uuid, vacancy_title text, candidate_deleted boolean, candidate_display_name text, job_category text, german_comfort text, available_from text, current_status text, submitted_at timestamptz, updated_at timestamptz, employer_seen_at timestamptz)
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
    a.updated_at,
    a.employer_seen_at
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

comment on function public.list_current_employer_applications(uuid, text) is
  'Employer-owned applicant inventory (D-070, suspension-gated per D-072). Identity from auth.uid(); completed employer profile required, and not currently suspended; current verification not required. Ownership proven via vacancies.employer_profile_id, never a caller-supplied id. Optional vacancy/status filters; an unrecognised status filter or a suspended employer yields zero rows, not an error.';

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
      'status_history', history_json,
      'employer_seen_at', app.employer_seen_at
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
    'status_history', history_json,
    'employer_seen_at', app.employer_seen_at
  );
end;
$$;
