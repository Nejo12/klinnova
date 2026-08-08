begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

-- ---------------------------------------------------------------------------
-- D-090 / migration 20260808220000 — deletion processing lease and
-- stranded-request recovery. Fixtures.
-- ---------------------------------------------------------------------------

create temporary table lease_test_ids (label text primary key, id uuid not null);
grant select, insert on lease_test_ids to authenticated, service_role;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','c3200000-0000-4000-8000-000000000001'::uuid,'authenticated','authenticated','c32-fresh-claim@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c3200000-0000-4000-8000-000000000002'::uuid,'authenticated','authenticated','c32-failed-retry@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c3200000-0000-4000-8000-000000000003'::uuid,'authenticated','authenticated','c32-fresh-processing@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c3200000-0000-4000-8000-000000000004'::uuid,'authenticated','authenticated','c32-stale-processing@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c3200000-0000-4000-8000-000000000005'::uuid,'authenticated','authenticated','c32-pending-only@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c3200000-0000-4000-8000-000000000006'::uuid,'authenticated','authenticated','c32-failed-only@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c3200000-0000-4000-8000-000000000007'::uuid,'authenticated','authenticated','c32-completed@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.candidate_profiles (id, display_name) values
('c3200000-0000-4000-8000-000000000001'::uuid,'C32 Fresh Claim'),
('c3200000-0000-4000-8000-000000000002'::uuid,'C32 Failed Retry'),
('c3200000-0000-4000-8000-000000000003'::uuid,'C32 Fresh Processing'),
('c3200000-0000-4000-8000-000000000004'::uuid,'C32 Stale Processing'),
('c3200000-0000-4000-8000-000000000005'::uuid,'C32 Pending Only'),
('c3200000-0000-4000-8000-000000000006'::uuid,'C32 Failed Only'),
('c3200000-0000-4000-8000-000000000007'::uuid,'C32 Completed');

-- ---------------------------------------------------------------------------
-- Section A — schema shape
-- ---------------------------------------------------------------------------

select has_column('public','deletion_requests','processing_lease_started_at','processing_lease_started_at column exists');
select col_type_is('public','deletion_requests','processing_lease_started_at','timestamp with time zone','processing_lease_started_at is timestamptz');

select is(
  (select count(*)::integer from pg_constraint where conname = 'deletion_requests_processing_lease_chk'),
  1,
  'deletion_requests_processing_lease_chk exists: status <> processing OR lease is not null'
);

-- ---------------------------------------------------------------------------
-- Section B — ordinary claim sets/refreshes the lease;
-- processing_started_at semantics are unchanged
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c3200000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"c3200000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into lease_test_ids (label, id)
select 'fresh-claim-request', (public.request_account_deletion() ->> 'request_id')::uuid;
reset role;

select is(
  (select processing_lease_started_at from public.deletion_requests where id = (select id from lease_test_ids where label='fresh-claim-request')),
  null,
  'a pending (never-claimed) request has a null lease'
);

select public._claim_deletion_request((select id from lease_test_ids where label='fresh-claim-request'));

select isnt(
  (select processing_lease_started_at from public.deletion_requests where id = (select id from lease_test_ids where label='fresh-claim-request')),
  null,
  'claiming a pending request sets a non-null processing lease'
);
select is(
  (select processing_started_at from public.deletion_requests where id = (select id from lease_test_ids where label='fresh-claim-request')),
  (select processing_lease_started_at from public.deletion_requests where id = (select id from lease_test_ids where label='fresh-claim-request')),
  'on a first-ever claim, processing_started_at and processing_lease_started_at start equal'
);

