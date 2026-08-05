begin;

create extension if not exists pgtap with schema extensions;

select plan(47);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000001','authenticated','authenticated','op25-active@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000002','authenticated','authenticated','op25-inactive@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000003','authenticated','authenticated','op25-nonoperator@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000004','authenticated','authenticated','op25-pending-private@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000005','authenticated','authenticated','op25-pending-org@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000006','authenticated','authenticated','op25-tie-a@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000007','authenticated','authenticated','op25-tie-b@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000008','authenticated','authenticated','op25-unverified@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000009','authenticated','authenticated','op25-verified@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000010','authenticated','authenticated','op25-rejected@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000011','authenticated','authenticated','op25-revoked@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000012','authenticated','authenticated','op25-approve-target@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000013','authenticated','authenticated','op25-reject-target@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2500000-0000-4000-8000-000000000014','authenticated','authenticated','op25-stale-target@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.verification_operators (user_id, created_by, active) values
('a2500000-0000-4000-8000-000000000001','a2500000-0000-4000-8000-000000000001', true),
('a2500000-0000-4000-8000-000000000002','a2500000-0000-4000-8000-000000000001', false);

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, organisation_legal_name, website,
  lawful_hiring_declared, lawful_hiring_declared_at, onboarding_completed_at,
  verification_state, verification_requested_at, verification_reviewed_at,
  verification_reviewed_by, verification_review_reason, verification_attested_at,
  verification_attestation_version
) values
('a2500000-0000-4000-8000-000000000004','private','Pending Private Employer','Mitte',null,null,
  true, now(), now(),
  'pending', now() - interval '3 hours', null, null, null, now() - interval '3 hours','v1'),
('a2500000-0000-4000-8000-000000000005','organisation','Pending Org Employer','Kreuzberg','Pending Org Legal GmbH','https://pending-org.example.test',
  true, now(), now(),
  'pending', now() - interval '2 hours', null, null, null, now() - interval '2 hours','v1'),
('a2500000-0000-4000-8000-000000000006','private','Tie A Employer','Mitte',null,null,
  true, now(), now(),
  'pending', now() - interval '1 hour', null, null, null, now() - interval '1 hour','v1'),
('a2500000-0000-4000-8000-000000000007','private','Tie B Employer','Mitte',null,null,
  true, now(), now(),
  'pending', now() - interval '1 hour', null, null, null, now() - interval '1 hour','v1'),
('a2500000-0000-4000-8000-000000000008','private','Unverified Employer',null,null,null,
  true, now(), null,
  'unverified', null, null, null, null, null, null),
('a2500000-0000-4000-8000-000000000009','private','Verified Employer','Mitte',null,null,
  true, now(), now(),
  'verified', now() - interval '5 hours', now() - interval '4 hours', 'a2500000-0000-4000-8000-000000000001', null, now() - interval '5 hours','v1'),
('a2500000-0000-4000-8000-000000000010','private','Rejected Employer','Mitte',null,null,
  true, now(), now(),
  'rejected', now() - interval '6 hours', now() - interval '5 hours', 'a2500000-0000-4000-8000-000000000001', 'Needs more detail', now() - interval '6 hours','v1'),
('a2500000-0000-4000-8000-000000000011','private','Revoked Employer','Mitte',null,null,
  true, now(), now(),
  'revoked', now() - interval '10 hours', now() - interval '9 hours', 'a2500000-0000-4000-8000-000000000001', 'Trust concern', now() - interval '10 hours','v1'),
('a2500000-0000-4000-8000-000000000012','private','Approve Target Employer','Mitte',null,null,
  true, now(), now(),
  'pending', now() - interval '30 minutes', null, null, null, now() - interval '30 minutes','v1'),
('a2500000-0000-4000-8000-000000000013','private','Reject Target Employer','Mitte',null,null,
  true, now(), now(),
  'pending', now() - interval '20 minutes', null, null, null, now() - interval '20 minutes','v1'),
('a2500000-0000-4000-8000-000000000014','private','Stale Target Employer','Mitte',null,null,
  true, now(), now(),
  'pending', now() - interval '10 minutes', null, null, null, now() - interval '10 minutes','v1');

insert into public.companies (id, name, slug, source, owner_employer_id) values
('a2500000-0000-4000-8000-000000000101','Pending Org Co','pending-org-co-25','employer','a2500000-0000-4000-8000-000000000005');

-- ---------------------------------------------------------------------------
-- Group A — is_current_user_verification_operator()
-- ---------------------------------------------------------------------------

