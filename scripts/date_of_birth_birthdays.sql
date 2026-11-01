-- Date of birth instead of age, and a daily "Today is <name>'s Birthday" notification.
-- Run once in the Supabase SQL Editor, BEFORE deploying the app version that reads date_of_birth
-- (the app's profile query asks for the column, so it must exist first).
--
--   * profiles.date_of_birth (date). Age is now worked out from it in the app.
--   * Every existing age is cleared: Sevaks fill in their date of birth fresh (Profile & Settings).
--     The age column itself stays for older app versions still in use; nothing new writes to it.
--   * update_sevak_profile_by_admin() also takes p_date_of_birth (the Captain's edit). Same rules as before.
--   * send_birthday_notifications(): every day at 08:00 India time, for each active member whose birthday is
--     today, every other active member of the same group gets "Today is <name>'s Birthday" and the person
--     gets "Happy Birthday, <first name>!". A 29 February birthday is celebrated on 28 February in other years.
--     Each notification row is pushed to phones by the existing webhook, like the Vihar reminders.

-- 1. The column, and a fresh start for age
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles drop constraint if exists profiles_date_of_birth_valid;
alter table public.profiles add constraint profiles_date_of_birth_valid check (date_of_birth >= date '1900-01-01');

update public.profiles set age = null where age is not null;

-- 2. Captain's edit of a Sevak, now with date of birth (same checks as before; the old version is replaced)
drop function if exists public.update_sevak_profile_by_admin(uuid, text, integer, text, text, text, text, text, text, text, text, text, text[]);
create or replace function public.update_sevak_profile_by_admin(
  p_target_user_id uuid, p_mobile text, p_age integer, p_blood_group text, p_emergency_number text, p_address text, p_gender text,
  p_emergency_contact_name text default null, p_occupation text default null, p_occupation_details text default null,
  p_alias text default null, p_vihar_scope text default null, p_seva_preferences text[] default null,
  p_date_of_birth date default null)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_caller_org   uuid;
  v_target_org   uuid;
begin
  select organization_id into v_caller_org
  from public.profiles
  where id = auth.uid() and role in ('admin', 'super_admin');

  if v_caller_org is null then
    raise exception 'Unauthorized: Only admins can update sevak profiles.';
  end if;

  select organization_id into v_target_org
  from public.profiles
  where id = p_target_user_id;

  if v_target_org is null or (v_target_org <> v_caller_org) then
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    ) then
      raise exception 'Unauthorized: Target user not in your organization.';
    end if;
  end if;

  if p_date_of_birth is not null and (p_date_of_birth > (now() at time zone 'Asia/Kolkata')::date or p_date_of_birth < date '1900-01-01') then
    raise exception 'Please enter a valid date of birth.';
  end if;

  update public.profiles set
    mobile           = coalesce(p_mobile,           mobile),
    age              = coalesce(p_age,               age),
    date_of_birth    = coalesce(p_date_of_birth,     date_of_birth),
    blood_group      = coalesce(p_blood_group,       blood_group),
    emergency_number = coalesce(p_emergency_number,  emergency_number),
    address          = coalesce(p_address,            address),
    gender           = coalesce(p_gender,             gender),
    emergency_contact_name = case when p_emergency_contact_name is null then emergency_contact_name else nullif(btrim(p_emergency_contact_name), '') end,
    occupation             = case when p_occupation is null then occupation else nullif(btrim(p_occupation), '') end,
    occupation_details     = case when p_occupation_details is null then occupation_details else nullif(btrim(p_occupation_details), '') end,
    alias                  = case when p_alias is null then alias else nullif(btrim(p_alias), '') end,
    vihar_scope            = case when p_vihar_scope is null then vihar_scope else nullif(btrim(p_vihar_scope), '') end,
    seva_preferences       = case when p_seva_preferences is null then seva_preferences
                                  when cardinality(p_seva_preferences) = 0 then null
                                  else p_seva_preferences end
  where id = p_target_user_id;
end;
$function$;
revoke execute on function public.update_sevak_profile_by_admin(uuid, text, integer, text, text, text, text, text, text, text, text, text, text[], date) from public, anon;
grant execute on function public.update_sevak_profile_by_admin(uuid, text, integer, text, text, text, text, text, text, text, text, text, text[], date) to authenticated;

-- 3. The daily birthday notifications
create or replace function public.send_birthday_notifications(p_org uuid default null)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_count integer := 0;
  v_more integer := 0;
begin
  -- today's birthdays: same day and month; 29 Feb falls on 28 Feb when the year has no 29 Feb
  create temporary table if not exists _birthdays (id uuid, organization_id uuid, full_name text) on commit drop;
  delete from _birthdays;
  insert into _birthdays
  select p.id, p.organization_id, btrim(p.full_name)
    from public.profiles p
   where p.date_of_birth is not null
     and p.role in ('sevak', 'admin')
     and coalesce(p.is_active, true)
     and p.organization_id is not null
     and (p_org is null or p.organization_id = p_org)
     and (
       (extract(month from p.date_of_birth) = extract(month from v_today) and extract(day from p.date_of_birth) = extract(day from v_today))
       or (extract(month from p.date_of_birth) = 2 and extract(day from p.date_of_birth) = 29
           and extract(month from v_today) = 2 and extract(day from v_today) = 28
           and extract(day from (date_trunc('month', v_today) + interval '1 month - 1 day')) = 28)
     );

  -- everyone else in the group: "Today is <name>'s Birthday"
  insert into public.notifications (user_id, organization_id, type, title, message, payload, is_read)
  select m.id, b.organization_id, 'birthday',
         'Today is ' || b.full_name || '''s Birthday',
         'Send your wishes to ' || coalesce(nullif(split_part(b.full_name, ' ', 1), ''), b.full_name) || ' today.',
         jsonb_build_object('kind', 'birthday', 'birthday_user_id', b.id, 'name', b.full_name, 'date', v_today),
         false
    from _birthdays b
    join public.profiles m on m.organization_id = b.organization_id
   where m.id <> b.id
     and m.role in ('sevak', 'admin')
     and coalesce(m.is_active, true)
     and not exists (
       select 1 from public.notifications n
        where n.user_id = m.id and n.type = 'birthday'
          and n.payload->>'birthday_user_id' = b.id::text and n.payload->>'date' = v_today::text
     );
  get diagnostics v_count = row_count;

  -- the person: "Happy Birthday!"
  insert into public.notifications (user_id, organization_id, type, title, message, payload, is_read)
  select b.id, b.organization_id, 'birthday',
         'Happy Birthday, ' || coalesce(nullif(split_part(b.full_name, ' ', 1), ''), b.full_name) || '!',
         'Your Vihar Seva family wishes you a wonderful year ahead.',
         jsonb_build_object('kind', 'birthday', 'birthday_user_id', b.id, 'name', b.full_name, 'date', v_today, 'self', true),
         false
    from _birthdays b
   where not exists (
       select 1 from public.notifications n
        where n.user_id = b.id and n.type = 'birthday'
          and n.payload->>'birthday_user_id' = b.id::text and n.payload->>'date' = v_today::text
     );
  get diagnostics v_more = row_count;

  return v_count + v_more;
end;
$function$;
-- only the scheduler runs it (same as the Vihar reminders)
revoke execute on function public.send_birthday_notifications(uuid) from public, anon, authenticated;

-- 4. Every day at 08:00 India time (02:30 UTC)
select cron.unschedule(jobid) from cron.job where jobname = 'birthday-notifications-daily';
select cron.schedule('birthday-notifications-daily', '30 2 * * *', $$ select public.send_birthday_notifications(); $$);
