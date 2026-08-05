begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

select has_table('public', 'verification_operators', 'verification operators table exists');
select has_column('public', 'verification_operators', 'user_id', 'operator user id exists');
select has_column('public', 'verification_operators', 'created_at', 'operator created at exists');
select has_column('public', 'verification_operators', 'created_by', 'operator creator exists');
select has_column('public', 'verification_operators', 'active', 'operator active flag exists');
select col_is_pk('public', 'verification_operators', 'user_id', 'operator user id is primary key');
select ok(
  not has_table_privilege('authenticated', 'public.verification_operators', 'select'),
  'authenticated cannot read operators'
);
select ok(
  has_table_privilege('service_role', 'public.verification_operators', 'insert'),
  'service role manages operators'
);

select has_column('public', 'employer_profiles', 'verification_requested_at', 'requested timestamp exists');
select has_column('public', 'employer_profiles', 'verification_reviewed_at', 'reviewed timestamp exists');
select has_column('public', 'employer_profiles', 'verification_reviewed_by', 'reviewer exists');
select has_column('public', 'employer_profiles', 'verification_review_reason', 'review reason exists');
select has_column('public', 'employer_profiles', 'verification_attested_at', 'attestation timestamp exists');
select has_column('public', 'employer_profiles', 'verification_attestation_version', 'attestation version exists');
select ok(
  not exists (
    select 1 from pg_constraint
    where conname = 'employer_profiles_verification_unverified_chk'
  ),
  'unverified-only constraint removed'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'employer_profiles_verification_state_chk'
      and pg_get_constraintdef(oid) like '%pending%'
      and pg_get_constraintdef(oid) like '%revoked%'
  ),
  'verification vocabulary expanded'
);

select has_column('public', 'vacancies', 'paused_at', 'paused timestamp exists');
select has_column('public', 'vacancies', 'filled_at', 'filled timestamp exists');
select has_column('public', 'vacancies', 'withdrawn_at', 'withdrawn timestamp exists');
select has_column('public', 'vacancies', 'expired_at', 'expired timestamp exists');
select ok(
  not exists (
    select 1 from pg_constraint
    where conname = 'vacancies_employer_draft_only_chk'
  ),
  'employer draft-only constraint removed'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'vacancies_publication_state_chk'
      and pg_get_constraintdef(oid) like '%paused%'
      and pg_get_constraintdef(oid) like '%expired%'
  ),
  'publication vocabulary expanded'
);

select has_table('public', 'vacancy_lifecycle_events', 'lifecycle events table exists');
select has_column('public', 'vacancy_lifecycle_events', 'event_type', 'event type exists');
select ok(
  not has_table_privilege('authenticated', 'public.vacancy_lifecycle_events', 'insert'),
  'authenticated cannot append lifecycle events directly'
);

select has_function('public', 'is_vacancy_effectively_public', array['uuid', 'timestamp with time zone'], 'effective public helper exists');
select has_function('public', 'visible_public_vacancy_ids', array['timestamp with time zone'], 'public vacancy ids helper exists');

select * from finish();
rollback;
