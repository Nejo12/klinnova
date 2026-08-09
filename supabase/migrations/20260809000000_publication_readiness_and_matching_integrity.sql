-- M5.1 Unit A1 (D-M5-19) — publication and matching integrity restoration.
--
-- Closes three confirmed, independently root-caused defects discovered by
-- the M5.1 Unit I baseline browser proof:
--
-- 1. employer_vacancy_draft_readiness (PR 4.3) and
--    _employer_vacancy_publish_missing (PR 5.2) are two independently
--    authoritative "is this vacancy ready" functions that silently
--    diverged — the publish gate has required verification/workplace_type/
--    work_frequency/cv_required/interview_english_ok since PR 5.2, none of
--    which the on-page readiness checklist has ever checked.
-- 2. 20260805110000_verification_and_vacancy_publication.sql silently
--    weakened vacancies_employment_types_nonempty_chk /
--    vacancies_shift_requirements_nonempty_chk from the original
--    publication-state-based exemption (publication_state = 'draft' or
--    cardinality(...) > 0, from 20260804120000) to a source-based one
--    (source <> 'seed' or cardinality(...) > 0) — trivially true for every
--    employer-sourced vacancy in every publication state, permanently.
--    This is restored here, not reinterpreted.
--
-- Explicitly NOT changed by this migration: the matcher
-- (_evaluate_candidate_vacancy_eligibility, 20260806000000) and its callers
-- are untouched. An empty employment_types/shift_requirements array
-- continues to mean "excludes every candidate" — never "no restriction".
-- Treating empty as a wildcard was considered and rejected: it would
-- silently match candidates against requirements the employer never
-- actually specified, a worse failure mode than the current one.

-- =============================================================================
-- 1. Restore the original publication-state-based nonempty exemption
-- =============================================================================

alter table public.vacancies
  drop constraint vacancies_employment_types_nonempty_chk,
  drop constraint vacancies_shift_requirements_nonempty_chk,
  add constraint vacancies_employment_types_nonempty_chk
    check (publication_state = 'draft' or cardinality(employment_types) > 0),
  add constraint vacancies_shift_requirements_nonempty_chk
    check (publication_state = 'draft' or cardinality(shift_requirements) > 0);

-- =============================================================================
-- 2. _employer_vacancy_publish_missing — require employment_types/
--    shift_requirements at publication, matching the matcher's own
--    requirement that these arrays be non-empty to match any candidate.
-- =============================================================================

create or replace function public._employer_vacancy_publish_missing(
  p_vacancy public.vacancies,
  p_employer public.employer_profiles,
  p_at timestamptz
)
returns text[]
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  missing text[] := '{}'::text[];
begin
  if p_employer.onboarding_completed_at is null then
    missing := array_append(missing, 'employer_completion');
  end if;
  if p_employer.verification_state <> 'verified' then
    missing := array_append(missing, 'verification');
  end if;
  if (
    p_employer.employer_type = 'private'
    and p_vacancy.company_id is not null
  ) or (
    p_employer.employer_type = 'organisation'
    and not exists (
      select 1 from public.companies c
      where c.id = p_vacancy.company_id
        and c.source = 'employer'
        and c.owner_employer_id = p_employer.id
    )
  ) then
    missing := array_append(missing, 'company');
  end if;
  if nullif(btrim(p_vacancy.title), '') is null then missing := array_append(missing, 'title'); end if;
  if nullif(btrim(p_vacancy.job_category), '') is null then missing := array_append(missing, 'job_category'); end if;
  if nullif(btrim(p_vacancy.description), '') is null then missing := array_append(missing, 'description'); end if;
  if p_vacancy.city <> 'Berlin' or nullif(btrim(p_vacancy.public_locality), '') is null then
    missing := array_append(missing, 'public_locality');
  end if;
  if p_vacancy.workplace_type is null then missing := array_append(missing, 'workplace_type'); end if;
  if p_vacancy.work_frequency is null then missing := array_append(missing, 'work_frequency'); end if;
  if p_vacancy.salary_amount_cents is null
     or p_vacancy.salary_amount_cents <= 0
     or p_vacancy.salary_currency <> 'EUR'
     or p_vacancy.salary_period is null
     or p_vacancy.salary_is_gross is distinct from true
  then
    missing := array_append(missing, 'salary');
  end if;
  if not exists (
    select 1 from public.vacancy_language_requirements vlr
    where vlr.vacancy_id = p_vacancy.id
  ) then
    missing := array_append(missing, 'languages');
  end if;
  if p_vacancy.cv_required is null then missing := array_append(missing, 'cv_required'); end if;
  if p_vacancy.interview_english_ok is null then missing := array_append(missing, 'interview_english_ok'); end if;
  if cardinality(p_vacancy.employment_types) = 0 then
    missing := array_append(missing, 'employment_types');
  end if;
  if cardinality(p_vacancy.shift_requirements) = 0 then
    missing := array_append(missing, 'shift_requirements');
  end if;
  if p_vacancy.expires_at is null
     or p_vacancy.expires_at <= p_at
     or p_vacancy.expires_at > p_at + interval '90 days'
  then
    missing := array_append(missing, 'expiry');
  end if;
  return missing;
