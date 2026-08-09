begin;

create extension if not exists pgtap with schema extensions;

select plan(60);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
(
  '00000000-0000-0000-0000-000000000000',
  'e1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'private-draft@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'e2222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'org-draft@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'e3333333-3333-4333-8333-333333333333',
  'authenticated', 'authenticated', 'other-emp@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'e4444444-4444-4444-8444-444444444444',
  'authenticated', 'authenticated', 'incomplete-emp@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);

-- Unauthenticated create
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
set local role authenticated;

select is(
  public.create_employer_vacancy_draft(
    'Title', 'cleaning', 'Mitte'
  )->>'status',
  'unauthenticated',
  'create without jwt is unauthenticated'
);

-- Incomplete employer denied
reset role;
insert into public.employer_profiles (id, employer_type, display_name)
values ('e4444444-4444-4444-8444-444444444444', 'private', 'Incomplete');

select set_config(
  'request.jwt.claim.sub',
  'e4444444-4444-4444-8444-444444444444',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e4444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.create_employer_vacancy_draft(
    'Title', 'cleaning', 'Mitte'
  )->>'status',
  'incomplete_employer',
  'incomplete employer cannot create draft'
);

-- Complete private employer
reset role;
insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared
) values (
  'e1111111-1111-4111-8111-111111111111',
  'private',
  'Private Draft Employer',
  'Kreuzberg',
  true
);

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

select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'private employer completes before draft create'
);

select is(
  public.create_employer_vacancy_draft(
    '', 'cleaning', 'Mitte'
  )->>'status',
  'validation_error',
  'empty title rejected'
);

select is(
  public.create_employer_vacancy_draft(
    'Morning Clean', 'cleaning', ''
  )->>'status',
  'validation_error',
  'empty locality rejected'
);

select is(
  (
    select public.create_employer_vacancy_draft(
      'Morning Clean',
      'cleaning',
      'Mitte'
    )->>'status'
  ),
  'ok',
  'private employer creates owned draft'
);

reset role;
select ok(
  (
    select source = 'employer'
      and publication_state = 'draft'
      and employer_profile_id = 'e1111111-1111-4111-8111-111111111111'
      and company_id is null
      and expires_at is null
      and published_at is null
      and city = 'Berlin'
      and public_locality = 'Mitte'
      and title = 'Morning Clean'
    from public.vacancies
    where employer_profile_id = 'e1111111-1111-4111-8111-111111111111'
    order by created_at desc
    limit 1
  ),
  'private draft has derived ownership, null company, null expiry'
);

-- Capture private draft id
select set_config(
  'test.private_draft_id',
  (
    select id::text
    from public.vacancies
    where employer_profile_id = 'e1111111-1111-4111-8111-111111111111'
    order by created_at desc
    limit 1
  ),
  true
);

-- Organisation employer via bootstrap
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

select is(
  public.bootstrap_organisation_employer(
    'Org Draft',
    'Org Draft Legal GmbH',
    'Mitte',
    'Org Draft Co',
    'org-draft-co',
    null,
    null
  )->>'status',
  'ok',
  'organisation bootstrap for draft owner'
);

reset role;
update public.employer_profiles
set lawful_hiring_declared = true
where id = 'e2222222-2222-4222-8222-222222222222';

set local role authenticated;
select is(
  public.complete_employer_onboarding()->>'status',
  'completed',
  'organisation employer completes'
);

select is(
  public.create_employer_vacancy_draft(
    'Org Warehouse Help',
    'warehousing',
    'Wedding'
  )->>'status',
  'ok',
  'organisation employer creates owned draft'
);

reset role;
select ok(
  (
    select v.company_id = c.id
      and c.owner_employer_id = 'e2222222-2222-4222-8222-222222222222'
      and c.source = 'employer'
      and v.employer_profile_id = 'e2222222-2222-4222-8222-222222222222'
      and v.source = 'employer'
      and v.publication_state = 'draft'
    from public.vacancies v
    join public.companies c on c.id = v.company_id
    where v.employer_profile_id = 'e2222222-2222-4222-8222-222222222222'
    order by v.created_at desc
    limit 1
  ),
  'organisation draft uses derived owned company'
);

