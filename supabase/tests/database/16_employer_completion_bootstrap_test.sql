begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
(
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'private-emp@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'a2222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'org-emp@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'a3333333-3333-4333-8333-333333333333',
  'authenticated', 'authenticated', 'type-lock@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);

-- Unauthenticated completion
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
set local role authenticated;

select is(
  public.complete_employer_onboarding()->>'status',
  'unauthenticated',
  'completion without jwt sub is unauthenticated'
);

select is(
  public.bootstrap_organisation_employer(
    'Name', 'Legal', 'Mitte', 'Co', 'co-slug', null, null
  )->>'status',
  'unauthenticated',
  'bootstrap without jwt sub is unauthenticated'
);

-- Missing profile
reset role;
select set_config(
  'request.jwt.claim.sub',
  'a1111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.complete_employer_onboarding()->>'status',
  'missing_profile',
  'completion with no employer profile returns missing_profile'
);

-- Create incomplete private profile
reset role;
insert into public.employer_profiles (id, employer_type)
values ('a1111111-1111-4111-8111-111111111111', 'private');

set local role authenticated;

select is(
  public.complete_employer_onboarding()->>'status',
  'incomplete',
  'incomplete private profile rejected'
);

-- Fill private essentials
reset role;
update public.employer_profiles
set
  display_name = 'Private Employer',
  berlin_locality = 'Kreuzberg',
  lawful_hiring_declared = true
where id = 'a1111111-1111-4111-8111-111111111111';

set local role authenticated;

select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'valid private employer completes'
);

select is(
  public.complete_employer_onboarding()->>'already_complete',
  'true',
  'private re-completion is idempotent already_complete'
);

reset role;
select is(
  (
    select verification_state from public.employer_profiles
    where id = 'a1111111-1111-4111-8111-111111111111'
  ),
  'unverified',
  'completion leaves verification unverified'
);

select ok(
  (
    select onboarding_completed_at is not null
      and lawful_hiring_declared_at is not null
    from public.employer_profiles
    where id = 'a1111111-1111-4111-8111-111111111111'
  ),
  'completion sets timestamps'
);

-- Invalidation: clear display_name
update public.employer_profiles
set display_name = null
where id = 'a1111111-1111-4111-8111-111111111111';

select ok(
  (
    select onboarding_completed_at is null
    from public.employer_profiles
    where id = 'a1111111-1111-4111-8111-111111111111'
  ),
  'clearing display_name clears completion'
);

update public.employer_profiles
set
  display_name = 'Private Employer',
  lawful_hiring_declared = true
where id = 'a1111111-1111-4111-8111-111111111111';

set local role authenticated;
select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'private can re-complete after invalidation'
);

reset role;
update public.employer_profiles
set berlin_locality = null
where id = 'a1111111-1111-4111-8111-111111111111';

select ok(
  (
    select onboarding_completed_at is null
    from public.employer_profiles
    where id = 'a1111111-1111-4111-8111-111111111111'
  ),
  'clearing berlin_locality clears completion'
);

-- Completed private cannot change type
update public.employer_profiles
set
  display_name = 'Private Employer',
  berlin_locality = 'Kreuzberg',
  lawful_hiring_declared = true
where id = 'a1111111-1111-4111-8111-111111111111';

set local role authenticated;
select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'private completed before type-lock assertion'
);

reset role;
select throws_ok(
  $$
    update public.employer_profiles
    set employer_type = 'organisation',
        organisation_legal_name = 'Legal'
    where id = 'a1111111-1111-4111-8111-111111111111'
  $$,
  '23514',
  null,
  'completed employer cannot change type'
);

-- Type lock fixture: incomplete may change type
insert into public.employer_profiles (id, employer_type, display_name)
values ('a3333333-3333-4333-8333-333333333333', 'private', 'Type Lock');

select lives_ok(
  $$
    update public.employer_profiles
    set employer_type = 'organisation',
        organisation_legal_name = 'Type Lock Legal'
    where id = 'a3333333-3333-4333-8333-333333333333'
  $$,
  'incomplete employer with no company may change type'
);

-- Organisation bootstrap
select set_config(
  'request.jwt.claim.sub',
  'a2222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.bootstrap_organisation_employer(
    'Org Display',
    'Org Legal GmbH',
    'Mitte',
    'Org Display Co',
    'org-display-co',
    'https://example.test',
    null
  )->>'status',
  'ok',
  'bootstrap creates organisation profile and company'
);

