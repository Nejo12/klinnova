begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
('00000000-0000-0000-0000-000000000000','a2100000-0000-4000-8000-000000000001','authenticated','authenticated','verify-employer@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2100000-0000-4000-8000-000000000002','authenticated','authenticated','verify-operator@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2100000-0000-4000-8000-000000000003','authenticated','authenticated','verify-other@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a2100000-0000-4000-8000-000000000004','authenticated','authenticated','verify-incomplete@example.test',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  lawful_hiring_declared_at, onboarding_completed_at
) values
('a2100000-0000-4000-8000-000000000001','private','Verification Employer','Mitte',true,now(),now()),
('a2100000-0000-4000-8000-000000000004','private','Incomplete Employer',null,true,now(),null);

insert into public.verification_operators (user_id, created_by)
values ('a2100000-0000-4000-8000-000000000002','a2100000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select is(public.request_employer_verification()->>'status','unauthenticated','request requires auth');

select set_config('request.jwt.claim.sub','a2100000-0000-4000-8000-000000000004',true);
select is(public.request_employer_verification()->>'status','incomplete','incomplete employer cannot request');

select set_config('request.jwt.claim.sub','a2100000-0000-4000-8000-000000000001',true);
select is(public.request_employer_verification()->>'status','ok','complete employer requests verification');
select is(public.request_employer_verification()->>'status','invalid_state','pending request is deterministic');

reset role;
select is((select verification_state from public.employer_profiles where id='a2100000-0000-4000-8000-000000000001'),'pending','request sets pending');
select is((select verification_attestation_version from public.employer_profiles where id='a2100000-0000-4000-8000-000000000001'),'v1','request stores v1 attestation');
select ok((select verification_requested_at is not null and verification_attested_at is not null from public.employer_profiles where id='a2100000-0000-4000-8000-000000000001'),'request stores timestamps');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2100000-0000-4000-8000-000000000003',true);
select is(public.approve_employer_verification('a2100000-0000-4000-8000-000000000001')->>'status','forbidden','non-operator cannot approve');
select is(public.reject_employer_verification('a2100000-0000-4000-8000-000000000001','reason')->>'status','forbidden','non-operator cannot reject');

select set_config('request.jwt.claim.sub','a2100000-0000-4000-8000-000000000002',true);
select is(public.reject_employer_verification('a2100000-0000-4000-8000-000000000001','  ')->>'status','validation_error','blank reason rejected');
select is(public.reject_employer_verification('a2100000-0000-4000-8000-000000000001','Profile details need review')->>'status','ok','operator rejects pending employer');

reset role;
select is((select verification_state from public.employer_profiles where id='a2100000-0000-4000-8000-000000000001'),'rejected','rejection state stored');
select is((select verification_review_reason from public.employer_profiles where id='a2100000-0000-4000-8000-000000000001'),'Profile details need review','trimmed reason stored');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2100000-0000-4000-8000-000000000001',true);
select is(public.request_employer_verification()->>'status','ok','rejected employer may re-request');
select throws_ok(
  $$ update public.employer_profiles set verification_state='verified' where id='a2100000-0000-4000-8000-000000000001' $$,
  '42501', null, 'owner cannot directly change verification'
);

select set_config('request.jwt.claim.sub','a2100000-0000-4000-8000-000000000002',true);
select is(public.approve_employer_verification('a2100000-0000-4000-8000-000000000001')->>'status','ok','operator approves pending employer');

select * from finish();
rollback;