select set_config(
  'test.org_draft_id',
  (
    select id::text
    from public.vacancies
    where employer_profile_id = 'e2222222-2222-4222-8222-222222222222'
    order by created_at desc
    limit 1
  ),
  true
);

-- Private cannot reference seed company via direct insert
select throws_ok(
  $$
    insert into public.vacancies (
      company_id, employer_profile_id, title, slug, summary, city,
      job_category, employment_types, shift_requirements, german_requirement,
      publication_state, source, public_locality
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'e1111111-1111-4111-8111-111111111111',
      'Spoof Co',
      'spoof-co-draft',
      'x',
      'Berlin',
      'cleaning',
      '{}'::text[],
      '{}'::text[],
      'none',
      'draft',
      'employer',
      'Mitte'
    )
  $$,
  '23514',
  null,
  'private employer draft cannot attach company'
);

-- Update draft — owner
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

select is(
  public.update_employer_vacancy_draft(
    current_setting('test.private_draft_id')::uuid,
    p_title := 'Morning Clean Updated',
    p_description := 'Clean kitchens before lunch',
    p_salary_amount_cents := 1500,
    p_salary_period := 'hourly'
  )->>'status',
  'ok',
  'owner can update permitted draft fields'
);

reset role;
select ok(
  (
    select title = 'Morning Clean Updated'
      and description = 'Clean kitchens before lunch'
      and salary_amount_cents = 1500
      and salary_period = 'hourly'
      and salary_currency = 'EUR'
      and salary_is_gross is true
      and expires_at is null
      and publication_state = 'draft'
      and source = 'employer'
      and employer_profile_id = 'e1111111-1111-4111-8111-111111111111'
      and company_id is null
    from public.vacancies
    where id = current_setting('test.private_draft_id')::uuid
  ),
  'update preserves ownership/source/lifecycle and salary group'
);

-- Unrelated employer update
select set_config(
  'request.jwt.claim.sub',
  'e3333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e3333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.update_employer_vacancy_draft(
    current_setting('test.private_draft_id')::uuid,
    p_title := 'Hijack'
  )->>'status',
  'unavailable',
  'unrelated employer update is unavailable'
);

-- Seed vacancy cannot be updated via employer RPC
select is(
  public.update_employer_vacancy_draft(
    '22222222-2222-4222-8222-222222222201'::uuid,
    p_title := 'Hijack Seed'
  )->>'status',
  'unavailable',
  'seed vacancy cannot be updated through employer draft RPC'
);

-- Languages — owner replace
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

select is(
  public.replace_employer_vacancy_languages(
    current_setting('test.private_draft_id')::uuid,
    '[]'::jsonb
  )->>'status',
  'ok',
  'zero-language draft replace allowed'
);

select is(
  public.replace_employer_vacancy_languages(
    current_setting('test.private_draft_id')::uuid,
    '[{"language_code":"en","min_proficiency":"basic"},{"language_code":"en","min_proficiency":"native"}]'::jsonb
  )->>'status',
  'conflict_unique',
  'duplicate language codes rejected'
);

select is(
  public.replace_employer_vacancy_languages(
    current_setting('test.private_draft_id')::uuid,
    '[{"language_code":"xx","min_proficiency":"basic"}]'::jsonb
  )->>'status',
  'conflict_check',
  'invalid language code rejected'
);

select is(
  public.replace_employer_vacancy_languages(
    current_setting('test.private_draft_id')::uuid,
    '[{"language_code":"en","min_proficiency":"fluent"}]'::jsonb
  )->>'status',
  'conflict_check',
  'invalid proficiency rejected'
);

select is(
  public.replace_employer_vacancy_languages(
    current_setting('test.private_draft_id')::uuid,
    '[{"language_code":"en","min_proficiency":"basic"},{"language_code":"tr","min_proficiency":"conversational"}]'::jsonb
  )->>'status',
  'ok',
  'owner can atomically replace draft languages'
);

reset role;
select is(
  (
    select count(*)::integer
    from public.vacancy_language_requirements
    where vacancy_id = current_setting('test.private_draft_id')::uuid
  ),
  2,
  'language replace wrote two rows'
);

