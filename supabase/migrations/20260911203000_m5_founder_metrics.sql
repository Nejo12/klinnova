-- Issue #238 — M5 Founder metrics persistence and aggregate readout.
-- Founder-developed / pre-funding / excluded from grant reimbursement.
--
-- This migration adds two narrow ledgers only:
-- 1. explicit M5 cohort enrollment for Candidates completed before M5; and
-- 2. the first canonically effective-public moment for each employer vacancy.
--
-- It is not a generic analytics/event framework. No user-authored content or
-- personal profile data is copied into either ledger.

create table public.m5_candidate_cohort_enrollments (
  candidate_user_id uuid primary key
    references public.candidate_profiles (id) on delete restrict,
  cohort text not null,
  enrolled_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  constraint m5_candidate_cohort_enrollments_cohort_chk
    check (cohort in ('cohort_a', 'cohort_b', 'cohort_c'))
);

comment on table public.m5_candidate_cohort_enrollments is
  'Issue #238: explicit append-only M5 enrollment for a pre-M5 completed Candidate. One row per Candidate prevents cohort ambiguity. No ordinary-user mutation path or UI.';

alter table public.m5_candidate_cohort_enrollments enable row level security;
revoke all on table public.m5_candidate_cohort_enrollments
  from public, anon, authenticated;
grant all on table public.m5_candidate_cohort_enrollments to service_role;

create table public.m5_vacancy_qualifications (
  vacancy_id uuid primary key
    references public.vacancies (id) on delete restrict,
  employer_profile_id uuid not null
    references public.employer_profiles (id) on delete restrict,
  qualified_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp()
);

comment on table public.m5_vacancy_qualifications is
  'Issue #238: append-only first moment an employer-submitted vacancy satisfies the canonical effective-public predicate. One row per vacancy; no generic payload or duplicated business rules.';

alter table public.m5_vacancy_qualifications enable row level security;
revoke all on table public.m5_vacancy_qualifications
  from public, anon, authenticated;
grant all on table public.m5_vacancy_qualifications to service_role;

create index m5_vacancy_qualifications_employer_qualified_idx
  on public.m5_vacancy_qualifications (employer_profile_id, qualified_at);