select is(
  public.bootstrap_organisation_employer(
    'Org Display',
    'Org Legal GmbH',
    'Mitte',
    'Org Display Co',
    'org-display-co',
    'https://example.test',
    null
  )->>'status',
  'ok',
  'bootstrap retry is idempotent'
);

reset role;
select is(
  (
    select count(*)::integer from public.companies
    where owner_employer_id = 'a2222222-2222-4222-8222-222222222222'
      and source = 'employer'
  ),
  1,
  'bootstrap yields exactly one employer company'
);

select is(
  (
    select employer_type from public.employer_profiles
    where id = 'a2222222-2222-4222-8222-222222222222'
  ),
  'organisation',
  'bootstrap sets organisation type'
);

-- Organisation incomplete without lawful / then complete
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a2222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);

select is(
  public.complete_employer_onboarding()->>'status',
  'incomplete',
  'organisation without lawful declaration is incomplete'
);

reset role;
update public.employer_profiles
set lawful_hiring_declared = true
where id = 'a2222222-2222-4222-8222-222222222222';

set local role authenticated;
select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'organisation with owned company completes'
);

-- Employer with company cannot change type
reset role;
select throws_ok(
  $$
    update public.employer_profiles
    set employer_type = 'private',
        organisation_legal_name = null
    where id = 'a2222222-2222-4222-8222-222222222222'
  $$,
  '23514',
  null,
  'employer with company cannot change type'
);

-- Second company denied by unique index
select throws_ok(
  $$
    insert into public.companies (name, slug, source, owner_employer_id)
    values (
      'Second Co',
      'second-co-org',
      'employer',
      'a2222222-2222-4222-8222-222222222222'
    )
  $$,
  '23505',
  null,
  'second employer company denied'
);

-- Clear organisation_legal_name invalidates completion
update public.employer_profiles
set organisation_legal_name = null
where id = 'a2222222-2222-4222-8222-222222222222';

select ok(
  (
    select onboarding_completed_at is null
    from public.employer_profiles
    where id = 'a2222222-2222-4222-8222-222222222222'
  ),
  'clearing organisation_legal_name clears organisation completion'
);

-- Restore and complete, then delete company clears completion
update public.employer_profiles
set
  organisation_legal_name = 'Org Legal GmbH',
  lawful_hiring_declared = true
where id = 'a2222222-2222-4222-8222-222222222222';

set local role authenticated;
select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'organisation re-completes before company delete'
);
reset role;

delete from public.companies
where owner_employer_id = 'a2222222-2222-4222-8222-222222222222';

select ok(
  (
    select onboarding_completed_at is null
    from public.employer_profiles
    where id = 'a2222222-2222-4222-8222-222222222222'
  ),
  'deleting owned company clears organisation completion'
);

-- Conflict: completed private cannot bootstrap to org
select set_config(
  'request.jwt.claim.sub',
  'a1111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

-- Ensure private is completed again
reset role;
update public.employer_profiles
set
  display_name = 'Private Employer',
  berlin_locality = 'Kreuzberg',
  lawful_hiring_declared = true
where id = 'a1111111-1111-4111-8111-111111111111';
set local role authenticated;
select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'private completed before bootstrap conflict assertion'
);

select is(
  public.bootstrap_organisation_employer(
    'X', 'Y', 'Z', 'Co', 'private-conflict-co', null, null
  )->>'status',
  'conflict_private_completed',
  'completed private employer cannot bootstrap organisation'
);

-- Seed regression: Demo company still seed/ownerless
reset role;
select ok(
  exists (
    select 1 from public.companies
    where id = '11111111-1111-4111-8111-111111111111'
      and source = 'seed'
      and owner_employer_id is null
  ),
  'Demo seed company unchanged'
);

select ok(
  exists (
    select 1 from public.vacancies
    where company_id = '11111111-1111-4111-8111-111111111111'
      and source = 'seed'
  ),
  'seed vacancies remain after employer migration'
);

-- Lawful declaration false clears completion
update public.employer_profiles
set
  display_name = 'Private Employer',
  berlin_locality = 'Kreuzberg',
  lawful_hiring_declared = true
where id = 'a1111111-1111-4111-8111-111111111111';
set local role authenticated;
select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'private completed before lawful invalidation'
);
reset role;

update public.employer_profiles
set lawful_hiring_declared = false
where id = 'a1111111-1111-4111-8111-111111111111';

select ok(
  (
    select onboarding_completed_at is null
      and lawful_hiring_declared_at is null
    from public.employer_profiles
    where id = 'a1111111-1111-4111-8111-111111111111'
  ),
  'clearing lawful declaration clears completion and timestamp'
);

select * from finish();
rollback;