-- Unrelated language replace
select set_config(
  'request.jwt.claim.sub',
  'e3333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e3333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.replace_employer_vacancy_languages(
    current_setting('test.private_draft_id')::uuid,
    '[{"language_code":"en","min_proficiency":"basic"}]'::jsonb
  )->>'status',
  'unavailable',
  'unrelated employer cannot replace languages'
);

-- Seed languages cannot be modified
select is(
  public.replace_employer_vacancy_languages(
    '22222222-2222-4222-8222-222222222202'::uuid,
    '[{"language_code":"en","min_proficiency":"basic"}]'::jsonb
  )->>'status',
  'unavailable',
  'seed vacancy languages cannot be modified via employer RPC'
);

-- Readiness — incomplete fields
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

select is(
  public.employer_vacancy_draft_readiness(
    current_setting('test.org_draft_id')::uuid
  )->>'ready',
  'false',
  'minimum draft without publication fields is not ready'
);

select ok(
  public.employer_vacancy_draft_readiness(
    current_setting('test.org_draft_id')::uuid
  )->'missing' ? 'salary',
  'readiness reports missing salary'
);

select ok(
  public.employer_vacancy_draft_readiness(
    current_setting('test.org_draft_id')::uuid
  )->'missing' ? 'languages',
  'readiness reports missing languages'
);

select ok(
  public.employer_vacancy_draft_readiness(
    current_setting('test.org_draft_id')::uuid
  )->'missing' ? 'description',
  'readiness reports missing description'
);

-- Complete private draft readiness
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

-- D-M5-19: fill every vacancy-level field employer_vacancy_draft_readiness
-- now checks (workplace_type/work_frequency/cv_required/
-- interview_english_ok/employment_types/shift_requirements), so the only
-- remaining gap below is the employer-level verification requirement —
-- proving readiness now genuinely agrees with what publish would require,
-- not merely that every *vacancy* field is filled.
select is(
  public.update_employer_vacancy_draft(
    current_setting('test.private_draft_id')::uuid,
    p_workplace_type := 'apartment',
    p_work_frequency := 'recurring',
    p_cv_required := false,
    p_interview_english_ok := true,
    p_employment_types := array['full_time'],
    p_shift_requirements := array['morning']
  )->>'status',
  'ok',
  'owner sets the remaining vacancy-level readiness fields'
);

select is(
  public.employer_vacancy_draft_readiness(
    current_setting('test.private_draft_id')::uuid
  )->>'ready',
  'false',
  'vacancy-complete draft is still not ready while its employer is unverified'
);

select is(
  (
    select to_jsonb(array['verification'])
  ),
  (
    select public.employer_vacancy_draft_readiness(
      current_setting('test.private_draft_id')::uuid
    )->'missing'
  ),
  'verification is the only remaining missing item once every vacancy field is complete'
);

reset role;
select ok(
  (
    select publication_state = 'draft'
      and published_at is null
      and expires_at is null
    from public.vacancies
    where id = current_setting('test.private_draft_id')::uuid
  ),
  'readiness does not publish'
);

select ok(
  (
    select verification_state = 'unverified'
    from public.employer_profiles
    where id = 'e1111111-1111-4111-8111-111111111111'
  ),
  'unverified employer may still reach draft readiness'
);

-- Unrelated readiness unavailable
select set_config(
  'request.jwt.claim.sub',
  'e3333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e3333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.employer_vacancy_draft_readiness(
    current_setting('test.private_draft_id')::uuid
  )->>'status',
  'unavailable',
  'unrelated employer readiness is unavailable'
);

-- Delete — unrelated denied
select is(
  public.delete_employer_vacancy_draft(
    current_setting('test.private_draft_id')::uuid
  )->>'status',
  'unavailable',
  'unrelated employer cannot delete draft'
);

-- Seed delete denied
select is(
  public.delete_employer_vacancy_draft(
    '22222222-2222-4222-8222-222222222201'::uuid
  )->>'status',
  'unavailable',
  'seed vacancy deletion denied'
);

-- Owner delete org draft
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

select is(
  public.delete_employer_vacancy_draft(
    current_setting('test.org_draft_id')::uuid
  )->>'status',
  'ok',
  'owner may delete eligible draft'
);

