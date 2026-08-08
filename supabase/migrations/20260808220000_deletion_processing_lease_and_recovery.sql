-- Slice 8 PR 8.4 — deletion processing lease and stranded-request recovery.
--
-- Implements D-090 (docs/10-decisions.md): closes a crash window discovered
-- during PR 8.4 implementation — _claim_deletion_request(uuid) (migration
-- 20260807220000) only claims pending/failed requests. If the privileged
-- application process terminates after a successful claim but before either
-- _process_deletion_domain_scrub(...) or _record_deletion_failure(...) runs,
-- the request is permanently stranded at status='processing' with no
-- existing RPC able to re-derive its persisted target user_id (service_role
-- has, and retains, zero direct SELECT/INSERT/UPDATE/DELETE on
-- deletion_requests — confirmed empirically, unchanged by this migration).
--
-- Explicitly NOT introduced by this migration: any new table, index,
-- trigger, RLS policy, deletion status, or failure code; any background
-- worker/cron/scheduled sweep (recovery remains a narrow, manually-invoked,
-- privileged reconciliation operation per D-081); any change to
-- request_account_deletion(), cancel_account_deletion_request(),
-- _process_deletion_domain_scrub(), _record_deletion_auth_evidence(), or
-- _record_deletion_failure().

-- =============================================================================
-- 1. processing_lease_started_at (D-090)
-- =============================================================================
-- Distinct from the existing processing_started_at, which records the
-- FIRST time a request ever entered processing (set via
-- coalesce(processing_started_at, clock_timestamp()) and never reset on
-- retry — preserved exactly, unchanged by this migration). The lease
-- records the start of the CURRENT processing ownership period and is
-- refreshed on every successful transition into processing, including a
-- failed-request retry claim. Using processing_started_at itself as the
-- staleness signal would incorrectly treat a legitimately-just-retried
-- request as already stale merely because its original processing attempt
-- was long ago — this is the exact reason the original (rejected) proposal
-- is superseded by D-090.

alter table public.deletion_requests
  add column processing_lease_started_at timestamptz null;

comment on column public.deletion_requests.processing_lease_started_at is
  'D-090 processing lease start. Set to clock_timestamp() on every successful transition into processing (ordinary pending claim, failed-request retry claim, and privileged stale reclaim) — never derived from or synced with processing_started_at, which remains the historical first-processing-attempt timestamp. NULL for pending/never-yet-processed rows. A processing row with a NULL lease is never stale-reclaimable (see _reclaim_stale_deletion_request) — backfilled below for any pre-existing processing row so this state cannot persist from before this migration.';

-- Backfill: any deletion_requests row already in 'processing' status at the
-- moment this migration runs (none in a fresh local reset; a real
-- long-running environment could have exactly one, per the active-request
-- uniqueness index) has no prior lease concept — its only known ownership
-- signal is its historical processing_started_at, which
-- deletion_requests_processing_started_chk already guarantees is non-null
-- for any non-pending row. Backfilling from it (rather than leaving the
-- lease NULL) means such a row becomes reclaimable once actually stale,
-- rather than permanently unreclaimable — the correct behavior, since a
-- pre-existing processing row is exactly the kind of state this migration
-- exists to make recoverable, not to freeze further.
update public.deletion_requests
set processing_lease_started_at = processing_started_at
where status = 'processing'
  and processing_started_at is not null;

-- Invariant: every row currently in 'processing' status has a non-null
-- lease — guaranteed by the backfill above for pre-existing rows and by
-- _claim_deletion_request/_reclaim_stale_deletion_request below for every
-- future transition into processing (no other code path ever sets
-- status='processing'). Catches, at the constraint level, any future
-- regression that transitions a row into processing without also setting
-- the lease, rather than silently reintroducing an unrecoverable stuck
-- state.
alter table public.deletion_requests
  add constraint deletion_requests_processing_lease_chk
  check (status <> 'processing' or processing_lease_started_at is not null);

-- =============================================================================
-- 2. _claim_deletion_request(uuid) — lease refresh only (D-090)
-- =============================================================================
-- Argument and return contract unchanged. The only behavioral change: every
-- successful claim (fresh pending claim or failed-request retry claim) now
-- also sets processing_lease_started_at = clock_timestamp(), in addition to
-- the existing processing_started_at = coalesce(...) assignment, which is
-- preserved verbatim.

