begin;

create extension if not exists pgtap with schema extensions;

select plan(35);

-- Privileged seed company for constraint cases that need a parent row.
insert into public.companies (id, name, slug, source)
values (
  'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
  'Constraint Fixture Co',
  'constraint-fixture-co',
  'seed'
);

-- Valid published vacancy inserts.
select lives_ok(
  $$
    insert into public.vacancies (
      id, company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'a0c0c0c0-c0c0-4000-8000-c0c0c0c0c001',
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Constraint valid vacancy',
      'constraint-valid-vacancy',
      'Valid fixture',
      'Berlin',
      'cleaning',
      array['part_time']::text[],
      array['daytime', 'weekend']::text[],
      'none',
      'published',
      'seed',
      '2026-01-01 00:00:00+00',
      '2027-01-01 00:00:00+00'
    )
  $$,
  'valid published vacancy inserts'
);

select lives_ok(
  $$
    insert into public.vacancy_language_requirements (
      vacancy_id, language_code, min_proficiency
    ) values (
      'a0c0c0c0-c0c0-4000-8000-c0c0c0c0c001',
      'en',
      'basic'
    )
  $$,
  'valid language requirement inserts'
);

select throws_ok(
  $$
    insert into public.companies (name, slug, source)
    values ('Bad source Co', 'bad-source-co', 'employer')
  $$,
  '23514',
  null,
  'companies.source rejects non-seed'
);

select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Bad city',
      'bad-city',
      'summary',
      'Munich',
      'cleaning',
      array['part_time']::text[],
      array['daytime']::text[],
      'none',
      'published',
      'seed',
      now(),
      now() + interval '30 days'
    )
  $$,
  '23514',
  null,
  'vacancy city must be Berlin'
);

select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Bad category',
      'bad-category',
      'summary',
      'Berlin',
      'software',
      array['part_time']::text[],
      array['daytime']::text[],
      'none',
      'published',
      'seed',
      now(),
      now() + interval '30 days'
    )
  $$,
  '23514',
  null,
  'job_category allow-list enforced'
);

select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Empty employment',
      'empty-employment',
      'summary',
      'Berlin',
      'cleaning',
      '{}'::text[],
      array['daytime']::text[],
      'none',
      'published',
      'seed',
      now(),
      now() + interval '30 days'
    )
  $$,
  '23514',
  null,
  'employment_types must be non-empty'
);

select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Dup employment',
      'dup-employment',
      'summary',
      'Berlin',
      'cleaning',
      array['part_time', 'part_time']::text[],
      array['daytime']::text[],
      'none',
      'published',
      'seed',
      now(),
      now() + interval '30 days'
    )
  $$,
  '23514',
  null,
  'employment_types must be unique'
);

select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Flexible shift',
      'flexible-shift',
      'summary',
      'Berlin',
      'cleaning',
      array['part_time']::text[],
      array['flexible']::text[],
      'none',
      'published',
      'seed',
      now(),
      now() + interval '30 days'
    )
  $$,
  '23514',
  null,
  'vacancy shifts cannot include flexible'
);

select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Bad german',
      'bad-german',
      'summary',
      'Berlin',
      'cleaning',
      array['part_time']::text[],
      array['daytime']::text[],
      'none_required',
      'published',
      'seed',
      now(),
      now() + interval '30 days'
    )
  $$,
  '23514',
  null,
  'german_requirement uses aligned vocabulary'
);

select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Published without timestamp',
      'published-without-ts',
      'summary',
      'Berlin',
      'cleaning',
      array['part_time']::text[],
      array['daytime']::text[],
      'none',
      'published',
      'seed',
      null,
      now() + interval '30 days'
    )
  $$,
  '23514',
  null,
  'published requires published_at'
);

select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Expires before publish',
      'expires-before-publish',
      'summary',
      'Berlin',
      'cleaning',
      array['part_time']::text[],
      array['daytime']::text[],
      'none',
      'published',
      'seed',
      '2027-01-01 00:00:00+00',
      '2026-01-01 00:00:00+00'
    )
  $$,
  '23514',
  null,
  'published_at must be <= expires_at'
);

select lives_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Withdrawn ok',
      'withdrawn-ok',
      'summary',
      'Berlin',
      'cleaning',
      array['part_time']::text[],
      array['daytime']::text[],
      'none',
      'withdrawn',
      'seed',
      null,
      now() + interval '30 days'
    )
  $$,
  'withdrawn may omit published_at'
);

select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Draft state',
      'draft-state',
      'summary',
      'Berlin',
      'cleaning',
      array['part_time']::text[],
      array['daytime']::text[],
      'none',
      'draft',
      'seed',
      now(),
      now() + interval '30 days'
    )
  $$,
  '23514',
  null,
  'publication_state only published or withdrawn'
);

select throws_ok(
  $$
    insert into public.vacancy_language_requirements (
      vacancy_id, language_code, min_proficiency
    ) values (
      'a0c0c0c0-c0c0-4000-8000-c0c0c0c0c001',
      'esperanto',
      'basic'
    )
  $$,
  '23514',
  null,
  'language_code allow-list enforced'
);

select throws_ok(
  $$
    insert into public.vacancy_language_requirements (
      vacancy_id, language_code, min_proficiency
    ) values (
      'a0c0c0c0-c0c0-4000-8000-c0c0c0c0c001',
      'en',
      'fluent'
    )
  $$,
  '23514',
  null,
  'min_proficiency allow-list enforced'
);