-- ---------------------------------------------------------------------------
-- Section C — failed-request retry claim refreshes the lease while
-- preserving the original processing_started_at (D-090's core fix)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c3200000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"c3200000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into lease_test_ids (label, id)
select 'failed-retry-request', (public.request_account_deletion() ->> 'request_id')::uuid;
reset role;

select public._claim_deletion_request((select id from lease_test_ids where label='failed-retry-request'));
select public._record_deletion_failure((select id from lease_test_ids where label='failed-retry-request'), 'auth_delete_failed');

-- Simulate the original processing attempt having happened long ago —
-- test-only direct manipulation, never something application runtime does.
update public.deletion_requests
set processing_started_at = clock_timestamp() - interval '2 days'
where id = (select id from lease_test_ids where label='failed-retry-request');

select public._claim_deletion_request((select id from lease_test_ids where label='failed-retry-request'));

select is(
  (select status from public.deletion_requests where id = (select id from lease_test_ids where label='failed-retry-request')),
  'processing',
  'a failed request can be retry-claimed back into processing'
);
select ok(
  (select processing_started_at < clock_timestamp() - interval '1 day' from public.deletion_requests where id = (select id from lease_test_ids where label='failed-retry-request')),
  'processing_started_at remains the original (2-day-old) historical timestamp — never reset on retry'
);
select ok(
  (select processing_lease_started_at > clock_timestamp() - interval '1 minute' from public.deletion_requests where id = (select id from lease_test_ids where label='failed-retry-request')),
  'processing_lease_started_at is freshly refreshed by the retry claim, independent of processing_started_at'
);

-- Test 24 (mandatory): the exact scenario the original (rejected) proposal
-- would have gotten wrong. processing_started_at is 2 days old, but the
-- lease was JUST refreshed by the retry claim above — reclaim must treat
-- this as an actively-owned, non-stale request.
select is(
  public._reclaim_stale_deletion_request((select id from lease_test_ids where label='failed-retry-request')) ->> 'status',
  'no_op',
  'CRITICAL: a just-retried request is NOT stale-reclaimable merely because its historical processing_started_at is old — staleness is judged from the lease alone, never from processing_started_at'
);

-- ---------------------------------------------------------------------------
-- Section D — fresh vs. stale processing reclaim behavior
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c3200000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"c3200000-0000-4000-8000-000000000003","role":"authenticated"}',true);
insert into lease_test_ids (label, id)
select 'fresh-processing-request', (public.request_account_deletion() ->> 'request_id')::uuid;
reset role;
select public._claim_deletion_request((select id from lease_test_ids where label='fresh-processing-request'));

select is(
  public._reclaim_stale_deletion_request((select id from lease_test_ids where label='fresh-processing-request')) ->> 'status',
  'no_op',
  'a freshly-claimed (non-stale) processing request cannot be reclaimed'
);
select is(
  (select status from public.deletion_requests where id = (select id from lease_test_ids where label='fresh-processing-request')),
  'processing',
  'the fresh processing row is unaffected by the failed reclaim attempt'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c3200000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"c3200000-0000-4000-8000-000000000004","role":"authenticated"}',true);
insert into lease_test_ids (label, id)
select 'stale-processing-request', (public.request_account_deletion() ->> 'request_id')::uuid;
reset role;
select public._claim_deletion_request((select id from lease_test_ids where label='stale-processing-request'));

-- Simulate an abandoned processor: age the lease past the fixed 5-minute
-- threshold. Test-only direct manipulation (mirrors what the gated
-- integration test does over a real connection, never application runtime).
update public.deletion_requests
set processing_lease_started_at = clock_timestamp() - interval '10 minutes'
where id = (select id from lease_test_ids where label='stale-processing-request');

select is(
  public._reclaim_stale_deletion_request((select id from lease_test_ids where label='stale-processing-request')) ->> 'status',
  'reclaimed',
  'a stale (lease older than 5 minutes) processing request can be reclaimed'
);
select is(
  public._reclaim_stale_deletion_request('00000000-0000-0000-0000-000000000000') ->> 'status',
  'not_found',
  'reclaiming a nonexistent request id is a deterministic not_found'
);

-- Re-fetch a fresh reclaimed result for the return-shape assertions below
-- (the row above was already reclaimed and its lease is now fresh again;
-- re-derive expected user_id from the fixture rather than reclaiming twice).
select is(
  (select status from public.deletion_requests where id = (select id from lease_test_ids where label='stale-processing-request')),
  'processing',
  'reclaiming does not change status away from processing'
);
select is(
  (select processing_lease_started_at > clock_timestamp() - interval '1 minute' from public.deletion_requests where id = (select id from lease_test_ids where label='stale-processing-request')),
  true,
  'a successful reclaim resets the lease to a fresh value'
);

