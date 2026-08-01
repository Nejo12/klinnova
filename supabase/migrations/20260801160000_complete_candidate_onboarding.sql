-- Slice 1 PR 1.4 — controlled completion gate + atomic invalidation (D-020).
-- Completion RPC is the only path that sets onboarding_completed_at.
-- Triggers clear completion / sync declaration timestamps in the same txn as edits.
-- Identity for completion from auth.uid() only; no candidate UUID / timestamp / payload args.

comment on column public.candidate_profiles.onboarding_completed_at is
  'Current Slice 2 completion gate. Null = incomplete. Set only by complete_candidate_onboarding(); cleared atomically by triggers when essentials become invalid. Re-completion after clear sets a new timestamp.';

comment on column public.candidate_profiles.work_authorisation_declared_at is
  'Non-null only while work_authorisation_declared is true. Set to now() when declaration becomes true and timestamp is null; cleared atomically when declaration is false or null. Completion never overwrites a non-null value.';

-- ---------------------------------------------------------------------------
-- Validators (internal; no EXECUTE for clients)
-- ---------------------------------------------------------------------------

create or replace function public._profile_first_incomplete_group(
  p_candidate_id uuid,
  p_german_comfort text,
  p_work_authorisation_declared boolean,
  p_city text,
  p_travel_radius_minutes integer,
  p_job_categories text[],
  p_available_from date,
  p_employment_types text[],
  p_shift_preferences text[]
)
returns text
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  language_count integer;
  invalid_language_count integer;
  duplicate_language_count integer;
  berlin_today date := (timezone('Europe/Berlin', now()))::date;
begin
  if p_candidate_id is null then
    return 'languages';
  end if;

  select
    count(*)::integer,
    count(*) filter (
      where language_code not in (
        'de','en','ar','tr','uk','ru','pl','fr','es','it','pt','ro','bg','sr',
        'hr','bs','sq','el','fa','ku','ur','hi','bn','vi','zh','other'
      )
      or proficiency not in ('basic', 'conversational', 'proficient', 'native')
    )::integer,
    (
      count(*) - count(distinct language_code)
    )::integer
  into language_count, invalid_language_count, duplicate_language_count
  from public.candidate_languages
  where candidate_id = p_candidate_id;

  if language_count = 0
     or invalid_language_count > 0
     or duplicate_language_count > 0
     or p_german_comfort is null
     or p_german_comfort not in (
       'none', 'basic', 'conversational', 'comfortable'
     )
  then
    return 'languages';
  end if;

  if p_work_authorisation_declared is distinct from true then
    return 'work_authorisation';
  end if;

  if p_city is distinct from 'Berlin'
     or p_travel_radius_minutes is null
     or p_travel_radius_minutes not in (15, 30, 45, 60)
  then
    return 'location';
  end if;

  if coalesce(cardinality(p_job_categories), 0) = 0
     or not (
       p_job_categories <@ array[
         'cleaning','hospitality','logistics','warehousing',
         'food_production','moving','retail'
       ]::text[]
     )
     or not public.text_array_is_unique(p_job_categories)
  then
    return 'categories';
  end if;

  if p_available_from is null
     or p_available_from < berlin_today
  then
    return 'availability';
  end if;

  if coalesce(cardinality(p_employment_types), 0) = 0
     or coalesce(cardinality(p_shift_preferences), 0) = 0
     or not (
       p_employment_types <@ array[
         'full_time','part_time','mini_job','temporary'
       ]::text[]
     )
     or not (
       p_shift_preferences <@ array[
         'morning','daytime','evening','night','weekend','flexible'
       ]::text[]
     )
     or not public.text_array_is_unique(p_employment_types)
     or not public.text_array_is_unique(p_shift_preferences)
  then
    return 'employment';
  end if;

  return null;
end;
$$;

revoke all on function public._profile_first_incomplete_group(
  uuid, text, boolean, text, integer, text[], date, text[], text[]
) from public, anon, authenticated;

