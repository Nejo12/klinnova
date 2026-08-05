-- PR 5.3a — Operator verification read contract (narrow, Auth-bound reads).
-- Adds: is_current_user_verification_operator(), list_pending_employer_verifications(),
-- get_employer_verification_review(uuid). No UI. No new operator-management RPC.
-- No authenticated SELECT policy on verification_operators. No broad
-- employer_profiles read policy. All three gate on the existing
-- _is_active_verification_operator(auth.uid()) helper from PR 5.2.

create or replace function public.is_current_user_verification_operator()
returns boolean
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select public._is_active_verification_operator(auth.uid());
$$;

comment on function public.is_current_user_verification_operator() is
  'PR 5.3a: caller-scoped active-operator check. Derives identity from auth.uid(); accepts no parameters; exposes no operator-list contents.';

revoke all on function public.is_current_user_verification_operator() from public, anon;
grant execute on function public.is_current_user_verification_operator() to authenticated;

create or replace function public.list_pending_employer_verifications()
returns table (
  employer_profile_id uuid,
  employer_type text,
  display_name text,
  company_name text,
  website text,
  onboarding_completed boolean,
  verification_state text,
  verification_requested_at timestamptz,
  verification_attested_at timestamptz,
  verification_attestation_version text
)
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select
    ep.id,
    ep.employer_type,
    ep.display_name,
    c.name,
    ep.website,
    (ep.onboarding_completed_at is not null),
    ep.verification_state,
    ep.verification_requested_at,
    ep.verification_attested_at,
    ep.verification_attestation_version
  from public.employer_profiles ep
  left join public.companies c
    on c.owner_employer_id = ep.id
    and c.source = 'employer'
    and ep.employer_type = 'organisation'
  where ep.verification_state = 'pending'
    and public._is_active_verification_operator(auth.uid())
  order by ep.verification_requested_at asc, ep.id asc;
$$;

comment on function public.list_pending_employer_verifications() is
  'PR 5.3a: minimum-field pending-verification list for active operators only. Non-operators receive a deterministic empty result (no exception, no partial data).';

revoke all on function public.list_pending_employer_verifications() from public, anon;
grant execute on function public.list_pending_employer_verifications() to authenticated;

create or replace function public.get_employer_verification_review(
  p_employer_profile_id uuid
)
returns table (
  employer_profile_id uuid,
  employer_type text,
  display_name text,
  company_name text,
  website text,
  berlin_locality text,
  onboarding_completed boolean,
  verification_state text,
  verification_requested_at timestamptz,
  verification_attested_at timestamptz,
  verification_attestation_version text,
  verification_reviewed_at timestamptz,
  verification_review_reason text
)
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select
    ep.id,
    ep.employer_type,
    ep.display_name,
    c.name,
    ep.website,
    ep.berlin_locality,
    (ep.onboarding_completed_at is not null),
    ep.verification_state,
    ep.verification_requested_at,
    ep.verification_attested_at,
    ep.verification_attestation_version,
    ep.verification_reviewed_at,
    ep.verification_review_reason
  from public.employer_profiles ep
  left join public.companies c
    on c.owner_employer_id = ep.id
    and c.source = 'employer'
    and ep.employer_type = 'organisation'
  where ep.id = p_employer_profile_id
    and ep.verification_state in ('pending', 'verified', 'rejected')
    and public._is_active_verification_operator(auth.uid());
$$;

comment on function public.get_employer_verification_review(uuid) is
  'PR 5.3a: minimum review-detail read for one employer, active operators only. Excludes reviewer identity. Non-operators, unsupported states (unverified/revoked), and unknown ids all return zero rows — PR 5.3b must treat this the same as "not currently reviewable" and defer to the approve/reject/revoke RPCs as the authoritative state check before mutating.';

revoke all on function public.get_employer_verification_review(uuid) from public, anon;
grant execute on function public.get_employer_verification_review(uuid) to authenticated;