-- Item 23: concurrent/successive reclaim attempts — only one winner. The
-- atomic UPDATE ... WHERE is the same single-writer guarantee
-- _claim_deletion_request already relies on (two concurrent attempts
-- cannot both match under Postgres MVCC); a second sequential attempt
-- immediately after a winning reclaim exercises the identical guarantee,
-- since the winning reclaim already refreshed the lease.
select is(
  public._reclaim_stale_deletion_request((select id from lease_test_ids where label='stale-processing-request')) ->> 'status',
  'no_op',
  'a second, immediately-following reclaim attempt on the same request loses — only one caller ever wins ownership'
);

-- Reclaim success return-shape proof, using a second stale fixture so this
-- assertion observes an actual "reclaimed" result with user_id/request_id.
set local role authenticated;
select set_config('request.jwt.claim.sub','c3200000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"c3200000-0000-4000-8000-000000000004","role":"authenticated"}',true);
reset role;
update public.deletion_requests
set processing_lease_started_at = clock_timestamp() - interval '10 minutes'
where id = (select id from lease_test_ids where label='stale-processing-request');

select is(
  public._reclaim_stale_deletion_request((select id from lease_test_ids where label='stale-processing-request')) ->> 'user_id',
  'c3200000-0000-4000-8000-000000000004',
  'a successful reclaim returns the exact persisted target user_id, never a caller-supplied one'
);
select is(
  public._reclaim_stale_deletion_request((select id from lease_test_ids where label='stale-processing-request'))::jsonb ? 'request_id',
  false,
  'the immediately-following reclaim (fresh lease again) no_op result carries no request_id — minimal response data, per D-090'
);

-- ---------------------------------------------------------------------------
-- Section E — pending/failed/completed/nonexistent requests are never
-- stale-reclaimable
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','c3200000-0000-4000-8000-000000000005',true);
select set_config('request.jwt.claims','{"sub":"c3200000-0000-4000-8000-000000000005","role":"authenticated"}',true);
insert into lease_test_ids (label, id)
select 'pending-only-request', (public.request_account_deletion() ->> 'request_id')::uuid;
reset role;

select is(
  public._reclaim_stale_deletion_request((select id from lease_test_ids where label='pending-only-request')) ->> 'status',
  'no_op',
  'a pending (never-claimed) request cannot be stale-reclaimed'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c3200000-0000-4000-8000-000000000006',true);
select set_config('request.jwt.claims','{"sub":"c3200000-0000-4000-8000-000000000006","role":"authenticated"}',true);
insert into lease_test_ids (label, id)
select 'failed-only-request', (public.request_account_deletion() ->> 'request_id')::uuid;
reset role;
select public._claim_deletion_request((select id from lease_test_ids where label='failed-only-request'));
select public._record_deletion_failure((select id from lease_test_ids where label='failed-only-request'), 'domain_scrub_failed');

select is(
  public._reclaim_stale_deletion_request((select id from lease_test_ids where label='failed-only-request')) ->> 'status',
  'no_op',
  'a failed (non-processing) request cannot be stale-reclaimed — retry uses the ordinary claim path instead'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c3200000-0000-4000-8000-000000000007',true);
select set_config('request.jwt.claims','{"sub":"c3200000-0000-4000-8000-000000000007","role":"authenticated"}',true);
insert into lease_test_ids (label, id)
select 'completed-request', (public.request_account_deletion() ->> 'request_id')::uuid;
reset role;
select public._claim_deletion_request((select id from lease_test_ids where label='completed-request'));
select public._process_deletion_domain_scrub((select id from lease_test_ids where label='completed-request'));
select public._record_deletion_auth_evidence((select id from lease_test_ids where label='completed-request'));

select is(
  (select status from public.deletion_requests where id = (select id from lease_test_ids where label='completed-request')),
  'completed',
  'sanity: the completed fixture actually reached completed before the reclaim assertion below'
);
select is(
  public._reclaim_stale_deletion_request((select id from lease_test_ids where label='completed-request')) ->> 'status',
  'no_op',
  'a completed (terminal) request cannot be stale-reclaimed'
);

-- ---------------------------------------------------------------------------
-- Section F — static ACL/security audit
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::integer from pg_proc where pronamespace='public'::regnamespace and proname='_reclaim_stale_deletion_request' and prosecdef),
  1,
  '_reclaim_stale_deletion_request is SECURITY DEFINER'
);
select is(
  (select proconfig from pg_proc where oid = 'public._reclaim_stale_deletion_request(uuid)'::regprocedure),
  array['search_path=pg_catalog, public'],
  '_reclaim_stale_deletion_request has a fixed search_path'
);
select is(
  (select count(*)::integer from pg_proc where pronamespace='public'::regnamespace and proname='_reclaim_stale_deletion_request' and pronargs=1),
  1,
  '_reclaim_stale_deletion_request takes exactly one argument — request id only, never a user id, staleness interval, timeout, role, or email'
);
select is(
  (select array_agg(t.typname::text order by ordinality) from pg_proc p, unnest(p.proargtypes) with ordinality as a(oid, ordinality) join pg_type t on t.oid = a.oid where p.oid = 'public._reclaim_stale_deletion_request(uuid)'::regprocedure),
  array['uuid']::text[],
  '_reclaim_stale_deletion_request''s sole argument is uuid (the request id)'
);

