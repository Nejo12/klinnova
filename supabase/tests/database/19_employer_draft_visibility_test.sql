begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
(
  '00000000-0000-0000-0000-000000000000',
  'f1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'vis-owner@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'f2222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'vis-other@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'f3333333-3333-4333-8333-333333333333',
  'authenticated', 'authenticated', 'vis-candidate@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared
) values
(
  'f1111111-1111-4111-8111-111111111111',
  'private',
  'Vis Owner',
  'Mitte',
  true
),
(
  'f2222222-2222-4222-8222-222222222222',
  'private',
  'Vis Other',
  'Mitte',
  true
);

insert into public.candidate_profiles (
  id, display_name, german_comfort, work_authorisation_declared,
  work_authorisation_declared_at, city, travel_radius_minutes, available_from,
  job_categories, employment_types, shift_preferences, onboarding_completed_at
) values (
  'f3333333-3333-4333-8333-333333333333',
  'Vis Candidate',
  'basic',
  true,
  now(),
  'Berlin',
  30,
  current_date,
  array['cleaning', 'hospitality']::text[],
  array['part_time', 'mini_job']::text[],
  array['daytime', 'morning']::text[],
  now()
);

-- Complete employers
select set_config(
  'request.jwt.claim.sub',
  'f1111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;
select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'visibility owner completes'
);

select is(
  public.create_employer_vacancy_draft(
    'Hidden Draft',
    'cleaning',
    'Mitte'
  )->>'status',
  'ok',
  'owner creates private draft for visibility matrix'
);

reset role;
select set_config(
  'test.vis_draft_id',
  (
    select id::text
    from public.vacancies
    where title = 'Hidden Draft'
      and employer_profile_id = 'f1111111-1111-4111-8111-111111111111'
  ),
  true
);

set local role authenticated;
select is(
  public.replace_employer_vacancy_languages(
    current_setting('test.vis_draft_id')::uuid,
    '[{"language_code":"en","min_proficiency":"basic"}]'::jsonb
  )->>'status',
  'ok',
  'owner attaches draft language for RLS checks'
);

-- Owner sees own draft
select is(
  (
    select count(*)::integer
    from public.vacancies
    where id = current_setting('test.vis_draft_id')::uuid
  ),
  1,
  'owner can select own employer draft'
);

select is(
  (
    select count(*)::integer
    from public.vacancy_language_requirements
    where vacancy_id = current_setting('test.vis_draft_id')::uuid
  ),
  1,
  'owner can select own draft language requirements'
);

-- Unrelated employer cannot see draft
reset role;
select set_config(
  'request.jwt.claim.sub',
  'f2222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f2222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;
select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'unrelated employer completes'
);

select is(
  (
    select count(*)::integer
    from public.vacancies
    where id = current_setting('test.vis_draft_id')::uuid
  ),
  0,
  'unrelated employer cannot select foreign draft'
);

select is(
  (
    select count(*)::integer
    from public.vacancy_language_requirements
    where vacancy_id = current_setting('test.vis_draft_id')::uuid
  ),
  0,
  'unrelated employer cannot select foreign draft languages'
);

-- Candidate cannot see draft; seed visibility unchanged
reset role;
select set_config(
  'request.jwt.claim.sub',
  'f3333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f3333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.vacancies
    where id = current_setting('test.vis_draft_id')::uuid
  ),
  0,
  'candidate cannot select employer draft'
);

select is(
  (
    select count(*)::integer
    from public.vacancy_language_requirements
    where vacancy_id = current_setting('test.vis_draft_id')::uuid
  ),
  0,
  'candidate cannot select private draft languages'
);

select ok(
  current_setting('test.vis_draft_id')::uuid
  <> all (array(select public.visible_seed_vacancy_ids())),
  'matcher/list helper excludes employer draft'
);

select is(
  (
    select count(*)::integer
    from public.visible_seed_vacancy_ids()
  ),
  9,
  'candidate visible seed vacancy count unchanged'
);

select ok(
  exists (
    select 1
    from public.vacancies
    where id = '22222222-2222-4222-8222-222222222201'
  ),
  'candidate still sees eligible seed vacancy detail row'
);

select is(
  public.submit_candidate_application(
    current_setting('test.vis_draft_id')::uuid
  )->>'result',
  'unavailable',
  'candidate application submission rejects draft'
);

-- Anon cannot see draft
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  $$ select * from public.vacancies $$,
  '42501',
  null,
  'anon cannot select vacancies'
);

select throws_ok(
  $$ select * from public.vacancy_language_requirements $$,
  '42501',
  null,
  'anon cannot select vacancy language requirements'
);

-- Direct authenticated mutation still denied for owner
reset role;
select set_config(
  'request.jwt.claim.sub',
  'f1111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    update public.vacancies
    set title = 'Direct Hack'
    where id = current_setting('test.vis_draft_id')::uuid
  $$,
  '42501',
  null,
  'owner cannot direct-update draft outside RPC'
);

select throws_ok(
  $$
    delete from public.vacancies
    where id = current_setting('test.vis_draft_id')::uuid
  $$,
  '42501',
  null,
  'owner cannot direct-delete draft outside RPC'
);

select throws_ok(
  $$
    insert into public.vacancy_language_requirements (
      vacancy_id, language_code, min_proficiency
    ) values (
      current_setting('test.vis_draft_id')::uuid,
      'tr',
      'basic'
    )
  $$,
  '42501',
  null,
  'owner cannot direct-insert draft languages outside RPC'
);

-- Seed vacancy language fixture regression
reset role;
select ok(
  exists (
    select 1
    from public.vacancy_language_requirements vlr
    join public.vacancies v on v.id = vlr.vacancy_id
    where v.source = 'seed'
  ),
  'seed language fixture rows remain present'
);

select is(
  (
    select count(*)::integer
    from public.vacancies
    where source = 'seed'
      and employer_profile_id is null
  ),
  13,
  'seed vacancy ownership null invariant holds after draft fixtures'
);

select is(
  (
    select count(*)::integer
    from public.companies
    where source = 'seed'
      and owner_employer_id is null
  ),
  2,
  'seed companies remain unowned'
);

-- Employer onboarding unaffected: create another completed private employer
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'f4444444-4444-4444-8444-444444444444',
  'authenticated', 'authenticated', 'vis-onboard@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared
) values (
  'f4444444-4444-4444-8444-444444444444',
  'private',
  'Onboard Still Works',
  'Wedding',
  true
);

select set_config(
  'request.jwt.claim.sub',
  'f4444444-4444-4444-8444-444444444444',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f4444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'employer onboarding completion unaffected by draft schema'
);

select is(
  public.create_employer_vacancy_draft(
    'After Onboard',
    'hospitality',
    'Wedding'
  )->>'status',
  'ok',
  'completed employer can still create draft after onboarding'
);

-- Draft not in company-linked candidate company helper
select set_config(
  'request.jwt.claim.sub',
  'f3333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f3333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select ok(
  not exists (
    select 1
    from public.visible_seed_company_ids() ids
    join public.companies c on c.id = ids
    where c.source = 'employer'
  ),
  'candidate company helper excludes employer companies'
);

select * from finish();
rollback;