end;
$$;

comment on function public._employer_vacancy_publish_missing(
  public.vacancies, public.employer_profiles, timestamptz
) is
  'D-M5-19: adds employment_types/shift_requirements to the publish gate — a vacancy with either array empty can no longer reach published. The matcher already required non-empty arrays to match any candidate; this closes the gap that let an incomplete vacancy publish anyway. expiry is evaluated against the caller-supplied/defaulted value already merged onto the in-memory row by publish_employer_vacancy/resume_employer_vacancy before this function runs — it is never actually missing in the ordinary UI flow (the UI never asks for a custom expiry), which is why employer_vacancy_draft_readiness deliberately does not surface it pre-publish (see that function''s own comment).';

-- =============================================================================
-- 3. employer_vacancy_draft_readiness — bring the pre-publish checklist
--    into alignment with what publish will actually require, so the two
--    can never disagree again.
-- =============================================================================
--
-- Deliberately does NOT add an "expiry" item: expires_at is genuinely null
-- on every draft (it is only ever set as a side effect of a successful
-- publish, defaulted to now()+30 days when the caller supplies none — see
-- publish_employer_vacancy). Surfacing it here would show a permanent,
-- unfixable "Missing: expiry" that publish itself will never actually be
-- blocked by in the ordinary UI flow, recreating the exact class of
-- checklist/publish-gate disagreement this migration exists to close.

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

  if profile.verification_state is distinct from 'verified' then
    missing := array_append(missing, 'verification');
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

  if vacancy.workplace_type is null then
    missing := array_append(missing, 'workplace_type');
  end if;

  if vacancy.work_frequency is null then
    missing := array_append(missing, 'work_frequency');
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

  if cardinality(vacancy.employment_types) = 0 then
    missing := array_append(missing, 'employment_types');
  end if;

  if cardinality(vacancy.shift_requirements) = 0 then
    missing := array_append(missing, 'shift_requirements');
  end if;

  if vacancy.cv_required is null then
    missing := array_append(missing, 'cv_required');
  end if;

  if vacancy.interview_english_ok is null then
    missing := array_append(missing, 'interview_english_ok');
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

comment on function public.employer_vacancy_draft_readiness(uuid) is
  'D-M5-19: brought into alignment with _employer_vacancy_publish_missing — verification, workplace_type, work_frequency, cv_required, interview_english_ok, employment_types, and shift_requirements are now all checked here too, so this checklist and the publish gate can never disagree again. Deliberately excludes "expiry": expires_at is genuinely null pre-publish and is always defaulted by publish_employer_vacancy before its own gate runs, so surfacing it here would be a permanent false negative, not a real blocker.';
