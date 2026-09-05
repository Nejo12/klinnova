-- Issue #203 / Batch 12: one optional candidate-authored introduction,
-- submitted atomically with the existing application RPC.

alter table public.applications
  add column introduction_text text null;

alter table public.applications
  add constraint applications_introduction_text_contract
  check (
    introduction_text is null
    or (
      introduction_text = regexp_replace(
        introduction_text,
        '^[[:space:]]+|[[:space:]]+$',
        '',
        'g'
      )
      and char_length(introduction_text) between 1 and 1000
    )
  );

comment on column public.applications.introduction_text is
  'Optional final candidate-authored application introduction. Trimmed and validated by submit_candidate_application; drafts and suggestions are never persisted.';

-- Remove the prior one-argument signature instead of leaving an overloaded
-- PostgREST RPC. The default preserves compatibility for callers that omit
-- the optional introduction argument.
drop function public.submit_candidate_application(uuid);

create function public.submit_candidate_application(
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
  'Candidate-owned atomic application submission. The optional introduction is trimmed, blank-normalized to null, bounded to 1,000 characters, and stored only with a newly created application. Eligibility, availability, idempotency and snapshots remain authoritative here.';

revoke all on function public.submit_candidate_application(uuid, text)
  from public, anon, service_role;
grant execute on function public.submit_candidate_application(uuid, text)
  to authenticated;

create or replace function public.get_current_employer_application(
  p_application_id uuid
)
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

  is_deleted := coalesce(
    (app.candidate_snapshot ->> 'deleted')::boolean,
    false
  );

  if is_deleted then
    return jsonb_build_object(
      'status', 'ready',
      'application_id', app.id,
      'vacancy_id', app.vacancy_id,
      'vacancy_title', vacancy_title,
      'submitted_at', app.submitted_at,
      'current_status', app.status,
      'candidate_deleted', true,
      'candidate_display_name', 'Deleted candidate',
      'introduction_text', null,
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
    'introduction_text', app.introduction_text,
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

comment on function public.get_current_employer_application(uuid) is
  'Employer-owned application detail. Ownership is checked through the application vacancy; candidate introduction is returned only to the owning employer and is null after candidate deletion.';

revoke all on function public.get_current_employer_application(uuid)
  from public, anon, service_role;
grant execute on function public.get_current_employer_application(uuid)
  to authenticated;

create or replace function public._anonymize_candidate_domain(
  p_candidate_id uuid,
  p_ts timestamptz
)
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
    introduction_text = null
  where candidate_id = p_candidate_id;
end;
$$;

comment on function public._anonymize_candidate_domain(uuid, timestamptz) is
  'D-078 candidate anonymization. Candidate snapshots become the minimal deleted tombstone and candidate-authored application introductions are erased. Application identity, status, timestamps, vacancy snapshot and history remain preserved.';

revoke all on function public._anonymize_candidate_domain(uuid, timestamptz)
  from public, anon, authenticated, service_role;