select throws_ok(
  $$
    insert into public.vacancy_language_requirements (
      vacancy_id, language_code, min_proficiency
    ) values (
      'a0c0c0c0-c0c0-4000-8000-c0c0c0c0c001',
      'en',
      'conversational'
    )
  $$,
  '23505',
  null,
  'unique (vacancy_id, language_code)'
);

select throws_ok(
  $$
    insert into public.companies (name, slug, source)
    values ('', 'empty-name', 'seed')
  $$,
  '23514',
  null,
  'company name non-empty'
);

select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Bad employment value',
      'bad-employment-value',
      'summary',
      'Berlin',
      'cleaning',
      array['gig']::text[],
      array['daytime']::text[],
      'none',
      'published',
      'seed',
      now(),
      now() + interval '30 days'
    )
  $$,
  '23514',
  null,
  'employment_types allow-list enforced'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vacancies'
      and column_name in (
        'salary',
        'salary_display',
        'english_ok',
        'experience',
        'latitude',
        'longitude'
      )
  ),
  'vacancies omits salary, english_ok, experience, and coordinates'
);

select ok(
  exists (
    select 1
    from public.vacancies
    where id = '22222222-2222-4222-8222-222222222201'
      and title like 'Demo vacancy%'
  ),
  'local/CI seed includes labelled Demo vacancy fixtures'
);

select ok(
  (
    select bool_and(source = 'seed' and name like 'Demo %')
    from public.companies
    where id in (
      '11111111-1111-4111-8111-111111111111',
      '44444444-4444-4444-8444-444444444444'
    )
  ),
  'fixture companies are fictional seed Demo records'
);

select is(
  (
    select count(*)::integer
    from public.vacancies
    where source = 'seed'
      and publication_state = 'published'
      and expires_at > now()
      and published_at <= now()
      and company_id = '11111111-1111-4111-8111-111111111111'
  ),
  9,
  'nine currently active demo vacancies on the active company'
);

select ok(
  exists (
    select 1
    from public.vacancies v
    where v.id = '22222222-2222-4222-8222-222222222201'
      and not exists (
        select 1
        from public.vacancy_language_requirements r
        where r.vacancy_id = v.id
      )
  ),
  'zero-language fixture exists'
);

select ok(
  exists (
    select 1
    from public.vacancy_language_requirements
    where vacancy_id = '22222222-2222-4222-8222-222222222206'
      and language_code = 'en'
  ),
  'English language fixture exists'
);

select ok(
  exists (
    select 1
    from public.vacancy_language_requirements
    where vacancy_id = '22222222-2222-4222-8222-222222222208'
      and language_code = 'ar'
  ),
  'non-English language fixture exists'
);

select ok(
  (
    select count(*)::integer
    from public.vacancy_language_requirements
    where vacancy_id = '22222222-2222-4222-8222-222222222209'
  ) >= 2,
  'multi-language fixture exists'
);

select ok(
  exists (
    select 1 from public.vacancies where id = '22222222-2222-4222-8222-222222222210'
      and publication_state = 'withdrawn'
  ),
  'withdrawn fixture exists'
);

select ok(
  exists (
    select 1 from public.vacancies where id = '22222222-2222-4222-8222-222222222211'
      and publication_state = 'published'
      and expires_at < now()
  ),
  'expired fixture exists'
);

select ok(
  exists (
    select 1 from public.vacancies where id = '22222222-2222-4222-8222-222222222212'
      and published_at > now()
  ),
  'future-published fixture exists'
);

select throws_ok(
  $$
    insert into public.companies (name, slug, source)
    values ('Leading space slug Co', ' leading-slug', 'seed')
  $$,
  '23514',
  null,
  'company slug with leading whitespace is rejected'
);

select throws_ok(
  $$
    insert into public.companies (name, slug, source)
    values ('Trailing space slug Co', 'trailing-slug ', 'seed')
  $$,
  '23514',
  null,
  'company slug with trailing whitespace is rejected'
);

select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Leading space vacancy slug',
      ' leading-vacancy-slug',
      'summary',
      'Berlin',
      'cleaning',
      array['part_time']::text[],
      array['daytime']::text[],
      'none',
      'published',
      'seed',
      now(),
      now() + interval '30 days'
    )
  $$,
  '23514',
  null,
  'vacancy slug with leading whitespace is rejected'
);

select throws_ok(
  $$
    insert into public.vacancies (
      company_id, title, slug, summary, city, job_category,
      employment_types, shift_requirements, german_requirement,
      publication_state, source, published_at, expires_at
    ) values (
      'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0',
      'Trailing space vacancy slug',
      'trailing-vacancy-slug ',
      'summary',
      'Berlin',
      'cleaning',
      array['part_time']::text[],
      array['daytime']::text[],
      'none',
      'published',
      'seed',
      now(),
      now() + interval '30 days'
    )
  $$,
  '23514',
  null,
  'vacancy slug with trailing whitespace is rejected'
);

select throws_ok(
  $$
    delete from public.companies
    where id = 'c0c0c0c0-c0c0-4000-8000-c0c0c0c0c0c0'
  $$,
  '23503',
  null,
  'deleting a referenced company is rejected'
);

insert into public.companies (id, name, slug, source)
values (
  'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1',
  'Unreferenced Delete Co',
  'unreferenced-delete-co',
  'seed'
);

select lives_ok(
  $$
    delete from public.companies
    where id = 'c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1'
  $$,
  'deleting an unreferenced company succeeds'
);

select * from finish();
rollback;