create or replace function public._candidate_first_incomplete_group(p_uid uuid)
returns text
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$
declare
  profile public.candidate_profiles%rowtype;
begin
  if p_uid is null then
    return 'languages';
  end if;

  select * into profile
  from public.candidate_profiles
  where id = p_uid;

  if not found then
    return 'languages';
  end if;

  return public._profile_first_incomplete_group(
    profile.id,
    profile.german_comfort,
    profile.work_authorisation_declared,
    profile.city,
    profile.travel_radius_minutes,
    profile.job_categories,
    profile.available_from,
    profile.employment_types,
    profile.shift_preferences
  );
end;
$$;

revoke all on function public._candidate_first_incomplete_group(uuid)
  from public, anon, authenticated;

-- Clears completion when incomplete; never sets completion.
-- Locks the profile row for serialization with complete_candidate_onboarding.
create or replace function public._clear_completion_if_incomplete(p_uid uuid)
returns void
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  profile public.candidate_profiles%rowtype;
  first_group text;
begin
  if p_uid is null then
    return;
  end if;

  select * into profile
  from public.candidate_profiles
  where id = p_uid
  for update;

  if not found then
    return;
  end if;

  first_group := public._profile_first_incomplete_group(
    profile.id,
    profile.german_comfort,
    profile.work_authorisation_declared,
    profile.city,
    profile.travel_radius_minutes,
    profile.job_categories,
    profile.available_from,
    profile.employment_types,
    profile.shift_preferences
  );

  if first_group is not null and profile.onboarding_completed_at is not null then
    update public.candidate_profiles
    set
      onboarding_completed_at = null,
      updated_at = now()
    where id = p_uid;
  end if;
end;
$$;

revoke all on function public._clear_completion_if_incomplete(uuid)
  from public, anon, authenticated;

-- Lock two candidate profiles in stable UUID order, then clear each if incomplete.
-- Avoids deadlock when concurrent language ownership moves touch the same pair.
create or replace function public._clear_completion_for_two_candidates(
  p_a uuid,
  p_b uuid
)
returns void
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  first_id uuid;
  second_id uuid;
begin
  if p_a is null and p_b is null then
    return;
  end if;

  if p_a is null or p_a is not distinct from p_b then
    perform public._clear_completion_if_incomplete(p_b);
    return;
  end if;

  if p_b is null then
    perform public._clear_completion_if_incomplete(p_a);
    return;
  end if;

  if p_a < p_b then
    first_id := p_a;
    second_id := p_b;
  else
    first_id := p_b;
    second_id := p_a;
  end if;

  perform public._clear_completion_if_incomplete(first_id);
  perform public._clear_completion_if_incomplete(second_id);
end;
$$;

