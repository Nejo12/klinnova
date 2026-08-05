-- PR 5.5a — Effective-public vacancy read contract (narrow, anon+authenticated
-- reads). Adds: list_effective_public_vacancies(), get_effective_public_vacancy(uuid),
-- get_effective_public_vacancy_languages(uuid). No UI. No anon table grant. No
-- broadened RLS. All three gate on the existing is_vacancy_effectively_public(...)
-- helper from PR 5.2 — never a parallel eligibility rule.
--
-- None of the three accepts a caller-supplied visibility timestamp. Exposing
-- one would let a caller ask "was this effective-public at some other time?",
-- which can disagree with "is this effective-public right now" — e.g. a row
-- still stored as published after its expiry elapsed but before
-- materialization. All three evaluate strictly against now(), which is
-- stable for the lifetime of one transaction, so a single query using now()
-- multiple times (once per row via is_vacancy_effectively_public, or via a
-- WHERE clause) is guaranteed to use one consistent instant throughout.
--
-- employer_display_name uses coalesce(c.name, ep.display_name), which is
-- provably equivalent to submit_candidate_application's existing accepted
-- seed/employer branching: for seed rows ep is null via the LEFT JOIN, so the
-- coalesce reduces to c.name exactly as that RPC's seed branch does.
--
-- Field-by-field runtime nullability (the generated TypeScript types below
-- mark every column non-null — a known Supabase RETURNS TABLE codegen
-- limitation already documented for PR 5.3a's RPCs; these SQL comments, not
-- the generated types, are the nullability source of truth):
--   - vacancy_id, title, job_category, source, published_at, expires_at:
--     never null for any row this RPC can return.
--   - public_locality, workplace_type, work_frequency, cv_required,
--     interview_english_ok, description: NOT NULL for source='employer'
--     rows (publish_employer_vacancy's own readiness gate enforces this
--     before a row can ever become effective-public), but NULL for
--     source='seed' rows — the local/CI demo seed intentionally does not
--     populate these columns (see supabase/seeds/01_demo_vacancies.sql).
--   - employer_type, website: NULL for source='seed' rows (no real
--     employer_profiles row exists for seed data); non-null for
--     source='employer' rows with employer_type set, website only when the
--     employer chose to provide one.
--   - company_name: NULL whenever the vacancy has no company_id — i.e. for
--     source='employer' rows owned by a private employer. Non-null for
--     organisation-employer rows and for seed rows (seed always references
--     a fixture company).
--   - employer_display_name: not expected null in practice for any row
--     this RPC returns (every effective-public row has either a company
--     name or an employer display name to fall back to), but this is not
--     enforced by a single database constraint spanning the join, so
--     PR 5.5b's Zod schema should still treat it as nullable defensively.
--
-- `source` is kept in the public projection deliberately, not as incidental
-- internal provenance: D-031 requires seed/demo vacancies to be visibly
-- labelled "Demo vacancy" to candidates, and `source` is the only field that
-- lets PR 5.5b's UI make that determination.
--
-- `city` is deliberately omitted: `vacancies_city_berlin_chk` constrains it
-- to the literal value 'Berlin' for every row without exception, so it
-- carries no information beyond what the whole product's Berlin-only scope
-- (D-004) already establishes. `public_locality` is the only location field
-- returned, matching D-061's approved public location contract exactly.

create or replace function public.list_effective_public_vacancies()
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
  expires_at timestamptz
)
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
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
    v.expires_at
  from public.vacancies v
  left join public.employer_profiles ep on ep.id = v.employer_profile_id
  left join public.companies c on c.id = v.company_id
  where public.is_vacancy_effectively_public(v.id, now())
  order by v.published_at desc, v.id asc;
$$;

comment on function public.list_effective_public_vacancies() is
  'PR 5.5a: narrow public projection of currently effective-public vacancies. No caller-supplied visibility time — always evaluated against now(). Gates exclusively on is_vacancy_effectively_public(...) — never a parallel eligibility rule. No employer/company/auth identifiers, no exact address, no candidate/application data.';

revoke all on function public.list_effective_public_vacancies() from public;
grant execute on function public.list_effective_public_vacancies()
  to anon, authenticated;

create or replace function public.get_effective_public_vacancy(
  p_vacancy_id uuid
)
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
  expires_at timestamptz
)
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
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
    v.expires_at
  from public.vacancies v
  left join public.employer_profiles ep on ep.id = v.employer_profile_id
  left join public.companies c on c.id = v.company_id
  where v.id = p_vacancy_id
    and public.is_vacancy_effectively_public(v.id, now());
$$;

comment on function public.get_effective_public_vacancy(uuid) is
  'PR 5.5a: narrow single-row public projection, active only while the vacancy is currently effective-public (no caller-supplied visibility time — always now()). Nonexistent, draft, paused, filled, expired, withdrawn, effectively-expired, and unverified/revoked-employer ids are all structurally indistinguishable — every case returns zero rows, never an error and never a different shape.';

revoke all on function public.get_effective_public_vacancy(uuid) from public;
grant execute on function public.get_effective_public_vacancy(uuid)
  to anon, authenticated;

create or replace function public.get_effective_public_vacancy_languages(
  p_vacancy_id uuid
)
returns table (
  language_code text,
  min_proficiency text
)
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select vlr.language_code, vlr.min_proficiency
  from public.vacancy_language_requirements vlr
  where vlr.vacancy_id = p_vacancy_id
    and public.is_vacancy_effectively_public(vlr.vacancy_id, now())
  order by vlr.language_code asc;
$$;

comment on function public.get_effective_public_vacancy_languages(uuid) is
  'PR 5.5a: narrow public language-requirement projection for one currently effective-public vacancy (no caller-supplied visibility time — always now()). A separate RPC rather than an embedded composite array, since PostgREST/Supabase type generation for composite arrays inside a RETURNS TABLE column is not reliably precise. Returns zero rows for any non-effective-public or unknown vacancy id.';

revoke all on function public.get_effective_public_vacancy_languages(uuid)
  from public;
grant execute on function public.get_effective_public_vacancy_languages(uuid)
  to anon, authenticated;
