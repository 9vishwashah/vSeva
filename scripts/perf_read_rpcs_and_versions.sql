-- Performance plan, Phase 2 + 3 (docs/performance-plan.md). Additive only: new functions, one new table, triggers.
-- Nothing existing is changed or removed; the Netlify Functions stay deployed as a fallback.
--
-- 1. Read functions that replace the read-only Netlify Functions (get-org-sevak-contacts, get-sevak-names,
--    get-sevak-avatars, get-org-roster, get-dashboard-stats). Same answer, same rule:
--    the caller's own profile must belong to the group asked for (public.get_my_org_id(), as the existing
--    get_org_roster_for_stats / get_org_entries_for_ranking already do). They run inside Supabase, so the
--    app no longer waits on Netlify -> Supabase round trips and Netlify bills no compute for them.
-- 2. org_data_versions: one row per group with the time each kind of data last changed. The app asks for this
--    tiny row and only re-downloads the kinds that changed since it last looked, so data stays on the device.

-- ---------------------------------------------------------------- membership guard
create or replace function public.assert_my_org(p_org uuid)
returns void
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if p_org is null or p_org is distinct from public.get_my_org_id() then
    raise exception 'Not allowed for this group.' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------- read functions
-- { "<profile id>": { full_name, mobile, avatar_url, role, is_active } }  (was get-org-sevak-contacts)
create or replace function public.get_org_sevak_contacts(p_org uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_my_org(p_org);
  return coalesce((
    select jsonb_object_agg(p.id::text, jsonb_build_object(
      'full_name', p.full_name,
      'mobile', coalesce(p.mobile, ''),
      'avatar_url', nullif(p.avatar_url, ''),
      'role', p.role,
      'is_active', coalesce(p.is_active, true)))
    from public.profiles p
    where p.organization_id = p_org
  ), '{}'::jsonb);
end;
$$;

-- { "<username>": full_name, "<username before @>": full_name }  (was get-sevak-names)
create or replace function public.get_sevak_names(p_org uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_my_org(p_org);
  return coalesce((
    select jsonb_object_agg(k, v) from (
      select p.username as k, p.full_name as v
        from public.profiles p where p.organization_id = p_org and coalesce(p.username, '') <> ''
      union all
      select split_part(p.username, '@', 1), p.full_name
        from public.profiles p where p.organization_id = p_org and split_part(coalesce(p.username, ''), '@', 1) <> ''
    ) s
  ), '{}'::jsonb);
end;
$$;

-- { "<username>": avatar_url, "<username before @>": avatar_url }  (was get-sevak-avatars)
create or replace function public.get_sevak_avatars(p_org uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_my_org(p_org);
  return coalesce((
    select jsonb_object_agg(k, v) from (
      select p.username as k, p.avatar_url as v
        from public.profiles p
        where p.organization_id = p_org and coalesce(p.username, '') <> '' and coalesce(p.avatar_url, '') <> ''
      union all
      select split_part(p.username, '@', 1), p.avatar_url
        from public.profiles p
        where p.organization_id = p_org and split_part(coalesce(p.username, ''), '@', 1) <> '' and coalesce(p.avatar_url, '') <> ''
    ) s
  ), '{}'::jsonb);
end;
$$;

-- [ { username, full_name, gender, avatar_url, role } ]  (was get-org-roster)
create or replace function public.get_org_roster(p_org uuid, p_include_inactive boolean default false)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_my_org(p_org);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'username', p.username, 'full_name', p.full_name, 'gender', p.gender,
      'avatar_url', p.avatar_url, 'role', p.role))
    from public.profiles p
    where p.organization_id = p_org and (p_include_inactive or p.is_active = true)
  ), '[]'::jsonb);
end;
$$;

