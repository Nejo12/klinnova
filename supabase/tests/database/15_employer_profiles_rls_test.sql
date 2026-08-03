begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
(
  '00000000-0000-0000-0000-000000000000',
  'e1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'employer-a@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'e2222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'employer-b@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'c3333333-3333-4333-8333-333333333333',
  'authenticated', 'authenticated', 'candidate-dual@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);

-- Dual capability: candidate + employer for same UUID
insert into public.candidate_profiles (id, display_name)
values ('c3333333-3333-4333-8333-333333333333', 'Dual User');

insert into public.employer_profiles (id, employer_type, display_name)
values
  ('e1111111-1111-4111-8111-111111111111', 'private', 'Employer A'),
  ('e2222222-2222-4222-8222-222222222222', 'organisation', 'Employer B'),
  ('c3333333-3333-4333-8333-333333333333', 'private', 'Dual Employer');

-- Anon denied
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
set local role anon;

select throws_ok(
  $$ select * from public.employer_profiles $$,
  '42501',
  null,
  'anon cannot select employer_profiles'
);

select throws_ok(
  $$
    insert into public.employer_profiles (id, employer_type)
    values ('e1111111-1111-4111-8111-111111111111', 'private')
  $$,
  '42501',
  null,
  'anon cannot insert employer_profiles'
);

reset role;

-- Owner A
select set_config(
  'request.jwt.claim.sub',
  'e1111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$
    select id from public.employer_profiles
    order by id
  $$,
  $$ values ('e1111111-1111-4111-8111-111111111111'::uuid) $$,
  'owner sees only own employer profile'
);

select throws_ok(
  $$
    insert into public.employer_profiles (id, employer_type)
    values ('e2222222-2222-4222-8222-222222222222', 'private')
  $$,
  '42501',
  null,
  'owner cannot insert another user employer profile'
);

select lives_ok(
  $$
    update public.employer_profiles
    set display_name = 'Employer A Updated'
    where id = 'e1111111-1111-4111-8111-111111111111'
  $$,
  'owner can update own permitted fields'
);

select throws_ok(
  $$
    update public.employer_profiles
    set onboarding_completed_at = now()
    where id = 'e1111111-1111-4111-8111-111111111111'
  $$,
  '42501',
  null,
  'owner cannot spoof onboarding_completed_at'
);

select throws_ok(
  $$
    update public.employer_profiles
    set verification_state = 'unverified'
    where id = 'e1111111-1111-4111-8111-111111111111'
  $$,
  '42501',
  null,
  'owner cannot update verification_state column'
);

select throws_ok(
  $$
    update public.employer_profiles
    set lawful_hiring_declared_at = now()
    where id = 'e1111111-1111-4111-8111-111111111111'
  $$,
  '42501',
  null,
  'owner cannot spoof lawful_hiring_declared_at'
);

select lives_ok(
  $$
    update public.employer_profiles
    set display_name = 'Hijack'
    where id = 'e2222222-2222-4222-8222-222222222222'
  $$,
  'cross-owner update is a no-op under RLS'
);

reset role;
select is(
  (
    select display_name from public.employer_profiles
    where id = 'e2222222-2222-4222-8222-222222222222'
  ),
  'Employer B',
  'unrelated employer profile unchanged after cross-update attempt'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'e1111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

select throws_ok(
  $$ delete from public.employer_profiles where id = 'e1111111-1111-4111-8111-111111111111' $$,
  '42501',
  null,
  'no authenticated delete on employer_profiles'
);

-- Private employer cannot create employer company via definer path using direct insert
-- (authenticated has no insert privilege)
select throws_ok(
  $$
    insert into public.companies (name, slug, source, owner_employer_id)
    values (
      'Bad Private Co',
      'bad-private-co',
      'employer',
      'e1111111-1111-4111-8111-111111111111'
    )
  $$,
  '42501',
  null,
  'authenticated cannot insert companies directly'
);

-- Employer-owned companies not visible to candidates via seed helper path
reset role;
select set_config(
  'request.jwt.claim.sub',
  'c3333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

-- Complete candidate so seed companies may become visible; employer companies still hidden
reset role;
update public.candidate_profiles
set
  german_comfort = 'basic',
  work_authorisation_declared = true,
  city = 'Berlin',
  travel_radius_minutes = 30,
  job_categories = array['cleaning']::text[],
  available_from = (timezone('Europe/Berlin', now()))::date,
  employment_types = array['full_time']::text[],
  shift_preferences = array['daytime']::text[],
  updated_at = now()
where id = 'c3333333-3333-4333-8333-333333333333';

insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('c3333333-3333-4333-8333-333333333333', 'de', 'native');

select set_config(
  'request.jwt.claim.sub',
  'c3333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;
select is(
  public.complete_candidate_onboarding()->>'status',
  'completed',
  'dual-capability candidate can complete onboarding'
);

reset role;
insert into public.companies (name, slug, source, owner_employer_id)
values (
  'Org Employer B Co',
  'org-employer-b-co',
  'employer',
  'e2222222-2222-4222-8222-222222222222'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'c3333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);

select is_empty(
  $$
    select id from public.companies
    where source = 'employer'
  $$,
  'completed candidate cannot see employer-owned companies'
);

select ok(
  exists (
    select 1 from public.companies
    where id = '11111111-1111-4111-8111-111111111111'
  ),
  'completed candidate can still see eligible seed company'
);

-- Org owner can see own company
reset role;
select set_config(
  'request.jwt.claim.sub',
  'e2222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e2222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$
    select name from public.companies where source = 'employer'
  $$,
  $$ values ('Org Employer B Co'::text) $$,
  'organisation employer selects own company'
);

select lives_ok(
  $$
    update public.companies
    set name = 'Org Employer B Co Renamed'
    where source = 'employer'
  $$,
  'organisation employer can update own company name'
);

-- Dual capability preserved
reset role;
select ok(
  exists (
    select 1 from public.candidate_profiles
    where id = 'c3333333-3333-4333-8333-333333333333'
  )
  and exists (
    select 1 from public.employer_profiles
    where id = 'c3333333-3333-4333-8333-333333333333'
  ),
  'same Auth UUID may hold candidate and employer profiles'
);

select is(
  (
    select display_name from public.candidate_profiles
    where id = 'c3333333-3333-4333-8333-333333333333'
  ),
  'Dual User',
  'adding employer profile does not alter candidate profile'
);

-- Unrelated employer cannot see B company
select set_config(
  'request.jwt.claim.sub',
  'e1111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select is_empty(
  $$ select id from public.companies where source = 'employer' $$,
  'unrelated employer cannot select employer-owned companies'
);

select throws_ok(
  $$ delete from public.companies where source = 'employer' $$,
  '42501',
  null,
  'no authenticated delete on companies'
);

-- Private cannot own company even as service_role insert attempt shape
reset role;
select throws_ok(
  $$
    insert into public.companies (name, slug, source, owner_employer_id)
    values (
      'Private Owned',
      'private-owned',
      'employer',
      'e1111111-1111-4111-8111-111111111111'
    )
  $$,
  '23514',
  null,
  'private employer cannot own employer company'
);

select * from finish();
rollback;