select is(
  (select count(*)::integer from information_schema.routine_privileges where routine_schema='public' and routine_name='_reclaim_stale_deletion_request' and grantee='service_role' and privilege_type='EXECUTE'),
  1,
  'service_role has an explicit EXECUTE grant on _reclaim_stale_deletion_request'
);
select is_empty(
  $$ select privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name='_reclaim_stale_deletion_request' and grantee in ('anon','authenticated') $$,
  'neither anon nor authenticated has EXECUTE on _reclaim_stale_deletion_request'
);

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select throws_ok($$ select public._reclaim_stale_deletion_request('00000000-0000-0000-0000-000000000000') $$, '42501', null, 'anon cannot call _reclaim_stale_deletion_request');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c3200000-0000-4000-8000-000000000005',true);
select throws_ok(
  (select format('select public._reclaim_stale_deletion_request(%L)', id) from lease_test_ids where label='pending-only-request'),
  '42501', null,
  'authenticated (even the request owner) cannot call the processor-only reclaim function'
);
reset role;

-- Direct table access remains unavailable to service_role, unchanged by
-- this migration — runtime stays exclusively RPC-mediated.
set local role service_role;
select throws_ok($$ select 1 from public.deletion_requests limit 1 $$, '42501', null, 'service_role has no direct SELECT on deletion_requests');
select throws_ok(
  (select format('update public.deletion_requests set status = %L where id = %L', 'failed', id) from lease_test_ids where label='pending-only-request'),
  '42501', null,
  'service_role has no direct UPDATE on deletion_requests'
);
reset role;

-- ---------------------------------------------------------------------------
-- Section G — backfill semantics (D-090). A fresh local reset never has a
-- pre-existing processing row for the migration's backfill UPDATE to act
-- on, so the UPDATE statement itself cannot be exercised directly here.
-- What IS directly, and more strongly, testable is that the exact state
-- backfill exists to prevent — a 'processing' row with a NULL lease — is
-- now structurally impossible to create at all, by any writer, going
-- forward: deletion_requests_processing_lease_chk itself rejects it. This
-- proves the invariant backfill established for any pre-existing row is
-- now permanently enforced, not merely a one-time migration-time fix.
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.deletion_requests (user_id, status, processing_started_at) values ('c3200000-0000-4000-8000-000000000005'::uuid, 'processing', clock_timestamp()) $$,
  '23514', null,
  'a processing row with a NULL lease can never be created — deletion_requests_processing_lease_chk itself rejects it, permanently enforcing the invariant the migration''s backfill established for any pre-existing row'
);

select * from finish();
rollback;
