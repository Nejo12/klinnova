-- PR 5.5c — Canonical candidate matching / transactional application-eligibility
-- contract (D-012, D-025, D-029, D-030, D-062). Additive only: no table
-- change, no RLS change, no anon grant expansion. Ports the existing
-- deterministic TypeScript matcher (src/lib/matching/{rules,ranks,
-- match-candidate-to-vacancy}.ts) into one canonical, non-short-circuiting
-- SQL evaluator shared by candidate discovery and transactional application
-- submission, so both agree by construction rather than by convention.
--
-- Audited rule-by-rule against the TypeScript source before writing this
-- file (see PR 5.5c pre-commit report for the full input/rule matrix). Every
-- rule below is a direct port, not an invented addition:
--   - category:        vacancy.job_category = any(candidate.job_categories)
--   - employment_type:  non-empty intersection of employment_types arrays
--   - shift:            candidate 'flexible' short-circuits true; else
--                        non-empty intersection of concrete shift arrays
--   - german:            candidate rank >= vacancy rank (none/basic/
--                        conversational/comfortable = 0/1/2/3)
--   - language:          every vacancy_language_requirements row must be met
--                        by a candidate_languages row of the same code at
--                        >= required proficiency rank (basic/conversational/
--                        proficient/native = 0/1/2/3); zero requirement rows
--                        always satisfied
--   - availability:      vacancy.available_from null => always satisfied
--                        (flexible); else candidate.available_from must be
--                        <= vacancy.available_from
--
-- `city` is deliberately not a rule: `candidate_profiles_city_berlin_chk` and
-- `vacancies_city_berlin_chk` already force both sides to literal 'Berlin'
-- whenever a value is present, and completion requires candidate.city to be
-- set, so the location rule can never fail in practice (D-030) and is not
-- worth a missing-requirement code.
--
-- Unlike the TypeScript matcher (which short-circuits on the first failing
-- rule), the evaluator checks every rule independently so it can report
-- every unmet requirement, not just the first — an explicit PR 5.5c
-- requirement, not a behavioural drift from the TypeScript source, since the
-- TypeScript matcher's eligibility *conclusion* (eligible iff every rule
-- passes) is preserved exactly.

-- ---------------------------------------------------------------------------
-- Rank helpers (internal; mirror src/lib/matching/ranks.ts exactly)
-- ---------------------------------------------------------------------------

create or replace function public._german_comfort_rank(p_level text)
returns integer
language sql
immutable
security definer
set search_path to pg_catalog, public
as $$
  select case p_level
    when 'none' then 0
    when 'basic' then 1
    when 'conversational' then 2
    when 'comfortable' then 3
    else null
  end;
$$;

revoke all on function public._german_comfort_rank(text)
  from public, anon, authenticated;

create or replace function public._language_proficiency_rank(p_level text)
returns integer
language sql
immutable
security definer
set search_path to pg_catalog, public
as $$
  select case p_level
    when 'basic' then 0
    when 'conversational' then 1
    when 'proficient' then 2
    when 'native' then 3
    else null
  end;
$$;