-- { totalMale, totalFemale, activeMale, activeFemale, activeUsernames }  (was get-dashboard-stats)
-- "active" = in an approved Vihar in the last 30 days.
create or replace function public.get_dashboard_stats(p_org uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v jsonb;
begin
  perform public.assert_my_org(p_org);
  with active as (
    select distinct u
    from public.vihar_entries e, unnest(e.sevaks) as u
    where e.organization_id = p_org and e.status = 'approved' and e.vihar_date >= (current_date - 30)
  ), s as (
    select p.username,
           (lower(coalesce(p.gender, '')) = 'female' or p.gender in ('સ્ત્રી', 'mahila')) as fe
    from public.profiles p
    where p.organization_id = p_org and p.role = 'sevak' and p.is_active = true
  )
  select jsonb_build_object(
    'totalMale',   count(*) filter (where not s.fe),
    'totalFemale', count(*) filter (where s.fe),
    'activeMale',   count(*) filter (where not s.fe and s.username in (select u from active)),
    'activeFemale', count(*) filter (where s.fe and s.username in (select u from active)),
    'activeUsernames', coalesce((select jsonb_agg(u) from active), '[]'::jsonb))
  into v
  from s;
  return v;
end;
$$;

-- ---------------------------------------------------------------- change versions
create table if not exists public.org_data_versions (
  organization_id uuid primary key,
  members   timestamptz not null default now(),
  entries   timestamptz not null default now(),
  routes    timestamptz not null default now(),
  contacts  timestamptz not null default now(),
  settings  timestamptz not null default now(),
  alerts    timestamptz not null default now(),
  incidents timestamptz not null default now()
);
-- No policies: nobody reads or writes it directly; only the functions below touch it.
alter table public.org_data_versions enable row level security;

create or replace function public.bump_org_version()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_kind text := tg_argv[0];
  v_org uuid;
  v_old_org uuid;
begin
  if tg_table_name = 'organizations' then
    if tg_op = 'DELETE' then
      delete from public.org_data_versions where organization_id = old.id;
      return null;
    end if;
    v_org := new.id;
  elsif tg_op = 'DELETE' then
    v_org := old.organization_id;
  else
    v_org := new.organization_id;
  end if;

  if tg_table_name = 'profiles' and tg_op = 'UPDATE' then
    -- signing in only stamps last_login_at: not a change anyone else needs to re-download
    if (to_jsonb(new) - 'last_login_at') = (to_jsonb(old) - 'last_login_at') then
      return null;
    end if;
    v_old_org := old.organization_id;
    if v_old_org is not null and v_old_org is distinct from v_org then
      execute format('insert into public.org_data_versions (organization_id) values ($1)
                      on conflict (organization_id) do update set %I = now()', v_kind) using v_old_org;
    end if;
  end if;

  if v_org is null then
    return null;
  end if;
  execute format('insert into public.org_data_versions (organization_id) values ($1)
                  on conflict (organization_id) do update set %I = now()', v_kind) using v_org;
  return null;
exception when others then
  -- change tracking must never block a real save; at worst devices refresh on their timer instead
  return null;
end;
$$;

drop trigger if exists trg_version_members on public.profiles;
create trigger trg_version_members after insert or update or delete on public.profiles
  for each row execute function public.bump_org_version('members');
drop trigger if exists trg_version_entries on public.vihar_entries;
create trigger trg_version_entries after insert or update or delete on public.vihar_entries
  for each row execute function public.bump_org_version('entries');
drop trigger if exists trg_version_routes on public.area_routes;
create trigger trg_version_routes after insert or update or delete on public.area_routes
  for each row execute function public.bump_org_version('routes');
drop trigger if exists trg_version_aliases on public.place_aliases;
create trigger trg_version_aliases after insert or update or delete on public.place_aliases
  for each row execute function public.bump_org_version('routes');
drop trigger if exists trg_version_contacts on public.contact_numbers;
create trigger trg_version_contacts after insert or update or delete on public.contact_numbers
  for each row execute function public.bump_org_version('contacts');
drop trigger if exists trg_version_sankalps on public.org_sankalps;
create trigger trg_version_sankalps after insert or update or delete on public.org_sankalps
  for each row execute function public.bump_org_version('settings');
drop trigger if exists trg_version_reminders on public.org_reminder_settings;
create trigger trg_version_reminders after insert or update or delete on public.org_reminder_settings
  for each row execute function public.bump_org_version('settings');
drop trigger if exists trg_version_org on public.organizations;
create trigger trg_version_org after update or delete on public.organizations
  for each row execute function public.bump_org_version('settings');
drop trigger if exists trg_version_alerts on public.upcoming_vihars;
create trigger trg_version_alerts after insert or update or delete on public.upcoming_vihars
  for each row execute function public.bump_org_version('alerts');
drop trigger if exists trg_version_incidents on public.incident_reports;
create trigger trg_version_incidents after insert or update or delete on public.incident_reports
  for each row execute function public.bump_org_version('incidents');

-- { members, entries, routes, contacts, settings, alerts, incidents } as epoch milliseconds
create or replace function public.get_org_versions(p_org uuid)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  r public.org_data_versions;
begin
  perform public.assert_my_org(p_org);
  select * into r from public.org_data_versions where organization_id = p_org;
  if not found then
    insert into public.org_data_versions (organization_id) values (p_org)
      on conflict (organization_id) do nothing;
    select * into r from public.org_data_versions where organization_id = p_org;
  end if;
  return jsonb_build_object(
    'members',   floor(extract(epoch from r.members) * 1000),
    'entries',   floor(extract(epoch from r.entries) * 1000),
    'routes',    floor(extract(epoch from r.routes) * 1000),
    'contacts',  floor(extract(epoch from r.contacts) * 1000),
    'settings',  floor(extract(epoch from r.settings) * 1000),
    'alerts',    floor(extract(epoch from r.alerts) * 1000),
    'incidents', floor(extract(epoch from r.incidents) * 1000));
end;
$$;

-- ---------------------------------------------------------------- access
revoke all on function public.assert_my_org(uuid) from public, anon;
revoke all on function public.get_org_sevak_contacts(uuid) from public, anon;
revoke all on function public.get_sevak_names(uuid) from public, anon;
revoke all on function public.get_sevak_avatars(uuid) from public, anon;
revoke all on function public.get_org_roster(uuid, boolean) from public, anon;
revoke all on function public.get_dashboard_stats(uuid) from public, anon;
revoke all on function public.get_org_versions(uuid) from public, anon;
revoke all on function public.bump_org_version() from public, anon, authenticated;

grant execute on function public.get_org_sevak_contacts(uuid) to authenticated;
grant execute on function public.get_sevak_names(uuid) to authenticated;
grant execute on function public.get_sevak_avatars(uuid) to authenticated;
grant execute on function public.get_org_roster(uuid, boolean) to authenticated;
grant execute on function public.get_dashboard_stats(uuid) to authenticated;
grant execute on function public.get_org_versions(uuid) to authenticated;
grant execute on function public.assert_my_org(uuid) to authenticated;