select has_function(
  'public', 'is_current_user_verification_operator', array[]::text[],
  'operator-check function accepts no parameters'
);

-- anon has no EXECUTE grant at all: a genuine anonymous call is denied by
-- privilege before the function body ever runs. This is a distinct contract
-- from "authenticated session with no identity" below (which is denied by
-- the function's own auth.uid() logic and returns false, not an exception).
set local role anon;
select throws_ok(
  $$ select public.is_current_user_verification_operator() $$,
  '42501', null,
  'anon is denied by privilege (no EXECUTE grant), not by a false result'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select is(public.is_current_user_verification_operator(), false, 'authenticated session with no identity is not an operator');

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000003',true);
select is(public.is_current_user_verification_operator(), false, 'normal authenticated user is not an operator');

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000002',true);
select is(public.is_current_user_verification_operator(), false, 'inactive operator is not an active operator');

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000001',true);
select is(public.is_current_user_verification_operator(), true, 'active operator is confirmed');

select ok(
  not has_table_privilege('authenticated', 'public.verification_operators', 'select'),
  'operator table remains non-enumerable to authenticated'
);

reset role;

-- ---------------------------------------------------------------------------
-- Group B — list_pending_employer_verifications()
-- ---------------------------------------------------------------------------

set local role anon;
select throws_ok(
  $$ select public.list_pending_employer_verifications() $$,
  '42501', null,
  'anon is denied by privilege on the pending-list RPC'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select is(
  (select count(*)::integer from public.list_pending_employer_verifications()),
  0, 'authenticated session with no identity sees no pending list'
);

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000003',true);
select is(
  (select count(*)::integer from public.list_pending_employer_verifications()),
  0, 'normal authenticated user sees no pending list'
);

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000002',true);
select is(
  (select count(*)::integer from public.list_pending_employer_verifications()),
  0, 'inactive operator sees no pending list'
);

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000001',true);
select is(
  (select count(*)::integer from public.list_pending_employer_verifications()),
  7, 'active operator sees exactly the seeded pending rows'
);

select is(
  (select count(*)::integer from public.list_pending_employer_verifications()
   where employer_profile_id = 'a2500000-0000-4000-8000-000000000008'),
  0, 'unverified employer excluded from pending list'
);
select is(
  (select count(*)::integer from public.list_pending_employer_verifications()
   where employer_profile_id = 'a2500000-0000-4000-8000-000000000009'),
  0, 'verified employer excluded from pending list'
);
select is(
  (select count(*)::integer from public.list_pending_employer_verifications()
   where employer_profile_id = 'a2500000-0000-4000-8000-000000000010'),
  0, 'rejected employer excluded from pending list'
);
select is(
  (select count(*)::integer from public.list_pending_employer_verifications()
   where employer_profile_id = 'a2500000-0000-4000-8000-000000000011'),
  0, 'revoked employer excluded from pending list'
);

select is(
  (select employer_profile_id from public.list_pending_employer_verifications()
   order by verification_requested_at asc, employer_profile_id asc limit 1),
  'a2500000-0000-4000-8000-000000000004'::uuid,
  'earliest requested_at sorts first'
);

select ok(
  (
    select array_position(ids, 'a2500000-0000-4000-8000-000000000006'::uuid)
         < array_position(ids, 'a2500000-0000-4000-8000-000000000007'::uuid)
    from (
      select array_agg(employer_profile_id order by verification_requested_at asc, employer_profile_id asc) as ids
      from public.list_pending_employer_verifications()
    ) t
  ),
  'equal requested_at ties break by employer id ascending'
);

select is(
  (select display_name from public.list_pending_employer_verifications()
   where employer_profile_id = 'a2500000-0000-4000-8000-000000000004'),
  'Pending Private Employer', 'list returns minimum display_name field'
);

select is(
  (select company_name from public.list_pending_employer_verifications()
   where employer_profile_id = 'a2500000-0000-4000-8000-000000000005'),
  'Pending Org Co', 'organisation employer company_name populated through valid ownership'
);

select is(
  (select company_name from public.list_pending_employer_verifications()
   where employer_profile_id = 'a2500000-0000-4000-8000-000000000004'),
  null::text, 'private employer company_name remains null'
);

select ok(
  pg_get_function_result('public.list_pending_employer_verifications()'::regprocedure)
    !~* 'reviewed_by|email|address|candidate|application',
  'pending list return type excludes reviewer identity and sensitive fields'
);

reset role;

-- ---------------------------------------------------------------------------
-- Group C — get_employer_verification_review(uuid)
-- ---------------------------------------------------------------------------

set local role anon;
select throws_ok(
  $$ select public.get_employer_verification_review('a2500000-0000-4000-8000-000000000004') $$,
  '42501', null,
  'anon is denied by privilege on the review-detail RPC'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select is(
  (select count(*)::integer from public.get_employer_verification_review('a2500000-0000-4000-8000-000000000004')),
  0, 'authenticated session with no identity cannot load review detail'
);

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000003',true);
select is(
  (select count(*)::integer from public.get_employer_verification_review('a2500000-0000-4000-8000-000000000004')),
  0, 'normal authenticated user cannot load review detail'
);

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000002',true);
select is(
  (select count(*)::integer from public.get_employer_verification_review('a2500000-0000-4000-8000-000000000004')),
  0, 'inactive operator cannot load review detail'
);

select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000001',true);
select is(
  (select count(*)::integer from public.get_employer_verification_review('a2500000-0000-4000-8000-000000000004')),
  1, 'active operator loads eligible pending review row'
);

select is(
  (select count(*)::integer from public.get_employer_verification_review('11111111-1111-4111-8111-111111111111')),
  0, 'nonexistent employer id returns deterministic empty result'
);

select is(
  (select verification_state from public.get_employer_verification_review('a2500000-0000-4000-8000-000000000009')),
  'verified', 'detail returns current verification state'
);

select ok(
  (
    select verification_attested_at is not null and verification_attestation_version = 'v1'
    from public.get_employer_verification_review('a2500000-0000-4000-8000-000000000004')
  ),
  'detail returns required attestation fields'
);

select is(
  (select count(*)::integer from public.get_employer_verification_review('a2500000-0000-4000-8000-000000000008')),
  0, 'unverified-state employer is not an eligible review row'
);

select is(
  (select count(*)::integer from public.get_employer_verification_review('a2500000-0000-4000-8000-000000000011')),
  0, 'revoked-state employer is not an eligible review row'
);

select is(
  (select count(*)::integer from public.get_employer_verification_review('a2500000-0000-4000-8000-000000000010')),
  1, 'rejected-state employer remains available for stale-state display'
);

select ok(
  pg_get_function_result('public.get_employer_verification_review(uuid)'::regprocedure)
    !~* 'reviewed_by|email|address|candidate|application',
  'review detail return type excludes reviewer identity and sensitive fields'
);

reset role;

-- ---------------------------------------------------------------------------
-- Group D — existing mutation RPCs remain authoritative
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub','a2500000-0000-4000-8000-000000000001',true);
select is(
  public.approve_employer_verification('a2500000-0000-4000-8000-000000000012')->>'status',
  'ok', 'approve pending still works after read RPCs land'
);
select is(
  public.reject_employer_verification('a2500000-0000-4000-8000-000000000013','Still not eligible')->>'status',
  'ok', 'reject pending still works after read RPCs land'
);
select is(
  public.revoke_employer_verification('a2500000-0000-4000-8000-000000000009','Trust review')->>'status',
  'ok', 'revoke verified still works after read RPCs land'
);

select is(
  public.approve_employer_verification('a2500000-0000-4000-8000-000000000014')->>'status',
  'ok', 'stale-list target approves once'
);
select is(
  public.reject_employer_verification('a2500000-0000-4000-8000-000000000014','Too late')->>'status',
  'invalid_state', 'mutation RPC remains authoritative against a stale pending list snapshot'
);

reset role;

-- ---------------------------------------------------------------------------
-- Group E — privileges
-- ---------------------------------------------------------------------------

select ok(
  has_function_privilege('authenticated', 'public.is_current_user_verification_operator()', 'execute'),
  'authenticated may execute operator-check RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.list_pending_employer_verifications()', 'execute'),
  'authenticated may execute pending-list RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.get_employer_verification_review(uuid)', 'execute'),
  'authenticated may execute review-detail RPC'
);
select ok(
  not has_function_privilege('anon', 'public.is_current_user_verification_operator()', 'execute'),
  'anon cannot execute operator-check RPC'
);
select ok(
  not has_function_privilege('anon', 'public.list_pending_employer_verifications()', 'execute'),
  'anon cannot execute pending-list RPC'
);
select ok(
  not has_function_privilege('anon', 'public.get_employer_verification_review(uuid)', 'execute'),
  'anon cannot execute review-detail RPC'
);
select ok(
  not has_function_privilege('authenticated', 'public._is_active_verification_operator(uuid)', 'execute'),
  'internal operator helper remains non-executable by authenticated'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'employer_profiles'),
  3, 'no new employer_profiles read policy was added'
);

select * from finish();
rollback;
