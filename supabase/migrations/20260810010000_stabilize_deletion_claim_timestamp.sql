-- Baseline CI/schema-contract stabilization — deterministic first-claim
-- timestamps for D-090 (docs/10-decisions.md).
--
-- Not a new decision and not a change to D-090's semantics. D-090 already
-- documents processing_started_at (first-ever processing attempt, preserved
-- via coalesce across retries) and processing_lease_started_at (current
-- processing ownership period, refreshed on every claim) as conceptually
-- distinct fields that, on a first-ever claim, describe the exact same
-- claim operation. The previously-merged _claim_deletion_request
-- (20260808220000) captured that single operation's timestamp via two
-- separate clock_timestamp() calls in one UPDATE's SET list:
--
--   processing_started_at = coalesce(processing_started_at, clock_timestamp()),
--   processing_lease_started_at = clock_timestamp(),
--
-- clock_timestamp() is volatile and re-evaluated per call, so on a
-- first-ever claim these two independent reads can legitimately diverge by
-- a microsecond or more — confirmed in CI (e.g. 22:10:59.196886+00 vs
-- 22:10:59.196887+00), reproduced locally at roughly a 1-in-4 rate under
-- supabase test db's docker/pg_prove execution path (0/50 under a bare
-- direct-psql loop, ~4/15 under the actual CI mechanism), never in a tight
-- direct-psql loop. This deviates from this codebase's own established
-- convention elsewhere (capture clock_timestamp() once into a local
-- variable, reuse it for every column that should share one instant —
-- e.g. record_application_outcome's `ts`) — this migration brings
-- _claim_deletion_request into line with that convention.
--
-- Fix: capture clock_timestamp() exactly once into a local variable and
-- reuse it for every column that represents this one claim event
-- (processing_started_at's coalesce-preserved value on a first claim,
-- processing_lease_started_at, and updated_at — the latter was already a
-- third independent clock_timestamp() call describing the same event, not
-- a new field being folded in). Every other branch, predicate, result
-- shape, authorization posture, and the retry/reclaim contract are
-- unchanged: on a retry claim (from 'failed'), processing_started_at still
-- resolves via coalesce(...) to its preserved historical value, never ts;
-- only processing_lease_started_at (and updated_at) advance.
--
-- _reclaim_stale_deletion_request already captures clock_timestamp() once
-- and reuses it for both processing_lease_started_at and updated_at — it
-- already followed the correct pattern and is not modified by this
-- migration. No table, column, index, RLS policy, trigger, grant, status,
-- or failure code is added or changed. Argument/return contract of
-- _claim_deletion_request is unchanged.

create or replace function public._claim_deletion_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  claimed public.deletion_requests%rowtype;
  current public.deletion_requests%rowtype;
  ts timestamptz := clock_timestamp();
begin
  update public.deletion_requests
  set status = 'processing',
      processing_started_at = coalesce(processing_started_at, ts),
      processing_lease_started_at = ts,
      failed_at = null,
      failure_code = null,
      updated_at = ts
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
  'D-081 row-locked/deterministic single-writer claim. The UPDATE ... WHERE status IN (''pending'',''failed'') itself is the concurrency guarantee: two concurrent claim attempts on the same row cannot both match under Postgres MVCC (the second sees the first''s already-updated status and matches zero rows). Claims from ''failed'' too, so a retry after a failed Auth step re-enters processing without a separate retry function. A completed/already-processing row is a deterministic no-op, never an error. D-090: every successful claim also refreshes processing_lease_started_at to clock_timestamp() — this is the CURRENT processing ownership period, distinct from processing_started_at (preserved as the historical first-processing timestamp, never reset here). Baseline stabilization: processing_started_at (on a first-ever claim), processing_lease_started_at, and updated_at all derive from one clock_timestamp() read captured once as `ts`, so a first-ever claim''s processing_started_at and processing_lease_started_at are guaranteed bit-identical rather than two independently-volatile reads of the same instant.';

revoke all on function public._claim_deletion_request(uuid) from public, anon, authenticated, service_role;
grant execute on function public._claim_deletion_request(uuid) to service_role;
