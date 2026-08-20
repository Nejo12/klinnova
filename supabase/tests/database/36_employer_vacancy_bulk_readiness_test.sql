begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
(
  '00000000-0000-0000-0000-000000000000',
  'b1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'bulk-owner@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'b1000000-0000-4000-8000-000000000002',
  'authenticated', 'authenticated', 'bulk-other@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'b1000000-0000-4000-8000-000000000003',
  'authenticated', 'authenticated', 'bulk-operator@example.test',
  crypt('password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);

insert into public.employer_profiles (
  id, employer_type, display_name, berlin_locality, lawful_hiring_declared,
  onboarding_completed_at, verification_state, verification_requested_at,
  verification_attested_at, verification_attestation_version,
  verification_reviewed_at, verification_reviewed_by
) values
(
  'b1000000-0000-4000-8000-000000000001',
  'private',
  'Bulk Owner',
  'Mitte',
  true,
  now(),
  'verified',
  now(),
  now(),
  'v1',
  now(),
  'b1000000-0000-4000-8000-000000000003'
),
(
  'b1000000-0000-4000-8000-000000000002',
  'private',
  'Bulk Other',
  'Mitte',
  true,
  now(),
  'verified',
  now(),
  now(),
  'v1',
  now(),
  'b1000000-0000-4000-8000-000000000003'
);

insert into public.vacancies (
  id, employer_profile_id, title, slug, summary, description, city,
  job_category, employment_types, shift_requirements, german_requirement,
  publication_state, source, public_locality, workplace_type, work_frequency,
  salary_amount_cents, salary_currency, salary_period, salary_is_gross,
  cv_required, interview_english_ok
) values
(
  'b2000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  'Incomplete bulk draft',
  'incomplete-bulk-draft',
  'summary',
  null,
  'Berlin',
  'cleaning',
  '{}'::text[],
  '{}'::text[],
  'none',
  'draft',
  'employer',
  'Mitte',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null
),
(
  'b2000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000001',
  'Complete bulk draft',
  'complete-bulk-draft',
  'summary',
  'A complete cleaning draft.',
  'Berlin',
  'cleaning',
  array['part_time']::text[],
  array['morning']::text[],
  'none',
  'draft',
  'employer',
  'Mitte',
  'apartment',
  'recurring',
  1600,
  'EUR',
  'hourly',
  true,
  false,
  true
),
(
  'b2000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000002',
  'Other employer bulk draft',
  'other-employer-bulk-draft',
  'summary',
  'Another employer draft.',
  'Berlin',
  'cleaning',
  array['part_time']::text[],
  array['morning']::text[],
  'none',
  'draft',
  'employer',
  'Mitte',
  'apartment',
  'recurring',
  1600,
  'EUR',
  'hourly',
  true,
  false,
  true
);

insert into public.vacancy_language_requirements (
  vacancy_id, language_code, min_proficiency
) values
(
  'b2000000-0000-4000-8000-000000000002',
  'en',
  'basic'
),
(
  'b2000000-0000-4000-8000-000000000003',
  'en',
  'basic'
);

select has_function(
  'public',
  'employer_vacancy_drafts_readiness',
  'bulk readiness RPC exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.employer_vacancy_drafts_readiness(uuid[])',
    'execute'
  ),
  'authenticated can execute employer_vacancy_drafts_readiness'
);

select set_config(
  'request.jwt.claim.sub',
  'b1000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.employer_vacancy_drafts_readiness(array[]::uuid[])
  ),
  0,
  'empty bulk readiness input returns no rows'
);

select is(
  (
    select count(*)::integer
    from public.employer_vacancy_drafts_readiness(array[
      'b2000000-0000-4000-8000-000000000001'::uuid,
      'b2000000-0000-4000-8000-000000000002'::uuid
    ])
  ),
  2,
  'bulk readiness returns both owned requested drafts'
);

select is(
  (
    select to_jsonb(missing)
    from public.employer_vacancy_drafts_readiness(array[
      'b2000000-0000-4000-8000-000000000001'::uuid
    ])
    where vacancy_id = 'b2000000-0000-4000-8000-000000000001'
  ),
  public.employer_vacancy_draft_readiness(
    'b2000000-0000-4000-8000-000000000001'::uuid
  )->'missing',
  'bulk readiness missing list matches single readiness for an incomplete draft'
);

select is(
  (
    select ready::text
    from public.employer_vacancy_drafts_readiness(array[
      'b2000000-0000-4000-8000-000000000002'::uuid
    ])
    where vacancy_id = 'b2000000-0000-4000-8000-000000000002'
  ),
  public.employer_vacancy_draft_readiness(
    'b2000000-0000-4000-8000-000000000002'::uuid
  )->>'ready',
  'bulk readiness ready flag matches single readiness for a complete draft'
);

select is(
  (
    select string_agg(vacancy_id::text, ',' order by ordinality)
    from (
      select row_number() over () as ordinality, vacancy_id
      from public.employer_vacancy_drafts_readiness(array[
        'b2000000-0000-4000-8000-000000000002'::uuid,
        'b2000000-0000-4000-8000-000000000001'::uuid
      ])
    ) ordered_rows
  ),
  'b2000000-0000-4000-8000-000000000002,b2000000-0000-4000-8000-000000000001',
  'bulk readiness preserves first input order for owned IDs'
);

select is(
  (
    select count(*)::integer
    from public.employer_vacancy_drafts_readiness(array[
      'b2000000-0000-4000-8000-000000000001'::uuid,
      'b2000000-0000-4000-8000-000000000001'::uuid
    ])
  ),
  1,
  'bulk readiness handles duplicate IDs deterministically as one row'
);

select is(
  (
    select count(*)::integer
    from public.employer_vacancy_drafts_readiness(array[
      'b2000000-0000-4000-8000-000000000001'::uuid,
      'b2000000-0000-4000-8000-000000000003'::uuid
    ])
  ),
  1,
  'bulk readiness omits another employer vacancy without leaking it'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'b1000000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is(
  (
    select array_agg(vacancy_id)
    from public.employer_vacancy_drafts_readiness(array[
      'b2000000-0000-4000-8000-000000000001'::uuid,
      'b2000000-0000-4000-8000-000000000003'::uuid
    ])
  ),
  array['b2000000-0000-4000-8000-000000000003'::uuid],
  'another employer sees only their own requested readiness row'
);

select * from finish();

rollback;
