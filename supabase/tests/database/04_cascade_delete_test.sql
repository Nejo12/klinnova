begin;

create extension if not exists pgtap with schema extensions;

select plan(3);

-- Fixture ID generated in-test only (never a pre-existing local developer account).
create temporary table cascade_fixture (
  user_id uuid primary key
);

insert into cascade_fixture (user_id)
values (gen_random_uuid());

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  user_id,
  'authenticated',
  'authenticated',
  'cascade-' || user_id::text || '@example.test',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
from cascade_fixture;

insert into public.candidate_profiles (id, display_name)
select user_id, 'Cascade User'
from cascade_fixture;

insert into public.candidate_languages (candidate_id, language_code, proficiency)
select user_id, 'en', 'basic'
from cascade_fixture
union all
select user_id, 'uk', 'conversational'
from cascade_fixture;

select is(
  (
    select count(*)::integer
    from public.candidate_languages cl
    join cascade_fixture f on f.user_id = cl.candidate_id
  ),
  2,
  'language rows exist before auth user delete'
);

-- Privileged test context deletes only the fixture Auth user created above.
delete from auth.users
where id = (select user_id from cascade_fixture);

select is(
  (
    select count(*)::integer
    from public.candidate_profiles cp
    join cascade_fixture f on f.user_id = cp.id
  ),
  0,
  'deleting auth user removes candidate profile'
);

select is(
  (
    select count(*)::integer
    from public.candidate_languages cl
    join cascade_fixture f on f.user_id = cl.candidate_id
  ),
  0,
  'deleting auth user cascades candidate language rows'
);

select * from finish();
rollback;
