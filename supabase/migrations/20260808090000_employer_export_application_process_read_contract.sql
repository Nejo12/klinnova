-- Slice 8 PR 8.3a — employer export application-process read contract.
--
-- Implements the single narrow database primitive D-089 accepted: a
-- SECURITY DEFINER RPC exposing only the employer's own recruitment-process
-- metadata (application id/vacancy id/status/submitted_at) for D-077's
-- employer account export, with none of the candidate-identifying fields
-- `list_current_employer_applications`/`get_current_employer_application`
-- already return. See docs/10-decisions.md D-077/D-088/D-089,
-- docs/47-slice-8-data-removal-proposal.md §2.
--
-- Explicitly NOT in this migration: the export route/API, any download UI,
-- the candidate or employer export builders, Auth metadata handling (all
-- PR 8.3b). No table, column, index, RLS policy, trigger, or view is added
-- or altered — the RPC is the sole new surface.

-- =============================================================================
-- 1. list_current_employer_export_applications() (D-089)
-- =============================================================================
-- Zero arguments; identity from auth.uid() only, mirroring every other
-- self-scoped RPC in this repository. Deliberately does NOT compose
-- _is_employer_suspended() or an onboarding-completion check — D-089
-- treats account-data export as an own-data read, not a business-eligibility
-- operation, so a suspended/unverified/rejected/revoked/incomplete employer
-- may still export their own already-existing records. It DOES compose
-- _is_employer_deleted(uid) — a deleted employer's vacancies/applications
-- are preserved (D-079), not withdrawn from the underlying tables, so
-- without this explicit check a stale pre-delete JWT could still read them
-- through the ownership join alone. No employer-scoped SELECT RLS policy is
-- added to `applications`; this RPC is the sole new employer-export
-- application-process boundary, reachable only through this narrow
-- projection.

create or replace function public.list_current_employer_export_applications()
returns table(application_id uuid, vacancy_id uuid, status text, submitted_at timestamptz)
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or public._is_employer_deleted(uid) then
    return;
  end if;

  return query
  select
    a.id,
    a.vacancy_id,
    a.status,
    a.submitted_at
  from public.applications a
  join public.vacancies v on v.id = a.vacancy_id
  where v.source = 'employer'
    and v.employer_profile_id = uid
  order by a.submitted_at asc, a.id asc;
end;
$$;

comment on function public.list_current_employer_export_applications() is
  'D-089 employer export application-process read. Returns exactly application_id/vacancy_id/status/submitted_at for the caller''s own vacancies'' applications — no candidate_id, candidate_snapshot, vacancy_snapshot, candidate display/profile field, status-history row, actor identity, or operator/moderation data. A preserved application belonging to a deleted candidate (D-078) still returns as a process-metadata row, since the employer''s recruitment-process fact ("an application at status X was submitted on date Y against vacancy Z") does not depend on the candidate''s current identity/presentation state; candidate_deleted is deliberately not exposed here (that is presentation data, not a process fact). A deleted employer (D-079/account_deleted_at) gets zero rows even with a still-valid pre-delete JWT. Suspension (D-072) and verification state are deliberately NOT composed — this is an own-data read, not a business operation, so neither gates it. Deterministic order: submitted_at ascending, application_id ascending as a stable tiebreak.';

revoke all on function public.list_current_employer_export_applications() from public, anon, service_role;
grant execute on function public.list_current_employer_export_applications() to authenticated;
