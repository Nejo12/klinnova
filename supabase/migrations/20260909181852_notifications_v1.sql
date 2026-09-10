-- Issue #231: durable in-app notification history for new applications.
-- The approved v1 event applies only to employer-owned vacancies. Existing
-- seed/demo application behavior remains unchanged and creates no recipient
-- notification because those vacancies have no owning auth identity.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  application_id uuid not null references public.applications(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz null,
  constraint notifications_kind_check check (kind = 'new_application'),
  constraint notifications_recipient_application_kind_key
    unique (recipient_user_id, application_id, kind)
);

create index notifications_recipient_created_at_idx
  on public.notifications (recipient_user_id, created_at desc);

comment on table public.notifications is
  'Issue #231 durable in-app Employer notification history. V1 supports new_application only; presentation context is derived from the authorized application and vacancy at read time.';
comment on column public.notifications.read_at is
  'Null means unread. Only the recipient may update this column.';

alter table public.notifications enable row level security;

create policy notifications_select_recipient
  on public.notifications
  for select
  to authenticated
  using (recipient_user_id = (select auth.uid()));

create policy notifications_update_recipient
  on public.notifications
  for update
  to authenticated
  using (recipient_user_id = (select auth.uid()))
  with check (recipient_user_id = (select auth.uid()));

revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

create function public.list_current_employer_notifications()
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
  where n.recipient_user_id = uid
    and v.source = 'employer'
    and v.employer_profile_id = uid
  order by n.created_at desc, n.id asc;
end;
$$;

comment on function public.list_current_employer_notifications() is
  'Newest-first new-application notification history for the current completed, active Employer. Vacancy context is derived at read time; authored introduction text is never returned.';

revoke all on function public.list_current_employer_notifications()
  from public, anon;
grant execute on function public.list_current_employer_notifications()
  to authenticated;

create function public.mark_current_employer_notification_read(
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
  where n.id = p_notification_id
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

comment on function public.mark_current_employer_notification_read(uuid) is
  'Idempotently marks one owned notification read and returns its authorized application destination. It never changes application or vacancy state.';

revoke all on function public.mark_current_employer_notification_read(uuid)
  from public, anon;
grant execute on function public.mark_current_employer_notification_read(uuid)
  to authenticated;

create function public.mark_all_current_employer_notifications_read()
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
  where recipient_user_id = uid
    and read_at is null;

  get diagnostics updated_count = row_count;

  return jsonb_build_object(
    'result', 'ok',
    'updated_count', updated_count
  );
end;
$$;

comment on function public.mark_all_current_employer_notifications_read() is
  'Marks only the current Employer recipient notification rows read. Application and vacancy state are untouched.';

revoke all on function public.mark_all_current_employer_notifications_read()
  from public, anon;
grant execute on function public.mark_all_current_employer_notifications_read()
  to authenticated;

-- Replace the latest authoritative submission RPC so the application,
-- initial status-history event, and employer-owned notification commit in
-- the same database transaction. The existing signature/result vocabulary,
-- eligibility, snapshots, introduction, and idempotent retry behavior remain
-- unchanged.
create or replace function public.submit_candidate_application(
  p_vacancy_id uuid,
  p_introduction_text text default null
)
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
  v_introduction_text text := nullif(
    regexp_replace(
      coalesce(p_introduction_text, ''),
      '^[[:space:]]+|[[:space:]]+$',
      '',
      'g'
    ),
    ''
  );
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
    return jsonb_build_object(
      'result', 'already_applied',
      'application_id', existing_id
    );
  end if;

  if char_length(v_introduction_text) > 1000 then
    return jsonb_build_object('result', 'validation_error');
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
      introduction_text,
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
      v_introduction_text,
      1,
      candidate_snap,
      vacancy_snap,
      ts,
      ts
    )
    returning id into new_id;

    insert into public.application_status_history (
      application_id,
      from_status,
      to_status,
      actor_user_id,
      actor_role,
      reason,
      occurred_at
    ) values (
      new_id, null, 'submitted', uid, 'candidate', null, ts
    );

    if vacancy.source = 'employer' then
      insert into public.notifications (
        recipient_user_id,
        kind,
        application_id,
        created_at
      ) values (
        vacancy.employer_profile_id,
        'new_application',
        new_id,
        ts
      );
    end if;

    return jsonb_build_object(
      'result', 'submitted',
      'application_id', new_id
    );
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

comment on function public.submit_candidate_application(uuid, text) is
  'Candidate-owned atomic application submission. New employer-owned applications create one durable new_application notification in the same transaction; seed/demo applications have no recipient and create none. Existing eligibility, snapshots, introduction validation, and idempotency remain unchanged.';
