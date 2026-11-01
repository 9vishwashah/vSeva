-- Inactivity reminders ("<Name>, No Vihar Since N Days"), configurable by each group's Captain:
--   enabled  – reminders on/off for the whole group
--   days     – the gaps (in days) at which a reminder is sent, up to 3, e.g. {5,7,15}
--   message  – the line under the title, e.g. "Kindly Join In Seva"
-- A group without a row uses the defaults below (the behaviour before this table existed).
-- Read by netlify/functions/check-inactivity.js (service role) and the app; written only through
-- set_reminder_settings(), which checks the caller is the group's Captain. Additive: nothing existing changes.

create table if not exists public.org_reminder_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default true,
  days integer[] not null default '{5,7,15}',
  message text not null default 'Kindly Join In Seva',
  updated_at timestamptz not null default now(),
  constraint org_reminder_days_valid check (cardinality(days) between 1 and 3 and 1 <= all(days) and 60 >= all(days)),
  constraint org_reminder_message_len check (char_length(message) between 1 and 80)
);

alter table public.org_reminder_settings enable row level security;

create policy "Reminder settings: org read" on public.org_reminder_settings
  for select to authenticated using (organization_id = get_my_org_id());

create or replace function public.set_reminder_settings(p_enabled boolean, p_days integer[], p_message text)
returns public.org_reminder_settings
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid := public.get_my_org_id();
  v_days integer[];
  v_message text := btrim(coalesce(p_message, ''));
  v_row public.org_reminder_settings;
begin
  if auth.uid() is null or not public.is_org_admin() then raise exception 'Only a Captain can change reminder settings'; end if;
  if v_org is null then raise exception 'No organization found for the current user'; end if;
  -- distinct, ascending
  select coalesce(array_agg(d order by d), '{}') into v_days from (select distinct unnest(p_days) as d) s where d is not null;
  if cardinality(v_days) < 1 or cardinality(v_days) > 3 then raise exception 'Choose 1 to 3 reminder days'; end if;
  if not (1 <= all(v_days) and 60 >= all(v_days)) then raise exception 'Reminder days must be between 1 and 60'; end if;
  if char_length(v_message) < 1 or char_length(v_message) > 80 then raise exception 'The message must be 1 to 80 characters'; end if;

  insert into public.org_reminder_settings (organization_id, enabled, days, message)
  values (v_org, coalesce(p_enabled, true), v_days, v_message)
  on conflict (organization_id) do update
    set enabled = excluded.enabled, days = excluded.days, message = excluded.message, updated_at = now()
  returning * into v_row;
  return v_row;
end;
$function$;

revoke all on function public.set_reminder_settings(boolean, integer[], text) from public, anon;
grant execute on function public.set_reminder_settings(boolean, integer[], text) to authenticated;