reset role;
select ok(
  not exists (
    select 1 from public.vacancies
    where id = current_setting('test.org_draft_id')::uuid
  ),
  'deleted draft row removed'
);

select ok(
  exists (
    select 1 from public.employer_profiles
    where id = 'e2222222-2222-4222-8222-222222222222'
  )
  and exists (
    select 1 from public.companies
    where owner_employer_id = 'e2222222-2222-4222-8222-222222222222'
  ),
  'delete leaves employer profile and company'
);

-- Language rows removed with private draft delete after clearing langs first
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

select is(
  public.create_employer_vacancy_draft(
    'Temp Delete Langs',
    'cleaning',
    'Neukölln'
  )->>'status',
  'ok',
  'create second private draft for language cascade'
);

reset role;
select set_config(
  'test.lang_draft_id',
  (
    select id::text
    from public.vacancies
    where title = 'Temp Delete Langs'
    limit 1
  ),
  true
);

set local role authenticated;
select is(
  public.replace_employer_vacancy_languages(
    current_setting('test.lang_draft_id')::uuid,
    '[{"language_code":"de","min_proficiency":"basic"}]'::jsonb
  )->>'status',
  'ok',
  'attach language before delete cascade'
);

select is(
  public.delete_employer_vacancy_draft(
    current_setting('test.lang_draft_id')::uuid
  )->>'status',
  'ok',
  'delete draft with language rows'
);

reset role;
select ok(
  not exists (
    select 1
    from public.vacancy_language_requirements
    where vacancy_id = current_setting('test.lang_draft_id')::uuid
  ),
  'language rows cascade on draft delete'
);

-- Draft with application cannot be deleted
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

select is(
  public.create_employer_vacancy_draft(
    'Applied Draft',
    'cleaning',
    'Mitte'
  )->>'status',
  'ok',
  'create draft that will receive application fixture'
);

reset role;
select set_config(
  'test.applied_draft_id',
  (
    select id::text
    from public.vacancies
    where title = 'Applied Draft'
    limit 1
  ),
  true
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'c1919191-1919-4191-8191-191919191919',
  'authenticated', 'authenticated', 'app-on-draft@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);

insert into public.candidate_profiles (
  id, display_name, german_comfort, work_authorisation_declared,
  work_authorisation_declared_at, city, travel_radius_minutes, available_from,
  job_categories, employment_types, shift_preferences, onboarding_completed_at
) values (
  'c1919191-1919-4191-8191-191919191919',
  'App Candidate',
  'basic',
  true,
  now(),
  'Berlin',
  30,
  current_date,
  array['cleaning']::text[],
  array['part_time']::text[],
  array['daytime']::text[],
  now()
);

-- Force an application row against the draft (bypass submit RPC) to prove delete guard.
insert into public.applications (
  candidate_id,
  vacancy_id,
  status,
  snapshot_version,
  candidate_snapshot,
  vacancy_snapshot
) values (
  'c1919191-1919-4191-8191-191919191919',
  current_setting('test.applied_draft_id')::uuid,
  'submitted',
  1,
  '{"v":1}'::jsonb,
  '{"v":1}'::jsonb
);

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

select is(
  public.delete_employer_vacancy_draft(
    current_setting('test.applied_draft_id')::uuid
  )->>'status',
  'not_deletable',
  'draft with application cannot be deleted'
);

-- Application submit rejects employer draft
select set_config(
  'request.jwt.claim.sub',
  'c1919191-1919-4191-8191-191919191919',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"c1919191-1919-4191-8191-191919191919","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.submit_candidate_application(
    current_setting('test.private_draft_id')::uuid
  )->>'result',
  'unavailable',
  'application submission rejects employer draft'
);

-- Seed application still works
select is(
  public.submit_candidate_application(
    '22222222-2222-4222-8222-222222222204'::uuid
  )->>'result',
  'submitted',
  'eligible seed vacancy application still succeeds'
);

-- Type lock: incomplete private with no draft may change type
reset role;
insert into public.employer_profiles (id, employer_type, display_name)
values ('e3333333-3333-4333-8333-333333333333', 'private', 'Type Switch');

