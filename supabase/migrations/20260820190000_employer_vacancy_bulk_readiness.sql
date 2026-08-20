-- P3.7-B: set-based readiness lookup for employer vacancy lists.
--
-- This is intentionally additive. The single-vacancy
-- employer_vacancy_draft_readiness(uuid) contract remains the source of truth
-- for detail/edit pages and existing callers; list loaders can use this bulk
-- RPC to avoid one client/database round trip per draft row.

create or replace function public.employer_vacancy_drafts_readiness(
  p_vacancy_ids uuid[]
)
returns table (
  vacancy_id uuid,
  ready boolean,
  missing text[]
)
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  with caller as (
    select auth.uid() as uid
  ),
  input_ids as (
    select requested.vacancy_id, min(requested.ordinality) as ordinality
    from unnest(coalesce(p_vacancy_ids, array[]::uuid[]))
      with ordinality as requested(vacancy_id, ordinality)
    where requested.vacancy_id is not null
    group by requested.vacancy_id
  ),
  profile as (
    select ep.*
    from public.employer_profiles ep
    join caller c on c.uid = ep.id
    where c.uid is not null
      and not public._is_employer_deleted(c.uid)
  ),
  authorized_vacancies as (
    select
      input_ids.ordinality,
      v.*,
      profile.employer_type,
      profile.onboarding_completed_at,
      profile.verification_state
    from input_ids
    join caller c on true
    join public.vacancies v on v.id = input_ids.vacancy_id
    join profile on profile.id = c.uid
    where v.source = 'employer'
      and v.employer_profile_id = c.uid
  ),
  language_counts as (
    select vlr.vacancy_id, count(*)::integer as language_count
    from public.vacancy_language_requirements vlr
    join authorized_vacancies av on av.id = vlr.vacancy_id
    group by vlr.vacancy_id
  ),
  computed as (
    select
      av.id as vacancy_id,
      av.ordinality,
      array_remove(
        array[
          case
            when av.onboarding_completed_at is null
              then 'employer_completion'
          end,
          case
            when av.verification_state is distinct from 'verified'
              then 'verification'
          end,
          case
            when av.publication_state is distinct from 'draft'
              then 'publication_state'
          end,
          case
            when av.title is null or char_length(btrim(av.title)) = 0
              then 'title'
          end,
          case when av.job_category is null then 'job_category' end,
          case
            when av.public_locality is null
              or char_length(btrim(av.public_locality)) = 0
              then 'public_locality'
          end,
          case
            when av.description is null
              or char_length(btrim(av.description)) = 0
              then 'description'
          end,
          case when av.workplace_type is null then 'workplace_type' end,
          case when av.work_frequency is null then 'work_frequency' end,
          case
            when av.salary_amount_cents is null
              or av.salary_period is null
              or av.salary_is_gross is distinct from true
              or av.salary_currency is distinct from 'EUR'
              then 'salary'
          end,
          case
            when coalesce(language_counts.language_count, 0) < 1
              then 'languages'
          end,
          case
            when cardinality(av.employment_types) = 0
              then 'employment_types'
          end,
          case
            when cardinality(av.shift_requirements) = 0
              then 'shift_requirements'
          end,
          case when av.cv_required is null then 'cv_required' end,
          case
            when av.interview_english_ok is null
              then 'interview_english_ok'
          end,
          case
            when av.employer_type = 'organisation' and av.company_id is null
              then 'company'
          end,
          case
            when av.employer_type = 'private' and av.company_id is not null
              then 'company'
          end
        ],
        null
      )::text[] as missing
    from authorized_vacancies av
    left join language_counts on language_counts.vacancy_id = av.id
  )
  select
    computed.vacancy_id,
    coalesce(cardinality(computed.missing), 0) = 0 as ready,
    computed.missing
  from computed
  order by computed.ordinality;
$$;

comment on function public.employer_vacancy_drafts_readiness(uuid[]) is
  'P3.7-B bulk publication-readiness evaluation for current employer-owned vacancy IDs. Unauthorized IDs are omitted rather than surfaced, preventing existence/readiness leakage.';

revoke all on function public.employer_vacancy_drafts_readiness(uuid[])
  from public, anon;
grant execute on function public.employer_vacancy_drafts_readiness(uuid[])
  to authenticated;