revoke all on function public._clear_completion_for_two_candidates(uuid, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profile essential-column trigger (BEFORE UPDATE — same row, same statement)
-- ---------------------------------------------------------------------------

create or replace function public._trg_candidate_profiles_essentials()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  first_group text;
begin
  -- work_authorisation_declared_at contract
  if new.work_authorisation_declared is distinct from true then
    new.work_authorisation_declared_at := null;
  elsif new.work_authorisation_declared_at is null then
    new.work_authorisation_declared_at := now();
  end if;

  -- Never auto-complete. Clear gate when resulting essentials (incl. languages) fail.
  first_group := public._profile_first_incomplete_group(
    new.id,
    new.german_comfort,
    new.work_authorisation_declared,
    new.city,
    new.travel_radius_minutes,
    new.job_categories,
    new.available_from,
    new.employment_types,
    new.shift_preferences
  );

  if first_group is not null then
    new.onboarding_completed_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public._trg_candidate_profiles_essentials()
  from public, anon, authenticated;

drop trigger if exists trg_candidate_profiles_essentials
  on public.candidate_profiles;

create trigger trg_candidate_profiles_essentials
before update of
  german_comfort,
  work_authorisation_declared,
  city,
  travel_radius_minutes,
  job_categories,
  available_from,
  employment_types,
  shift_preferences
on public.candidate_profiles
for each row
execute function public._trg_candidate_profiles_essentials();

-- ---------------------------------------------------------------------------
-- Language mutation triggers (lock profile; clear completion; never set it)
-- ---------------------------------------------------------------------------

create or replace function public._trg_candidate_languages_reconcile()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    perform public._clear_completion_if_incomplete(new.candidate_id);
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public._clear_completion_if_incomplete(old.candidate_id);
    return old;
  end if;

  -- UPDATE: same owner → one lock; ownership move → lock both in UUID order.
  if old.candidate_id is not distinct from new.candidate_id then
    perform public._clear_completion_if_incomplete(new.candidate_id);
  else
    perform public._clear_completion_for_two_candidates(
      old.candidate_id,
      new.candidate_id
    );
  end if;
  return new;
end;
$$;

revoke all on function public._trg_candidate_languages_reconcile()
  from public, anon, authenticated;

drop trigger if exists trg_candidate_languages_reconcile
  on public.candidate_languages;

create trigger trg_candidate_languages_reconcile
after insert or update of candidate_id, language_code, proficiency or delete
on public.candidate_languages
for each row
execute function public._trg_candidate_languages_reconcile();

-- ---------------------------------------------------------------------------
-- Controlled completion (authenticated EXECUTE only)
-- ---------------------------------------------------------------------------

create or replace function public.complete_candidate_onboarding()
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  profile public.candidate_profiles%rowtype;
  first_group text;
  prior_completed_at timestamptz;
  prior_declared_at timestamptz;
begin
  if uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  select * into profile
  from public.candidate_profiles
  where id = uid
  for update;

  if not found then
    return jsonb_build_object('status', 'missing_profile');
  end if;

  prior_completed_at := profile.onboarding_completed_at;
  prior_declared_at := profile.work_authorisation_declared_at;

  first_group := public._profile_first_incomplete_group(
    profile.id,
    profile.german_comfort,
    profile.work_authorisation_declared,
    profile.city,
    profile.travel_radius_minutes,
    profile.job_categories,
    profile.available_from,
    profile.employment_types,
    profile.shift_preferences
  );

  if first_group is not null then
    if profile.onboarding_completed_at is not null then
      update public.candidate_profiles
      set
        onboarding_completed_at = null,
        updated_at = now()
      where id = uid;
    end if;

    return jsonb_build_object(
      'status', 'incomplete',
      'first_incomplete_group', first_group
    );
  end if;

  -- Already complete: preserve timestamps; repair declaration stamp only if null.
  if prior_completed_at is not null then
    if prior_declared_at is null
       and profile.work_authorisation_declared is true
    then
      update public.candidate_profiles
      set
        work_authorisation_declared_at = now(),
        updated_at = now()
      where id = uid;
    end if;

    return jsonb_build_object(
      'status', 'completed',
      'already_complete', true
    );
  end if;

  -- First completion (or re-completion after clear): new completion timestamp.
  -- Declaration timestamp set only when null; never overwrite an existing one.
  update public.candidate_profiles
  set
    work_authorisation_declared_at = coalesce(
      work_authorisation_declared_at,
      case
        when work_authorisation_declared is true then now()
        else null
      end
    ),
    onboarding_completed_at = now(),
    updated_at = now()
  where id = uid;

  return jsonb_build_object(
    'status', 'completed',
    'already_complete', false
  );
end;
$$;

comment on function public.complete_candidate_onboarding() is
  'PR 1.4 controlled completion: locks candidate_profiles for auth.uid(), validates persisted essentials, sets onboarding_completed_at. Sets work_authorisation_declared_at only when null and declaration is true. Never accepts candidate UUID / timestamps / payload.';

revoke all on function public.complete_candidate_onboarding() from public, anon;
grant execute on function public.complete_candidate_onboarding() to authenticated;

-- Remove application-facing reconcile RPC from earlier PR 1.4 draft (triggers own invalidation).
drop function if exists public.reconcile_onboarding_completion();