revoke all on function public._language_proficiency_rank(text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Canonical internal evaluator — not executable by anon or authenticated.
-- Callable only from within other SECURITY DEFINER functions (same pattern
-- as `_is_active_verification_operator`): the owner's implicit EXECUTE
-- right lets a definer-context caller invoke it despite the revoke below.
-- ---------------------------------------------------------------------------

create or replace function public._evaluate_candidate_vacancy_eligibility(
  p_candidate_id uuid,
  p_vacancy_id uuid,
  p_at timestamptz
)
returns table (
  eligible boolean,
  missing_requirements text[]
)
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  candidate public.candidate_profiles%rowtype;
  vacancy public.vacancies%rowtype;
  missing text[] := '{}'::text[];
begin
  select * into candidate
  from public.candidate_profiles
  where id = p_candidate_id;

  select * into vacancy
  from public.vacancies
  where id = p_vacancy_id;

  -- Defensive only: callers are expected to have already verified a
  -- completed candidate and an effective-public vacancy before calling.
  if not found or candidate.id is null then
    return query select false, array['category', 'employment_type', 'shift', 'german', 'language', 'availability']::text[];
    return;
  end if;

  if not (vacancy.job_category = any(candidate.job_categories)) then
    missing := array_append(missing, 'category');
  end if;

  if not exists (
    select 1
    from unnest(candidate.employment_types) c(code)
    join unnest(vacancy.employment_types) v(code) using (code)
  ) then
    missing := array_append(missing, 'employment_type');
  end if;

  if not (
    'flexible' = any(candidate.shift_preferences)
    or exists (
      select 1
      from unnest(candidate.shift_preferences) c(code)
      join unnest(vacancy.shift_requirements) v(code) using (code)
    )
  ) then
    missing := array_append(missing, 'shift');
  end if;

  if coalesce(
    public._german_comfort_rank(candidate.german_comfort)
      >= public._german_comfort_rank(vacancy.german_requirement),
    false
  ) is not true then
    missing := array_append(missing, 'german');
  end if;

  if exists (
    select 1
    from public.vacancy_language_requirements vlr
    where vlr.vacancy_id = p_vacancy_id
      and not exists (
        select 1
        from public.candidate_languages cl
        where cl.candidate_id = p_candidate_id
          and cl.language_code = vlr.language_code
          and coalesce(
            public._language_proficiency_rank(cl.proficiency)
              >= public._language_proficiency_rank(vlr.min_proficiency),
            false
          )
      )
  ) then
    missing := array_append(missing, 'language');
  end if;

  if vacancy.available_from is not null
     and candidate.available_from > vacancy.available_from
  then
    missing := array_append(missing, 'availability');
  end if;

  return query select (cardinality(missing) = 0), missing;
end;
$$;

comment on function public._evaluate_candidate_vacancy_eligibility(uuid, uuid, timestamptz) is
  'PR 5.5c: canonical deterministic eligibility evaluator, ported rule-for-rule from src/lib/matching. Internal only — no anon/authenticated grant. Checks every rule (does not short-circuit) so callers can report every missing requirement.';

revoke all on function public._evaluate_candidate_vacancy_eligibility(uuid, uuid, timestamptz)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Current-candidate detail RPC. Mirrors the existing
-- `resolveCandidateVacancyMatch` status split (incomplete vs unavailable vs
-- ready) that `/candidate/jobs/[vacancyId]` already depends on for its
-- redirect targets — collapsing those into one shape would be a regression
-- for PR 5.5d, not a simplification. Unlike the public PR 5.5a projection,
-- unknown/non-public vacancies and unauthenticated/incomplete candidates are
-- NOT distinguished from each other in structure (both return one row with a
-- status column) so there is still no existence oracle beyond what the
-- existing TypeScript flow already exposes.
-- ---------------------------------------------------------------------------

create or replace function public.resolve_current_candidate_vacancy_match(
  p_vacancy_id uuid
)
returns table (
  status text,
  eligible boolean,
  missing_requirements text[]
)
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

  if not found or candidate.onboarding_completed_at is null then
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

comment on function public.resolve_current_candidate_vacancy_match(uuid) is
  'PR 5.5c: authenticated-only current-candidate eligibility for one currently effective-public vacancy. Identity from auth.uid() only — no candidate/user ID parameter, no caller-controlled timestamp. Returns exactly one row: status in (unavailable, incomplete, eligible, ineligible). Does not return public vacancy fields — PR 5.5d composes this with the PR 5.5a get_effective_public_vacancy* RPCs.';

revoke all on function public.resolve_current_candidate_vacancy_match(uuid)
  from public, anon;
grant execute on function public.resolve_current_candidate_vacancy_match(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Current-candidate list RPC. Mirrors the existing `/candidate/matches`
-- product behaviour exactly: `matchCandidateToVacancies` is a hard filter
-- that only ever returns full matches, never a ranked or partial list — so
-- this RPC also returns eligible rows only, not "all effective-public with
-- match status." Reuses the PR 5.5a public projection field set so PR 5.5d
-- can render cards from one call, matching the composition pattern already
-- established by PR 5.5b's list loader (one language RPC call per row).
-- ---------------------------------------------------------------------------

create or replace function public.list_current_candidate_vacancy_matches()
returns table (
  vacancy_id uuid,
  title text,
  description text,
  job_category text,
  public_locality text,
  workplace_type text,
  work_frequency text,
  cv_required boolean,
  interview_english_ok boolean,
  source text,
  employer_type text,
  employer_display_name text,
  company_name text,
  website text,
  published_at timestamptz,
  expires_at timestamptz,
  eligible boolean,
  missing_requirements text[]
)
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

  if not found or candidate.onboarding_completed_at is null then
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

comment on function public.list_current_candidate_vacancy_matches() is
  'PR 5.5c: authenticated-only current-candidate matches. No arguments — identity from auth.uid() only. Returns only currently effective-public vacancies the candidate is eligible for (mirrors the existing /candidate/matches hard-filter behaviour), ordered published_at desc, id asc. eligible/missing_requirements are included for contract completeness (always eligible=true, missing_requirements=''{}'' for included rows).';

revoke all on function public.list_current_candidate_vacancy_matches()
  from public, anon;
grant execute on function public.list_current_candidate_vacancy_matches()
  to authenticated;

-- ---------------------------------------------------------------------------
-- Transactional application enforcement. Signature and result contract are
-- preserved exactly (still `submit_candidate_application(p_vacancy_id uuid)
-- returns jsonb`); the narrow category-only check ("Narrow category
-- membership only — not a full matcher; miss -> unavailable", see the
-- pre-existing pgTAP comment this PR updates) is replaced by the canonical
-- evaluator, which additionally covers employment type, shift, German, other
-- languages, and availability — closing the gap where a candidate who never
-- matched on those rules could still successfully apply. `already_applied`
-- is still resolved before eligibility so a stale/retried submission for an
-- existing application remains idempotent rather than newly rejected as
-- ineligible (D-040). The one new JSONB shape is `{"result": "ineligible",
-- "missing_requirements": [...]}` — purely additive to the existing
-- discriminated result; PR 5.5b's Zod schema
-- (submitApplicationRpcResultSchema) does not know this discriminant yet and
-- will fail validation safely into the existing generic `{status:
-- "failure"}` path (see PR 5.5c report for why this is deferred to PR 5.5d
-- rather than changed here).
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
  'Auth-bound submit with vacancy row lock and canonical effective-public recheck. PR 5.5c: eligibility is now enforced transactionally via the shared canonical evaluator (category, employment type, shift, German, other languages, availability) instead of a category-only check; ineligible submissions are rejected before insert with {"result":"ineligible","missing_requirements":[...]}. Preserves immutable v1 snapshots and uniqueness.';

revoke all on function public.submit_candidate_application(uuid) from public, anon;
grant execute on function public.submit_candidate_application(uuid) to authenticated;
