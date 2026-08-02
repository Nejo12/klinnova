-- Slice 2 hosted Demo fixtures (D-031).
-- Owner-run only. Never applied by migrations, CI, build, or deploy.
-- Idempotent upsert of a small fictional Berlin Demo set.
-- expires_at is bounded relative to execution time (30 days).

insert into public.companies (id, name, slug, source)
values (
  '11111111-1111-4111-8111-111111111111',
  'Demo Berlin Work Co',
  'demo-berlin-work-co',
  'seed'
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  source = excluded.source,
  updated_at = timezone('utc', now());

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
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '30 days'
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
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '30 days'
  )
on conflict (id) do update
set
  company_id = excluded.company_id,
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  city = excluded.city,
  job_category = excluded.job_category,
  employment_types = excluded.employment_types,
  shift_requirements = excluded.shift_requirements,
  german_requirement = excluded.german_requirement,
  available_from = excluded.available_from,
  publication_state = excluded.publication_state,
  source = excluded.source,
  published_at = excluded.published_at,
  expires_at = excluded.expires_at,
  updated_at = timezone('utc', now());

insert into public.vacancy_language_requirements (
  id,
  vacancy_id,
  language_code,
  min_proficiency
)
values (
  '33333333-3333-4333-8333-333333333301',
  '22222222-2222-4222-8222-222222222206',
  'en',
  'conversational'
)
on conflict (id) do update
set
  vacancy_id = excluded.vacancy_id,
  language_code = excluded.language_code,
  min_proficiency = excluded.min_proficiency,
  updated_at = timezone('utc', now());
