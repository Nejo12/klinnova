-- #278: smallest evolution of #231; no payload or channel/email coupling.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('new_application', 'application_shortlisted', 'application_accepted', 'application_rejected'));
comment on table public.notifications is
  'Durable Employer new-application and Candidate shortlisted/accepted/rejected history. Context is derived from the authorized application; no private authored payload.';

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

  -- #278: durable Candidate history commits with the transition and audit.
  -- A failure here rolls back both writes; same-state retries return above.
  if p_target_status in ('shortlisted', 'accepted', 'rejected') then
    insert into public.notifications (recipient_user_id, kind, application_id, created_at)
    values (app.candidate_id, 'application_' || p_target_status, app.id, ts);
  end if;

  return jsonb_build_object(
    'result', 'updated',
    'application_id', app.id,
    'previous_status', app.status,
    'current_status', p_target_status,
    'occurred_at', ts
  );
end;
$$;

create or replace function public.list_current_employer_notifications()
returns table(
  notification_id uuid,
  kind text,
  application_id uuid,
  vacancy_title text,
  created_at timestamptz,
  read_at timestamptz
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

  select * into employer
  from public.employer_profiles
  where id = uid;

  if not found
     or employer.onboarding_completed_at is null
     or public._is_employer_suspended(uid)
     or public._is_employer_deleted(uid)
  then
    return;
  end if;

  return query
  select n.id, n.kind, n.application_id, v.title, n.created_at, n.read_at
  from public.notifications n
  join public.applications a on a.id = n.application_id
  join public.vacancies v on v.id = a.vacancy_id
  where n.kind = 'new_application'
    and n.recipient_user_id = uid
    and v.source = 'employer'
    and v.employer_profile_id = uid
  order by n.created_at desc, n.id asc;
end;
$$;

create or replace function public.mark_current_employer_notification_read(
  p_notification_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  employer public.employer_profiles%rowtype;
  notification_application_id uuid;
begin
  if uid is null or p_notification_id is null then
    return jsonb_build_object('result', 'unavailable');
  end if;

  select * into employer
  from public.employer_profiles
  where id = uid;

  if not found
     or employer.onboarding_completed_at is null
     or public._is_employer_suspended(uid)
     or public._is_employer_deleted(uid)
  then
    return jsonb_build_object('result', 'employer_unavailable');
  end if;

  update public.notifications n
  set read_at = coalesce(n.read_at, clock_timestamp())
  from public.applications a
  join public.vacancies v on v.id = a.vacancy_id
  where n.kind = 'new_application'
    and n.id = p_notification_id
    and n.recipient_user_id = uid
    and a.id = n.application_id
    and v.source = 'employer'
    and v.employer_profile_id = uid
  returning n.application_id into notification_application_id;

  if notification_application_id is null then
    return jsonb_build_object('result', 'unavailable');
  end if;

  return jsonb_build_object(
    'result', 'ok',
    'application_id', notification_application_id
  );
end;
$$;

create or replace function public.mark_all_current_employer_notifications_read()
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  employer public.employer_profiles%rowtype;
  updated_count integer;
begin
  if uid is null then
    return jsonb_build_object('result', 'unavailable', 'updated_count', 0);
  end if;

  select * into employer
  from public.employer_profiles
  where id = uid;

  if not found
     or employer.onboarding_completed_at is null
     or public._is_employer_suspended(uid)
     or public._is_employer_deleted(uid)
  then
    return jsonb_build_object(
      'result', 'employer_unavailable',
      'updated_count', 0
    );
  end if;

  update public.notifications
  set read_at = clock_timestamp()
  where kind = 'new_application'
    and recipient_user_id = uid
    and read_at is null;

  get diagnostics updated_count = row_count;

  return jsonb_build_object(
    'result', 'ok',
    'updated_count', updated_count
  );
end;
$$;

-- Candidate projections use immutable submission context, so closed/non-public
-- vacancies remain understandable. Private rejection reason is never selected.
create function public.list_current_candidate_notifications()
returns table(notification_id uuid, kind text, application_id uuid,
  vacancy_title text, employer_display_name text, created_at timestamptz, read_at timestamptz)
language sql stable security definer
set search_path to pg_catalog, public
as $$
  select n.id, n.kind, n.application_id,
    a.vacancy_snapshot->>'title',
    coalesce(a.vacancy_snapshot->>'employer_display_name', ''), n.created_at, n.read_at
  from public.notifications n
  join public.applications a on a.id = n.application_id
  join public.candidate_profiles cp on cp.id = a.candidate_id
  where n.recipient_user_id = auth.uid()
    and a.candidate_id = auth.uid()
    and cp.onboarding_completed_at is not null
    and cp.account_deleted_at is null
    and n.kind in ('application_shortlisted', 'application_accepted', 'application_rejected')
  order by n.created_at desc, n.id asc;
$$;
revoke all on function public.list_current_candidate_notifications() from public, anon;
grant execute on function public.list_current_candidate_notifications() to authenticated;

create function public.count_current_candidate_unread_notifications()
returns integer
language sql stable security definer
set search_path to pg_catalog, public
as $$
  select count(*)::integer from public.list_current_candidate_notifications() where read_at is null;
$$;
revoke all on function public.count_current_candidate_unread_notifications() from public, anon;
grant execute on function public.count_current_candidate_unread_notifications() to authenticated;

create function public.mark_current_candidate_notification_read(p_notification_id uuid)
returns jsonb
language plpgsql security definer
set search_path to pg_catalog, public
as $$
declare
  destination uuid;
begin
  update public.notifications n
  set read_at = coalesce(n.read_at, clock_timestamp())
  from public.applications a
  join public.candidate_profiles cp on cp.id = a.candidate_id
  where n.id = p_notification_id
    and n.recipient_user_id = auth.uid()
    and a.id = n.application_id
    and a.candidate_id = auth.uid()
    and cp.onboarding_completed_at is not null
    and cp.account_deleted_at is null
    and n.kind in ('application_shortlisted', 'application_accepted', 'application_rejected')
  returning n.application_id into destination;
  if destination is null then
    return jsonb_build_object('result', 'unavailable');
  end if;
  return jsonb_build_object('result', 'ok', 'application_id', destination);
end;
$$;
revoke all on function public.mark_current_candidate_notification_read(uuid) from public, anon;
grant execute on function public.mark_current_candidate_notification_read(uuid) to authenticated;

create function public.mark_all_current_candidate_notifications_read()
returns jsonb
language plpgsql security definer
set search_path to pg_catalog, public
as $$
declare
  updated_count integer;
begin
  if not exists (select 1 from public.candidate_profiles cp
    where cp.id = auth.uid() and cp.onboarding_completed_at is not null and cp.account_deleted_at is null) then
    return jsonb_build_object('result', 'unavailable', 'updated_count', 0);
  end if;
  update public.notifications n
  set read_at = clock_timestamp()
  from public.applications a
  where n.recipient_user_id = auth.uid()
    and a.id = n.application_id and a.candidate_id = auth.uid()
    and n.read_at is null
    and n.kind in ('application_shortlisted', 'application_accepted', 'application_rejected');
  get diagnostics updated_count = row_count;
  return jsonb_build_object('result', 'ok', 'updated_count', updated_count);
end;
$$;
revoke all on function public.mark_all_current_candidate_notifications_read() from public, anon;
grant execute on function public.mark_all_current_candidate_notifications_read() to authenticated;
