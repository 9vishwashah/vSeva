-- Vihar reminders, sent every day by the database itself (no one needs to open the app).
-- Builds on scripts/reminder_settings.sql. Additive apart from replacing set_reminder_settings() with a version
-- that also takes the picture choice (the old 3-argument version is dropped; the app is updated to match).
--
-- Rules (shown to the Captain under "How reminders work" in ReminderSettingsCard.tsx; keep the two in step):
--   * Only during the Vihar Year (14 Oct – 13 Jul, India time). In Chaturmas nothing is sent and unread
--     reminders are cleared.
--   * Every active Sevak of a group with reminders on, including Sevaks who have never done a Vihar.
--   * Quiet days are counted from the Sevak's last approved Vihar; for someone with no Vihar yet, from the day
--     they were added. Never from before this Vihar Year's 14 October.
--   * Each reminder day (e.g. 5, 7, 15) is sent once per quiet spell: after a new approved Vihar, the count
--     starts again.
--   * Runs daily at 09:00 India time; each new notification row is pushed to phones by the existing webhook.

-- 1. The picture the Captain picked for the reminder (services/reminderBanners.json)
alter table public.org_reminder_settings
  add column if not exists banner text not null default 'walks-on';
alter table public.org_reminder_settings
  drop constraint if exists org_reminder_banner_valid;
alter table public.org_reminder_settings
  add constraint org_reminder_banner_valid check (banner ~ '^[a-z0-9-]{1,30}$');

-- 2. Captain's save, now with the picture
drop function if exists public.set_reminder_settings(boolean, integer[], text);
create or replace function public.set_reminder_settings(p_enabled boolean, p_days integer[], p_message text, p_banner text default null)
returns public.org_reminder_settings
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid := public.get_my_org_id();
  v_days integer[];
  v_message text := btrim(coalesce(p_message, ''));
  v_banner text := nullif(btrim(coalesce(p_banner, '')), '');
  v_row public.org_reminder_settings;
begin
  if auth.uid() is null or not public.is_org_admin() then raise exception 'Only a Captain can change reminder settings'; end if;
  if v_org is null then raise exception 'No organization found for the current user'; end if;
  select coalesce(array_agg(d order by d), '{}') into v_days from (select distinct unnest(p_days) as d) s where d is not null;
  if cardinality(v_days) < 1 or cardinality(v_days) > 3 then raise exception 'Choose 1 to 3 reminder days'; end if;
  if not (1 <= all(v_days) and 60 >= all(v_days)) then raise exception 'Reminder days must be between 1 and 60'; end if;
  if char_length(v_message) < 1 or char_length(v_message) > 80 then raise exception 'The message must be 1 to 80 characters'; end if;
  if v_banner is not null and v_banner !~ '^[a-z0-9-]{1,30}$' then raise exception 'Unknown reminder picture'; end if;

  insert into public.org_reminder_settings (organization_id, enabled, days, message, banner)
  values (v_org, coalesce(p_enabled, true), v_days, v_message, coalesce(v_banner, 'walks-on'))
  on conflict (organization_id) do update
    set enabled = excluded.enabled, days = excluded.days, message = excluded.message,
        banner = coalesce(v_banner, public.org_reminder_settings.banner), updated_at = now()
  returning * into v_row;
  return v_row;
end;
$function$;
revoke all on function public.set_reminder_settings(boolean, integer[], text, text) from public, anon;
grant execute on function public.set_reminder_settings(boolean, integer[], text, text) to authenticated;

-- 3. The daily run. p_org limits it to one group (handy for testing); returns how many reminders were created.
create or replace function public.send_inactivity_reminders(p_org uuid default null)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_m int := extract(month from v_today);
  v_d int := extract(day from v_today);
  v_y int := extract(year from v_today);
  v_vy_start date;
  v_count integer := 0;
begin
  if v_m > 10 or (v_m = 10 and v_d >= 14) then
    v_vy_start := make_date(v_y, 10, 14);
  elsif v_m < 7 or (v_m = 7 and v_d <= 13) then
    v_vy_start := make_date(v_y - 1, 10, 14);
  else
    -- Chaturmas: no Vihar, so no reminders; clear any left unread
    update public.notifications set is_read = true
     where type = 'inactivity' and is_read = false and (p_org is null or organization_id = p_org);
    return 0;
  end if;

  with settings as (
    select o.id as org_id,
           coalesce(r.days, '{5,7,15}'::int[]) as days,
           coalesce(nullif(btrim(r.message), ''), 'Kindly Join In Seva') as message,
           coalesce(r.banner, 'walks-on') as banner
      from public.organizations o
      left join public.org_reminder_settings r on r.organization_id = o.id
     where coalesce(r.enabled, true) and (p_org is null or o.id = p_org)
  ),
  sevaks as (
    select p.id, p.organization_id, p.full_name, s.days, s.message, s.banner,
           (p.created_at at time zone 'Asia/Kolkata')::date as joined,
           (select max(e.vihar_date) from public.vihar_entries e
             where e.organization_id = p.organization_id and e.status = 'approved' and p.username = any(e.sevaks)) as last_vihar
      from public.profiles p
      join settings s on s.org_id = p.organization_id
     where p.role = 'sevak' and coalesce(p.is_active, true)
  ),
  due as (
    select sv.*, x.since, (v_today - x.since) as days_since,
           (select max(t) from unnest(sv.days) t where (v_today - x.since) >= t) as tier
      from sevaks sv
      cross join lateral (select greatest(coalesce(sv.last_vihar, sv.joined), v_vy_start) as since) x
  )
  insert into public.notifications (user_id, organization_id, type, title, message, payload, is_read)
  select d.id, d.organization_id, 'inactivity',
         coalesce(nullif(split_part(btrim(coalesce(d.full_name, '')), ' ', 1), '') || ', ', '') || 'No Vihar Since ' || d.days_since || ' Days',
         d.message,
         jsonb_build_object('tier', d.tier, 'days_since', d.days_since, 'since', d.since, 'first_vihar', d.last_vihar is null, 'banner', d.banner),
         false
    from due d
   where d.tier is not null
     -- once per reminder day per quiet spell
     and not exists (
       select 1 from public.notifications n
        where n.user_id = d.id and n.type = 'inactivity'
          and (n.payload->>'tier')::int = d.tier
          and n.created_at >= d.since
     );
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;
revoke all on function public.send_inactivity_reminders(uuid) from public, anon, authenticated;

-- 4. Every day at 09:00 India time (03:30 UTC)
select cron.unschedule(jobid) from cron.job where jobname = 'vihar-reminders-daily';
select cron.schedule('vihar-reminders-daily', '30 3 * * *', $$ select public.send_inactivity_reminders(); $$);
