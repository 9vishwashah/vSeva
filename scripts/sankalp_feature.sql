-- Sankalp (yearly Vihar target) per Vihar Year — purely additive, touches no existing data.
--
--   sevak_sankalps : each Sevak's personal target for a Vihar Year (VY).
--   org_sankalps   : the Group's target for a VY, plus the Captain's switch for whether Sevaks may
--                    still edit their own Sankalp (default: they may).
--
-- vihar_year is the VY's START year (VY 2026-27 -> 2026), matching services/viharYear.ts.
-- Writes go only through the three functions below (they check who is calling); direct writes are
-- blocked by RLS (no insert/update/delete policies).
--
-- Old profiles.yearly_goal is left in place but no longer used by the app: everyone is asked to set
-- a fresh Sankalp for the new Vihar Year.
--
-- Rollback:  drop function public.set_my_sankalp(int,int), public.set_org_sankalp(int,int),
--            public.set_sevaks_can_edit(int,boolean);  drop table public.sevak_sankalps, public.org_sankalps;

begin;

create table if not exists public.sevak_sankalps (
  user_id uuid not null references auth.users(id) on delete cascade,
  vihar_year integer not null check (vihar_year between 2020 and 2100),
  target integer not null check (target between 1 and 365),
  updated_at timestamptz not null default now(),
  primary key (user_id, vihar_year)
);

create table if not exists public.org_sankalps (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vihar_year integer not null check (vihar_year between 2020 and 2100),
  target integer check (target between 1 and 100000),
  sevaks_can_edit boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (organization_id, vihar_year)
);

alter table public.sevak_sankalps enable row level security;
alter table public.org_sankalps enable row level security;

drop policy if exists sevak_sankalps_select on public.sevak_sankalps;
create policy sevak_sankalps_select on public.sevak_sankalps
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      public.is_org_admin()
      and exists (select 1 from public.profiles p where p.id = sevak_sankalps.user_id and p.organization_id = public.get_my_org_id())
    )
  );

drop policy if exists org_sankalps_select on public.org_sankalps;
create policy org_sankalps_select on public.org_sankalps
  for select to authenticated
  using (organization_id = public.get_my_org_id());

-- A Sevak sets / edits their own Sankalp. Editing is refused once the Captain has locked it for that
-- Vihar Year — but the FIRST value can always be set, so nobody is stuck on the "set your Sankalp" prompt.
create or replace function public.set_my_sankalp(p_vihar_year integer, p_target integer)
 returns public.sevak_sankalps
 language plpgsql
 security definer
 set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_org uuid;
  v_can_edit boolean;
  v_row public.sevak_sankalps;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if p_target is null or p_target < 1 or p_target > 365 then raise exception 'Sankalp must be between 1 and 365 Vihars'; end if;

  select role, organization_id into v_role, v_org from public.profiles where id = v_uid;
  if v_role is distinct from 'sevak' then raise exception 'Only Sevaks set a personal Sankalp (Captains set the Group Sankalp)'; end if;

  select coalesce(sevaks_can_edit, true) into v_can_edit
  from public.org_sankalps where organization_id = v_org and vihar_year = p_vihar_year;
  v_can_edit := coalesce(v_can_edit, true);

  if not v_can_edit and exists (select 1 from public.sevak_sankalps where user_id = v_uid and vihar_year = p_vihar_year) then
    raise exception 'Your Captain has locked Sankalp changes for this Vihar Year';
  end if;

  insert into public.sevak_sankalps (user_id, vihar_year, target)
  values (v_uid, p_vihar_year, p_target)
  on conflict (user_id, vihar_year) do update set target = excluded.target, updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

-- The Captain sets / edits the Group Sankalp (total Vihars the group targets) for a Vihar Year.
create or replace function public.set_org_sankalp(p_vihar_year integer, p_target integer)
 returns public.org_sankalps
 language plpgsql
 security definer
 set search_path to 'public'
as $$
declare
  v_org uuid := public.get_my_org_id();
  v_row public.org_sankalps;
begin
  if auth.uid() is null or not public.is_org_admin() then raise exception 'Only a Captain can set the Group Sankalp'; end if;
  if v_org is null then raise exception 'No organization found for the current user'; end if;
  if p_vihar_year is null or p_vihar_year < 2020 or p_vihar_year > 2100 then raise exception 'Invalid Vihar Year'; end if;
  if p_target is null or p_target < 1 or p_target > 100000 then raise exception 'Group Sankalp must be at least 1 Vihar'; end if;

  insert into public.org_sankalps (organization_id, vihar_year, target)
  values (v_org, p_vihar_year, p_target)
  on conflict (organization_id, vihar_year) do update set target = excluded.target, updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

-- The Captain's switch: may Sevaks still edit their own Sankalp for this Vihar Year? (default: yes)
create or replace function public.set_sevaks_can_edit(p_vihar_year integer, p_can_edit boolean)
 returns public.org_sankalps
 language plpgsql
 security definer
 set search_path to 'public'
as $$
declare
  v_org uuid := public.get_my_org_id();
  v_row public.org_sankalps;
begin
  if auth.uid() is null or not public.is_org_admin() then raise exception 'Only a Captain can change this setting'; end if;
  if v_org is null then raise exception 'No organization found for the current user'; end if;
  if p_vihar_year is null or p_vihar_year < 2020 or p_vihar_year > 2100 then raise exception 'Invalid Vihar Year'; end if;

  insert into public.org_sankalps (organization_id, vihar_year, sevaks_can_edit)
  values (v_org, p_vihar_year, coalesce(p_can_edit, true))
  on conflict (organization_id, vihar_year) do update set sevaks_can_edit = coalesce(p_can_edit, true), updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.set_my_sankalp(integer, integer) from public, anon;
revoke all on function public.set_org_sankalp(integer, integer) from public, anon;
revoke all on function public.set_sevaks_can_edit(integer, boolean) from public, anon;
grant execute on function public.set_my_sankalp(integer, integer) to authenticated;
grant execute on function public.set_org_sankalp(integer, integer) to authenticated;
grant execute on function public.set_sevaks_can_edit(integer, boolean) to authenticated;

commit;