select lives_ok(
  $$
    update public.employer_profiles
    set employer_type = 'organisation',
        organisation_legal_name = 'Switch Legal'
    where id = 'e3333333-3333-4333-8333-333333333333'
  $$,
  'incomplete employer with no company/draft may change type'
);

select lives_ok(
  $$
    update public.employer_profiles
    set employer_type = 'private',
        organisation_legal_name = null
    where id = 'e3333333-3333-4333-8333-333333333333'
  $$,
  'incomplete employer can switch back to private without draft'
);

-- Incomplete private with direct draft cannot change type
insert into public.vacancies (
  employer_profile_id, title, slug, summary, city, job_category,
  employment_types, shift_requirements, german_requirement,
  publication_state, source, public_locality
) values (
  'e3333333-3333-4333-8333-333333333333',
  'Lock Draft',
  'lock-draft-type',
  'x',
  'Berlin',
  'cleaning',
  '{}'::text[],
  '{}'::text[],
  'none',
  'draft',
  'employer',
  'Mitte'
);

select throws_ok(
  $$
    update public.employer_profiles
    set employer_type = 'organisation',
        organisation_legal_name = 'Blocked Legal'
    where id = 'e3333333-3333-4333-8333-333333333333'
  $$,
  '23514',
  null,
  'private employer with draft cannot change type'
);

-- Delete the only draft restores type-change eligibility while incomplete
select set_config(
  'test.lock_draft_id',
  (
    select id::text from public.vacancies
    where slug = 'lock-draft-type'
  ),
  true
);

delete from public.vacancies
where id = current_setting('test.lock_draft_id')::uuid;

select lives_ok(
  $$
    update public.employer_profiles
    set employer_type = 'organisation',
        organisation_legal_name = 'Restored Legal'
    where id = 'e3333333-3333-4333-8333-333333333333'
  $$,
  'deleting only draft restores type-change eligibility while incomplete'
);

-- Completed employer remains locked
select throws_ok(
  $$
    update public.employer_profiles
    set employer_type = 'organisation',
        organisation_legal_name = 'Nope'
    where id = 'e1111111-1111-4111-8111-111111111111'
  $$,
  '23514',
  null,
  'completed employer remains type-locked'
);

-- Organisation with company remains locked
select throws_ok(
  $$
    update public.employer_profiles
    set employer_type = 'private',
        organisation_legal_name = null
    where id = 'e2222222-2222-4222-8222-222222222222'
  $$,
  '23514',
  null,
  'organisation employer with company remains type-locked'
);

-- Create conflict_check for invalid category
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

select is(
  public.create_employer_vacancy_draft(
    'Bad Cat',
    'not_a_category',
    'Mitte'
  )->>'status',
  'conflict_check',
  'invalid job category rejected by create'
);

-- Missing vacancy delete is unavailable
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

select is(
  public.delete_employer_vacancy_draft(
    '00000000-0000-4000-8000-000000000099'::uuid
  )->>'status',
  'unavailable',
  'missing vacancy delete is unavailable'
);

-- Clear salary / languages → not ready
select is(
  public.update_employer_vacancy_draft(
    current_setting('test.private_draft_id')::uuid,
    p_clear_salary := true
  )->>'status',
  'ok',
  'owner can clear salary group'
);

select ok(
  public.employer_vacancy_draft_readiness(
    current_setting('test.private_draft_id')::uuid
  )->'missing' ? 'salary',
  'cleared salary makes draft not ready'
);

select is(
  public.replace_employer_vacancy_languages(
    current_setting('test.private_draft_id')::uuid,
    '[]'::jsonb
  )->>'status',
  'ok',
  'clear languages on previously ready draft'
);

select ok(
  public.employer_vacancy_draft_readiness(
    current_setting('test.private_draft_id')::uuid
  )->'missing' ? 'languages',
  'zero-language draft is not ready'
);

-- Draft lifecycle rejects published_at while draft
reset role;
select throws_ok(
  $$
    update public.vacancies
    set published_at = now()
    where id = current_setting('test.private_draft_id')::uuid
  $$,
  '23514',
  null,
  'draft lifecycle rejects published_at while draft'
);

select * from finish();
rollback;
