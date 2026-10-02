-- #280: Email overrides for existing N2/N3 events only. No backfill.
create table public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('candidate_application_updates', 'employer_new_applicants')),
  email_enabled boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, category)
);
alter table public.notification_preferences enable row level security;

create function public._current_notification_category_available(p_category text)
returns boolean language sql stable security definer
set search_path to pg_catalog, public
as $$
  select case p_category
    when 'candidate_application_updates' then exists (
      select 1 from public.candidate_profiles cp where cp.id = auth.uid()
        and cp.onboarding_completed_at is not null and cp.account_deleted_at is null)
    when 'employer_new_applicants' then exists (
      select 1 from public.employer_profiles ep where ep.id = auth.uid()
        and ep.onboarding_completed_at is not null
        and not public._is_employer_deleted(ep.id) and not public._is_employer_suspended(ep.id))
    else false end;
$$;
revoke all on function public._current_notification_category_available(text) from public, anon;
grant execute on function public._current_notification_category_available(text) to authenticated;

create policy notification_preferences_select_own on public.notification_preferences
for select to authenticated
using (user_id = (select auth.uid()) and public._current_notification_category_available(category));
revoke all on public.notification_preferences from public, anon, authenticated;
grant select on public.notification_preferences to authenticated, service_role;

create function public.get_current_notification_email_preference(p_category text)
returns jsonb language plpgsql stable security definer
set search_path to pg_catalog, public
as $$
begin
  if not public._current_notification_category_available(p_category) then
    return jsonb_build_object('result', 'unavailable');
  end if;
  return jsonb_build_object('result', 'ready', 'email_enabled', coalesce((
    select email_enabled from public.notification_preferences
    where user_id = auth.uid() and category = p_category), true));
end;
$$;
create function public.set_current_notification_email_preference(p_category text, p_email_enabled boolean)
returns jsonb language plpgsql security definer
set search_path to pg_catalog, public
as $$
begin
  if p_email_enabled is null or not public._current_notification_category_available(p_category) then
    return jsonb_build_object('result', 'unavailable');
  end if;
  insert into public.notification_preferences(user_id, category, email_enabled)
  values (auth.uid(), p_category, p_email_enabled)
  on conflict (user_id, category) do update
    set email_enabled = excluded.email_enabled, updated_at = clock_timestamp();
  return jsonb_build_object('result', 'ok', 'email_enabled', p_email_enabled);
end;
$$;
revoke all on function public.get_current_notification_email_preference(text) from public, anon;
revoke all on function public.set_current_notification_email_preference(text, boolean) from public, anon;
grant execute on function public.get_current_notification_email_preference(text) to authenticated;
grant execute on function public.set_current_notification_email_preference(text, boolean) to authenticated;