create or replace function public._claim_deletion_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  claimed public.deletion_requests%rowtype;
  current public.deletion_requests%rowtype;
begin
  update public.deletion_requests
  set status = 'processing',
      processing_started_at = coalesce(processing_started_at, clock_timestamp()),
      processing_lease_started_at = clock_timestamp(),
      failed_at = null,
      failure_code = null,
      updated_at = clock_timestamp()
  where id = p_request_id
    and status in ('pending', 'failed')
  returning * into claimed;

  if claimed.id is not null then
    return jsonb_build_object('status', 'claimed', 'request_id', claimed.id, 'user_id', claimed.user_id);
  end if;

  select * into current from public.deletion_requests where id = p_request_id;
  if current.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object('status', 'no_op', 'current_status', current.status);
end;
$$;

comment on function public._claim_deletion_request(uuid) is
  'D-081 row-locked/deterministic single-writer claim. The UPDATE ... WHERE status IN (''pending'',''failed'') itself is the concurrency guarantee: two concurrent claim attempts on the same row cannot both match under Postgres MVCC (the second sees the first''s already-updated status and matches zero rows). Claims from ''failed'' too, so a retry after a failed Auth step re-enters processing without a separate retry function. A completed/already-processing row is a deterministic no-op, never an error. D-090: every successful claim also refreshes processing_lease_started_at to clock_timestamp() — this is the CURRENT processing ownership period, distinct from processing_started_at (preserved as the historical first-processing timestamp, never reset here).';

-- =============================================================================
-- 3. _reclaim_stale_deletion_request(uuid) — D-090 stranded-request recovery
-- =============================================================================
-- Request-id-only, mirroring every other processor-only primitive exactly.
-- Never accepts a user id, a staleness interval, a timeout, a role, or an
-- email — the database owns the fixed staleness threshold. Reachable only
-- from the privileged reconciliation path (PR 8.4 application code); never
-- from ordinary self-service processing, which must keep returning its
-- existing generic "processing" result for an in-flight request.

create or replace function public._reclaim_stale_deletion_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  reclaimed public.deletion_requests%rowtype;
  current public.deletion_requests%rowtype;
begin
  update public.deletion_requests
  set processing_lease_started_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = p_request_id
    and status = 'processing'
    and processing_lease_started_at is not null
    and processing_lease_started_at <= clock_timestamp() - interval '5 minutes'
  returning * into reclaimed;

  if reclaimed.id is not null then
    return jsonb_build_object('status', 'reclaimed', 'request_id', reclaimed.id, 'user_id', reclaimed.user_id);
  end if;

  select * into current from public.deletion_requests where id = p_request_id;
  if current.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object('status', 'no_op');
end;
$$;

comment on function public._reclaim_stale_deletion_request(uuid) is
  'D-090 stranded-processing recovery. Request-id-only — never a caller-supplied user id, staleness interval, timeout, role, or email; the persisted user_id is returned only by reading the already-persisted row matched by that same request_id, identical target-derivation contract to _claim_deletion_request. Reclaimable only when status=''processing'' AND processing_lease_started_at is more than a fixed 5-minute threshold old (owned entirely by this function, not caller-selectable) — a fresh lease (an actively in-flight, non-crashed processor) can never be reclaimed out from under itself. The single atomic UPDATE ... WHERE is the same concurrency guarantee _claim_deletion_request already relies on: two concurrent reclaim attempts cannot both match under Postgres MVCC, and a winning reclaim immediately refreshes the lease so no second reclaim can succeed until the new threshold has again elapsed. A NULL lease (never expected post-backfill, see migration 20260808220000''s comment) is never treated as immediately reclaimable — it simply never matches this WHERE clause. Does not itself touch Auth or call _record_deletion_auth_evidence; the caller (reconcileAccountDeletionRequest) must independently verify Auth deletion via getUserById before ever recording evidence, exactly as the ordinary processing path already does — _record_deletion_auth_evidence trusts its privileged caller and is not modified by this migration.';

revoke all on function public._reclaim_stale_deletion_request(uuid) from public, anon, authenticated, service_role;
grant execute on function public._reclaim_stale_deletion_request(uuid) to service_role;
