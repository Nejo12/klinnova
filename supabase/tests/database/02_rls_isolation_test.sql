begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

-- Two isolated Auth users
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
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'rls-a@example.test',
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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'rls-b@example.test',
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
  );

-- Seed owner B profile as table owner (bypasses RLS) for isolation targets
insert into public.candidate_profiles (id, display_name)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Owner B');

insert into public.candidate_languages (candidate_id, language_code, proficiency)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'pl', 'basic');

-- Authenticate as owner A
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    insert into public.candidate_profiles (id, display_name)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Owner A')
  $$,
  'owner A can insert own profile'
);

select results_eq(
  $$ select display_name from public.candidate_profiles $$,
  $$ values ('Owner A'::text) $$,
  'owner A selects only own profile'
);

select lives_ok(
  $$
    update public.candidate_profiles
    set display_name = 'Owner A Updated'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'owner A can update own profile'
);

select is_empty(
  $$
    select 1
    from public.candidate_profiles
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  $$,
  'owner A cannot select owner B profile'
);

select is_empty(
  $$
    update public.candidate_profiles
    set display_name = 'Hacked'
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    returning id
  $$,
  'owner A cannot update owner B profile'
);

select throws_ok(
  $$
    insert into public.candidate_profiles (id, display_name)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Impersonate B')
  $$,
  '42501',
  null,
  'owner A cannot insert a profile using owner B id'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '42501',
  null,
  'owner A cannot reassign ownership id'
);

select lives_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'en', 'conversational')
  $$,
  'owner A can insert own language row'
);

select lives_ok(
  $$
    update public.candidate_languages
    set proficiency = 'fluent'
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and language_code = 'en'
  $$,
  'owner A can update own language row'
);

-- Column privilege excludes candidate_id from UPDATE (immutable ownership).
select throws_ok(
  $$
    update public.candidate_languages
    set candidate_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and language_code = 'en'
  $$,
  '42501',
  null,
  'owner A cannot reassign language candidate_id (column privilege)'
);

-- Foreign candidate_id on insert is rejected by RLS WITH CHECK (not merely hidden).
select throws_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('99999999-9999-9999-9999-999999999999', 'fr', 'basic')
  $$,
  '42501',
  null,
  'owner A cannot attach language to nonexistent/foreign profile (WITH CHECK)'
);

select results_eq(
  $$ select language_code from public.candidate_languages order by language_code $$,
  $$ values ('en'::text) $$,
  'owner A selects only own language rows'
);

select is_empty(
  $$
    select 1
    from public.candidate_languages
    where candidate_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  $$,
  'owner A cannot read owner B language rows'
);

select is_empty(
  $$
    update public.candidate_languages
    set proficiency = 'hacked'
    where candidate_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    returning id
  $$,
  'owner A cannot update owner B language rows'
);

select throws_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'en', 'fluent')
  $$,
  '42501',
  null,
  'owner A cannot insert a language row owned by B'
);

select lives_ok(
  $$
    delete from public.candidate_languages
    where candidate_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and language_code = 'en'
  $$,
  'owner A can delete own language rows'
);

select is_empty(
  $$
    delete from public.candidate_languages
    where candidate_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    returning id
  $$,
  'owner A cannot delete owner B language rows'
);

-- No direct candidate delete in Slice 1 (privilege + no delete policy)
select throws_ok(
  $$
    delete from public.candidate_profiles
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '42501',
  null,
  'owner A cannot directly delete candidate_profiles'
);

-- Anonymous access: table privileges revoked (defense in depth beyond empty RLS)
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '', true);

select throws_ok(
  $$ select 1 from public.candidate_profiles $$,
  '42501',
  null,
  'anonymous cannot select candidate profiles'
);

select throws_ok(
  $$ select 1 from public.candidate_languages $$,
  '42501',
  null,
  'anonymous cannot select candidate languages'
);

select throws_ok(
  $$
    insert into public.candidate_profiles (id, display_name)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Anon')
  $$,
  '42501',
  null,
  'anonymous cannot insert candidate profiles'
);

select throws_ok(
  $$
    insert into public.candidate_languages (candidate_id, language_code, proficiency)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'en', 'basic')
  $$,
  '42501',
  null,
  'anonymous cannot insert candidate languages'
);

select throws_ok(
  $$
    update public.candidate_profiles
    set display_name = 'Anon'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  '42501',
  null,
  'anonymous cannot update candidate profiles'
);

select * from finish();
rollback;
