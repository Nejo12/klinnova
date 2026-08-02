-- Slice 2 hosted Demo fixture cleanup (D-031).
-- Deletes only known deterministic Demo fixture IDs.
-- Do not use table wipe commands. Never deletes by broad source filters.

delete from public.vacancy_language_requirements
where id in (
  '33333333-3333-4333-8333-333333333301'
);

delete from public.vacancies
where id in (
  '22222222-2222-4222-8222-222222222201',
  '22222222-2222-4222-8222-222222222206'
);

-- Remove the Demo company only when no remaining vacancies reference it.
delete from public.companies
where id = '11111111-1111-4111-8111-111111111111'
  and not exists (
    select 1
    from public.vacancies v
    where v.company_id = '11111111-1111-4111-8111-111111111111'
  );
