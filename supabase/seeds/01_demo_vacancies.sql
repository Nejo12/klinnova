-- Slice 2 PR 2.1 — deterministic fictional local/CI fixtures (D-031).
-- Loaded only by `supabase db reset` when [db.seed] is enabled.
-- Not applied by hosted schema migrations. No real company names.
-- Titles are labelled "Demo vacancy" for candidate-facing honesty.
--
-- Company A holds active matchable inventory.
-- Company B holds only non-visible lifecycle rows (company SELECT must hide it).

insert into public.companies (id, name, slug, source)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Demo Berlin Work Co',
    'demo-berlin-work-co',
    'seed'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Demo Lifecycle Shelf Co',
    'demo-lifecycle-shelf-co',
    'seed'
  );

insert into public.vacancies (
  id,
  company_id,
  title,
  slug,
  summary,
  city,
  job_category,
  employment_types,
  shift_requirements,
  german_requirement,
  available_from,
  publication_state,
  source,
  published_at,
  expires_at
)
values
  -- Active inventory (company A)
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111111',
    'Demo vacancy — Morning kitchen support',
    'demo-morning-kitchen-support',
    'Fictional demo hospitality role. Zero additional language requirements.',
    'Berlin',
    'hospitality',
    array['part_time', 'mini_job']::text[],
    array['morning', 'daytime']::text[],
    'basic',
    null,
    'published',
    'seed',
    '2026-01-15 09:00:00+00',
    '2027-12-31 23:59:59+00'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111111',
    'Demo vacancy — Warehouse evening shifts',
    'demo-warehouse-evening-shifts',
    'Fictional demo warehousing role with fixed start date.',
    'Berlin',
    'warehousing',
    array['full_time']::text[],
    array['evening', 'night']::text[],
    'none',
    '2026-09-01',
    'published',
    'seed',
    '2026-02-01 09:00:00+00',
    '2027-12-31 23:59:59+00'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '11111111-1111-4111-8111-111111111111',
    'Demo vacancy — Retail weekend support',
    'demo-retail-weekend-support',
    'Fictional demo retail role with weekend and daytime labels.',
    'Berlin',
    'retail',
    array['part_time', 'temporary']::text[],
    array['daytime', 'weekend']::text[],
    'conversational',
    null,
    'published',
    'seed',
    '2026-03-01 09:00:00+00',
    '2027-12-31 23:59:59+00'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    '11111111-1111-4111-8111-111111111111',
    'Demo vacancy — Cleaning daytime routes',
    'demo-cleaning-daytime-routes',
    'Fictional demo cleaning role for category overlap tests.',
    'Berlin',
    'cleaning',
    array['mini_job', 'part_time']::text[],
    array['daytime']::text[],
    'none',
    null,
    'published',
    'seed',
    '2026-04-01 09:00:00+00',
    '2027-12-31 23:59:59+00'
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    '11111111-1111-4111-8111-111111111111',
    'Demo vacancy — Logistics morning loading',
    'demo-logistics-morning-loading',
    'Fictional demo logistics role requiring comfortable German.',
    'Berlin',
    'logistics',
    array['full_time', 'temporary']::text[],
    array['morning']::text[],
    'comfortable',
    '2026-10-01',
    'published',
    'seed',
    '2026-05-01 09:00:00+00',
    '2027-12-31 23:59:59+00'
  ),
  (
    '22222222-2222-4222-8222-222222222206',
    '11111111-1111-4111-8111-111111111111',
    'Demo vacancy — Food production nights',
    'demo-food-production-nights',
    'Fictional demo food production role with English language requirement.',
    'Berlin',
    'food_production',
    array['full_time']::text[],
    array['night']::text[],
    'basic',
    null,
    'published',
    'seed',
    '2026-06-01 09:00:00+00',
    '2027-12-31 23:59:59+00'
  ),
  (
    '22222222-2222-4222-8222-222222222207',
    '11111111-1111-4111-8111-111111111111',
    'Demo vacancy — Moving crew daytime',
    'demo-moving-crew-daytime',
    'Fictional demo moving role with flexible start date.',
    'Berlin',
    'moving',
    array['temporary', 'part_time']::text[],
    array['daytime', 'weekend']::text[],
    'none',
    null,
    'published',
    'seed',
    '2026-07-01 09:00:00+00',
    '2027-12-31 23:59:59+00'
  ),
  (
    '22222222-2222-4222-8222-222222222208',
    '11111111-1111-4111-8111-111111111111',
    'Demo vacancy — Hospitality evening service',
    'demo-hospitality-evening-service',
    'Fictional demo hospitality role with a non-English language requirement.',
    'Berlin',
    'hospitality',
    array['mini_job']::text[],
    array['evening']::text[],
    'conversational',
    '2026-08-15',
    'published',
    'seed',
    '2026-08-01 09:00:00+00',
    '2027-12-31 23:59:59+00'
  ),
  (
    '22222222-2222-4222-8222-222222222209',
    '11111111-1111-4111-8111-111111111111',
    'Demo vacancy — Cleaning multi-language team',
    'demo-cleaning-multi-language-team',
    'Fictional demo cleaning role with two mandatory language requirements.',
    'Berlin',
    'cleaning',
    array['full_time']::text[],
    array['weekend']::text[],
    'basic',
    null,
    'published',
    'seed',
    '2026-07-15 09:00:00+00',
    '2027-12-31 23:59:59+00'
  ),
  -- Non-visible lifecycle inventory (company B only)
  (
    '22222222-2222-4222-8222-222222222210',
    '44444444-4444-4444-8444-444444444444',
    'Demo vacancy — Withdrawn sample',
    'demo-withdrawn-sample',
    'Fictional withdrawn demo vacancy; must not be visible.',
    'Berlin',
    'retail',
    array['part_time']::text[],
    array['daytime']::text[],
    'none',
    null,
    'withdrawn',
    'seed',
    '2026-01-01 09:00:00+00',
    '2027-12-31 23:59:59+00'
  ),
  (
    '22222222-2222-4222-8222-222222222211',
    '44444444-4444-4444-8444-444444444444',
    'Demo vacancy — Expired sample',
    'demo-expired-sample',
    'Fictional expired demo vacancy; must not be visible.',
    'Berlin',
    'retail',
    array['part_time']::text[],
    array['daytime']::text[],
    'none',
    null,
    'published',
    'seed',
    '2025-01-01 09:00:00+00',
    '2025-06-01 09:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-222222222212',
    '44444444-4444-4444-8444-444444444444',
    'Demo vacancy — Future publish sample',
    'demo-future-publish-sample',
    'Fictional future-published demo vacancy; must not be visible yet.',
    'Berlin',
    'retail',
    array['part_time']::text[],
    array['daytime']::text[],
    'none',
    null,
    'published',
    'seed',
    '2099-01-01 09:00:00+00',
    '2099-12-31 23:59:59+00'
  ),
  (
    '22222222-2222-4222-8222-222222222213',
    '44444444-4444-4444-8444-444444444444',
    'Demo vacancy — Boundary expired sample',
    'demo-boundary-expired-sample',
    'Fictional demo vacancy with expires_at in the past relative to reset time.',
    'Berlin',
    'retail',
    array['part_time']::text[],
    array['daytime']::text[],
    'none',
    null,
    'published',
    'seed',
    timezone('utc', now()) - interval '2 days',
    timezone('utc', now()) - interval '1 second'
  );

insert into public.vacancy_language_requirements (
  id,
  vacancy_id,
  language_code,
  min_proficiency
)
values
  (
    '33333333-3333-4333-8333-333333333301',
    '22222222-2222-4222-8222-222222222206',
    'en',
    'conversational'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    '22222222-2222-4222-8222-222222222208',
    'ar',
    'basic'
  ),
  (
    '33333333-3333-4333-8333-333333333303',
    '22222222-2222-4222-8222-222222222209',
    'en',
    'basic'
  ),
  (
    '33333333-3333-4333-8333-333333333304',
    '22222222-2222-4222-8222-222222222209',
    'tr',
    'conversational'
  ),
  (
    '33333333-3333-4333-8333-333333333305',
    '22222222-2222-4222-8222-222222222210',
    'en',
    'basic'
  );