-- One private recorder for every enabling mutation. The canonical predicate is
-- the sole business-rule authority. ON CONFLICT makes concurrent/repeated
-- enabling paths idempotent and preserves the first qualification timestamp.
create or replace function public._record_m5_vacancy_qualification(
  p_vacancy_id uuid,
  p_qualified_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  inserted_id uuid;
begin
  insert into public.m5_vacancy_qualifications (
    vacancy_id,
    employer_profile_id,
    qualified_at
  )
  select
    v.id,
    v.employer_profile_id,
    p_qualified_at
  from public.vacancies v
  where v.id = p_vacancy_id
    and v.source = 'employer'
    and v.employer_profile_id is not null
    and public.is_vacancy_effectively_public(v.id, p_qualified_at)
  on conflict (vacancy_id) do nothing
  returning vacancy_id into inserted_id;

  return inserted_id is not null;
end;
$$;

revoke all on function public._record_m5_vacancy_qualification(uuid, timestamptz)
  from public, anon, authenticated, service_role;

-- Current authoritative enabling mutations:
-- - vacancy draft/paused -> published (publish/resume);
-- - employer onboarding incomplete -> complete;
-- - employer verification -> verified;
-- - employer suspension row removal; and
-- - vacancy moderation row removal.
-- Non-enabling updates may call the recorder only when one of those state edges
-- occurs; the canonical predicate then decides whether qualification is real.
create or replace function public._trg_capture_m5_vacancy_qualification()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  vacancy record;
  ts timestamptz := clock_timestamp();
begin
  if tg_table_name = 'vacancies' then
    if old.publication_state is distinct from 'published'
       and new.publication_state = 'published'
    then
      perform public._record_m5_vacancy_qualification(new.id, ts);
    end if;
    return new;
  end if;

  if tg_table_name = 'employer_profiles' then
    if (
      old.onboarding_completed_at is null
      and new.onboarding_completed_at is not null
    ) or (
      old.verification_state is distinct from 'verified'
      and new.verification_state = 'verified'
    ) then
      for vacancy in
        select v.id
        from public.vacancies v
        where v.employer_profile_id = new.id
          and v.source = 'employer'
          and v.publication_state = 'published'
      loop
        perform public._record_m5_vacancy_qualification(vacancy.id, ts);
      end loop;
    end if;
    return new;
  end if;

  if tg_table_name = 'employer_suspension' then
    for vacancy in
      select v.id
      from public.vacancies v
      where v.employer_profile_id = old.employer_profile_id
        and v.source = 'employer'
        and v.publication_state = 'published'
    loop
      perform public._record_m5_vacancy_qualification(vacancy.id, ts);
    end loop;
    return old;
  end if;

  if tg_table_name = 'vacancy_moderation' then
    perform public._record_m5_vacancy_qualification(old.vacancy_id, ts);
    return old;
  end if;

  raise exception 'unsupported_m5_qualification_trigger_source';
end;
$$;

revoke all on function public._trg_capture_m5_vacancy_qualification()
  from public, anon, authenticated, service_role;

create trigger vacancies_capture_m5_qualification
after update of publication_state on public.vacancies
for each row
execute function public._trg_capture_m5_vacancy_qualification();

create trigger employer_profiles_capture_m5_qualification
after update of onboarding_completed_at, verification_state
on public.employer_profiles
for each row
execute function public._trg_capture_m5_vacancy_qualification();

create trigger employer_unsuspension_capture_m5_qualification
after delete on public.employer_suspension
for each row
execute function public._trg_capture_m5_vacancy_qualification();

create trigger vacancy_restoration_capture_m5_qualification
after delete on public.vacancy_moderation
for each row
execute function public._trg_capture_m5_vacancy_qualification();

-- Historical M5 backfill: only publish/resume events directly prove all
-- readiness requirements enforced by the authoritative mutation at that
-- instant. Moderation was the one independent blocker not checked by those
-- mutations, so its durable audit state is reconstructed at the event time.
-- No current vacancy/profile state is used and no unsuspend/restore/onboarding
-- event is guessed where the existing ledgers cannot prove the full predicate.
insert into public.m5_vacancy_qualifications (
  vacancy_id,
  employer_profile_id,
  qualified_at
)
select distinct on (events.vacancy_id)
  events.vacancy_id,
  vacancies.employer_profile_id,
  events.occurred_at
from public.vacancy_lifecycle_events events
join public.vacancies vacancies on vacancies.id = events.vacancy_id
where events.event_type in ('published', 'resumed')
  and events.occurred_at >= '2026-08-08T23:35:02Z'::timestamptz
  and vacancies.source = 'employer'
  and vacancies.employer_profile_id is not null
  and coalesce((
    select audit.event_type = 'vacancy_moderated'
    from public.admin_audit_events audit
    where audit.target_kind = 'vacancy'
      and audit.target_id = events.vacancy_id
      and audit.event_type in ('vacancy_moderated', 'vacancy_restored')
      and audit.occurred_at <= events.occurred_at
    order by audit.occurred_at desc, audit.id desc
    limit 1
  ), false) = false
order by events.vacancy_id, events.occurred_at, events.id
on conflict (vacancy_id) do nothing;

-- Aggregate-only, read-only operator RPC. It exposes no identifiers, contact
-- data, user-authored content, or row-level records.
create or replace function public.get_m5_founder_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null or not public._is_active_verification_operator(uid) then
    raise exception 'm5_metrics_forbidden'
      using errcode = 'insufficient_privilege';
  end if;

  with
  constants as (
    select
      '2026-08-08T23:35:02Z'::timestamptz as m5_started_at,
      transaction_timestamp() as measured_at
  ),
  qualified_vacancies as (
    select qualifications.vacancy_id, qualifications.employer_profile_id
    from public.m5_vacancy_qualifications qualifications, constants
    where qualifications.qualified_at >= constants.m5_started_at
  ),
  counted_candidates as (
    select profiles.id
    from public.candidate_profiles profiles, constants
    where profiles.onboarding_completed_at is not null
      and (
        profiles.onboarding_completed_at >= constants.m5_started_at
        or exists (
          select 1
          from public.m5_candidate_cohort_enrollments enrollments
          where enrollments.candidate_user_id = profiles.id
        )
      )
  ),
  m5_applications as (
    select applications.id, applications.candidate_id, applications.status
    from public.applications applications
    join public.vacancies vacancies on vacancies.id = applications.vacancy_id
    cross join constants
    where applications.submitted_at >= constants.m5_started_at
      and vacancies.source = 'employer'
  ),
  active_interviews as (
    select outcomes.id, outcomes.application_id
    from public.application_outcome_events outcomes
    join m5_applications applications on applications.id = outcomes.application_id
    cross join constants
    where outcomes.outcome_type = 'interview_completed'
      and outcomes.voided_at is null
      and outcomes.occurred_at >= constants.m5_started_at
  ),
  active_hires as (
    select outcomes.application_id
    from public.application_outcome_events outcomes
    join m5_applications applications on applications.id = outcomes.application_id
    cross join constants
    where outcomes.outcome_type = 'hired'
      and outcomes.voided_at is null
      and outcomes.occurred_at >= constants.m5_started_at
  ),
  counts as (
    select
      (select count(distinct employer_profile_id) from qualified_vacancies) as participating_employers,
      (select count(*) from qualified_vacancies) as verified_vacancies,
      (select count(*) from counted_candidates) as completed_candidates,
      (select count(*) from m5_applications) as submitted_applications,
      (select count(distinct application_id) from active_interviews) as completed_interview_conversions,
      (select count(distinct application_id) from active_hires) as confirmed_hires,
      (
        select count(distinct qualifications.employer_profile_id)
        from qualified_vacancies qualifications
        join public.employer_profiles employers
          on employers.id = qualifications.employer_profile_id
        where employers.account_deleted_at is null
          and employers.onboarding_completed_at is not null
          and employers.verification_state = 'verified'
          and not public._is_employer_suspended(employers.id)
      ) as current_active_safe_employers,
      (
        select count(*)
        from public.vacancies vacancies, constants
        where vacancies.source = 'employer'
          and public.is_vacancy_effectively_public(
            vacancies.id,
            constants.measured_at
          )
      ) as current_effective_public_vacancies,
      (
        select count(*)
        from public.candidate_profiles profiles, constants
        where profiles.created_at >= constants.m5_started_at
      ) as raw_candidate_registrations,
      (
        select count(*)
        from m5_applications
        where status = 'reviewing'
      ) as applications_reviewing,
      (
        select count(*)
        from m5_applications
        where status = 'shortlisted'
      ) as applications_shortlisted,
      (select count(*) from active_interviews) as completed_interview_rounds,
      (
        select count(distinct applications.candidate_id)
        from m5_applications applications
        join counted_candidates candidates
          on candidates.id = applications.candidate_id
      ) as completed_candidates_with_application
  )
  select jsonb_build_object(
    'm5_started_at', constants.m5_started_at,
    'measured_at', constants.measured_at,
    'core', jsonb_build_object(
      'participating_employers', counts.participating_employers,
      'verified_vacancies', counts.verified_vacancies,
      'completed_candidates', counts.completed_candidates,
      'submitted_applications', counts.submitted_applications,
      'completed_interview_conversions', counts.completed_interview_conversions,
      'confirmed_hires', counts.confirmed_hires
    ),
    'current_supply', jsonb_build_object(
      'active_safe_participating_employers', counts.current_active_safe_employers,
      'effective_public_vacancies', counts.current_effective_public_vacancies
    ),
    'diagnostic', jsonb_build_object(
      'raw_candidate_registrations', counts.raw_candidate_registrations,
      'applications_reviewing', counts.applications_reviewing,
      'applications_shortlisted', counts.applications_shortlisted,
      'completed_interview_rounds', counts.completed_interview_rounds
    ),
    'conversions', jsonb_build_object(
      'candidate_to_application_percent',
        case when counts.completed_candidates = 0 then null
        else round(
          counts.completed_candidates_with_application::numeric
          * 100 / counts.completed_candidates,
          1
        ) end,
      'application_to_interview_percent',
        case when counts.submitted_applications = 0 then null
        else round(
          counts.completed_interview_conversions::numeric
          * 100 / counts.submitted_applications,
          1
        ) end,
      'interview_to_hire_percent',
        case when counts.completed_interview_conversions = 0 then null
        else round(
          counts.confirmed_hires::numeric
          * 100 / counts.completed_interview_conversions,
          1
        ) end
    )
  )
  into result
  from constants, counts;

  return result;
end;
$$;

comment on function public.get_m5_founder_metrics() is
  'Issue #238: active-operator-only aggregate M5 readout. Read-only and aggregate-only; returns no identities or user-authored content.';

revoke all on function public.get_m5_founder_metrics()
  from public, anon;
grant execute on function public.get_m5_founder_metrics()
  to authenticated;
